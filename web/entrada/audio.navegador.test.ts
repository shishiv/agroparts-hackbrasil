import { afterEach, describe, expect, it, vi } from "vitest";
import { PECA_IDENTIFICADA, type PecaIdentificada } from "../../src/contrato";
import type { Buscar } from "../../src/entrada/audio";
import { montarAudio, type AmbienteDoAudio } from "./audio";
import { entradasRegistradas } from "./index";

const montados: HTMLElement[] = [];
const fluxos: MediaStream[] = [];

afterEach(() => {
  for (const destino of montados.splice(0)) destino.remove();
  for (const fluxo of fluxos.splice(0)) for (const faixa of fluxo.getTracks()) faixa.stop();
});

/** Um microfone de mentira com um tom: o MediaRecorder do Chromium grava webm de verdade, e sem gesto do usuário o contexto fica suspenso e grava só o cabeçalho. */
async function microfoneDeTeste(): Promise<MediaStream> {
  const contexto = new AudioContext();
  void contexto.resume();
  const oscilador = contexto.createOscillator();
  const saida = contexto.createMediaStreamDestination();
  oscilador.connect(saida);
  oscilador.start();
  fluxos.push(saida.stream);
  return saida.stream;
}

interface Enviado {
  tipo: string | null;
  bytes: Uint8Array;
}

const OUVIDO = { texto: "Rolamento 6304, ZZ, C3.", modelo: "whisper-large-v3-turbo", ms: 640 };

function servidor(respostas: readonly Response[] = [Response.json(OUVIDO)]) {
  const enviados: Enviado[] = [];
  const buscar: Buscar = async (_endereco, requisicao) => {
    enviados.push({
      tipo: new Headers(requisicao.headers).get("content-type"),
      bytes: new Uint8Array(await new Response(requisicao.body).arrayBuffer()),
    });
    return respostas[Math.min(enviados.length, respostas.length) - 1]?.clone() ?? Response.json(OUVIDO);
  };
  return { buscar, enviados };
}

function abrir(ambiente: Partial<AmbienteDoAudio> & { buscar: Buscar }) {
  const destino = document.createElement("main");
  document.body.append(destino);
  montados.push(destino);
  const pecas: PecaIdentificada[] = [];
  const ouvir = (evento: Event) => {
    if (evento instanceof CustomEvent) pecas.push(evento.detail);
  };
  window.addEventListener(PECA_IDENTIFICADA, ouvir, { capture: true });
  montarAudio(destino, { microfone: microfoneDeTeste, gravacaoMaximaMs: 30_000, ...ambiente });
  return {
    destino,
    pecas,
    fechar: () => window.removeEventListener(PECA_IDENTIFICADA, ouvir, { capture: true }),
  };
}

const botao = (destino: HTMLElement, nome: string): HTMLButtonElement => {
  const achado = [...destino.querySelectorAll("button")].find((b) => b.textContent === nome);
  if (!achado) throw new Error(`não há botão "${nome}": ${destino.textContent}`);
  return achado;
};

const campo = (destino: HTMLElement): HTMLInputElement => {
  const achado = destino.querySelector("input");
  if (!achado) throw new Error(`não há campo: ${destino.textContent}`);
  return achado;
};

const ate = <T>(verificar: () => T): Promise<T> => vi.waitFor(verificar, { timeout: 5000 });

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

async function gravarEPararDepoisDe(destino: HTMLElement, ms: number): Promise<void> {
  botao(destino, "Achar peça por voz").click();
  await ate(() => botao(destino, "Parar"));
  await esperar(ms);
  botao(destino, "Parar").click();
}

describe("o botão de áudio", () => {
  it("grava webm de verdade, mostra o texto ouvido num campo editável e só então identifica a peça", async () => {
    const { buscar, enviados } = servidor();
    const { destino, pecas, fechar } = abrir({ buscar });

    await gravarEPararDepoisDe(destino, 400);
    await ate(() => campo(destino));

    expect(enviados).toHaveLength(1);
    expect(enviados[0]?.tipo).toMatch(/^audio\/webm/);
    expect([...(enviados[0]?.bytes.slice(0, 4) ?? [])]).toEqual([0x1a, 0x45, 0xdf, 0xa3]);
    expect(campo(destino).value).toBe("Rolamento 6304 ZZ C3");
    expect(pecas).toEqual([]);

    botao(destino, "Confirmar").click();
    fechar();

    expect(pecas).toHaveLength(1);
    expect(pecas[0]?.origem).toEqual({ tipo: "audio", modelo: "whisper-large-v3-turbo", textoOuvido: "Rolamento 6304, ZZ, C3.", confirmadoPelaPessoa: true });
    expect(pecas[0]?.leitura).toMatchObject({ decisao: "resolve", rotulo: "Rolamento 6304 ZZ C3" });
    expect(botao(destino, "Achar peça por voz")).toBeDefined();
  });

  it("o que a pessoa corrige no campo é o que o motor lê", async () => {
    const { buscar } = servidor();
    const { destino, pecas, fechar } = abrir({ buscar });

    await gravarEPararDepoisDe(destino, 300);
    await ate(() => campo(destino));
    campo(destino).value = "Rolamento 6305 ZZ C3";
    botao(destino, "Confirmar").click();
    fechar();

    expect(pecas[0]?.leitura).toMatchObject({ decisao: "resolve", rotulo: "Rolamento 6305 ZZ C3" });
    expect(pecas[0]?.origem).toMatchObject({ textoOuvido: "Rolamento 6304, ZZ, C3." });
  });

  it("campo vazio não identifica nada", async () => {
    const { buscar } = servidor();
    const { destino, pecas, fechar } = abrir({ buscar });

    await gravarEPararDepoisDe(destino, 300);
    await ate(() => campo(destino));
    campo(destino).value = "   ";
    botao(destino, "Confirmar").click();
    fechar();

    expect(pecas).toEqual([]);
    expect(campo(destino)).toBeDefined();
  });

  it("'Falar de novo' descarta o texto e volta a gravar", async () => {
    const { buscar } = servidor();
    const { destino, pecas, fechar } = abrir({ buscar });

    await gravarEPararDepoisDe(destino, 300);
    await ate(() => campo(destino));
    botao(destino, "Falar de novo").click();
    await ate(() => botao(destino, "Parar"));
    fechar();

    expect(destino.querySelector("input")).toBeNull();
    expect(pecas).toEqual([]);
  });

  it("para sozinho no tempo máximo e solta o microfone", async () => {
    const { buscar, enviados } = servidor();
    const { destino } = abrir({ buscar, gravacaoMaximaMs: 500 });

    botao(destino, "Achar peça por voz").click();
    await ate(() => campo(destino));

    expect(enviados).toHaveLength(1);
    expect(fluxos.every((fluxo) => fluxo.getTracks().every((faixa) => faixa.readyState === "ended"))).toBe(true);
  });

  it("sem permissão do microfone, diz isso e deixa tentar de novo", async () => {
    const { buscar, enviados } = servidor();
    let pedidos = 0;
    const { destino } = abrir({
      buscar,
      microfone: () => {
        pedidos++;
        return pedidos === 1 ? Promise.reject(new DOMException("negado", "NotAllowedError")) : microfoneDeTeste();
      },
    });

    botao(destino, "Achar peça por voz").click();
    await ate(() => expect(destino.textContent).toContain("Não consegui usar o microfone."));
    botao(destino, "Tentar de novo").click();
    await ate(() => botao(destino, "Parar"));

    expect(pedidos).toBe(2);
    expect(enviados).toEqual([]);
  });

  it("no limite do Groq, avisa e reenvia a mesma gravação sem gravar de novo", async () => {
    const { buscar, enviados } = servidor([Response.json({ erro: "limite" }, { status: 429 }), Response.json(OUVIDO)]);
    const { destino } = abrir({ buscar });

    await gravarEPararDepoisDe(destino, 300);
    await ate(() => expect(destino.textContent).toContain("Limite da demo atingido."));
    botao(destino, "Tentar de novo").click();
    await ate(() => campo(destino));

    expect(enviados).toHaveLength(2);
    expect(enviados[1]?.bytes).toEqual(enviados[0]?.bytes);
  });

  it.each([
    ["o site estático não tem a função (404 com HTML)", () => new Response("<!doctype html>", { status: 404 })],
    ["a função está sem a chave do Groq (503)", () => Response.json({ erro: "sem-chave" }, { status: 503 })],
    ["o Groq falhou (502)", () => Response.json({ erro: "groq" }, { status: 502 })],
    ["a função responde 200 com HTML no lugar do JSON", () => new Response("<!doctype html>", { status: 200 })],
  ])("quando %s, diz que a transcrição está indisponível e deixa tentar de novo", async (_, resposta) => {
    const { buscar } = servidor([resposta()]);
    const { destino, pecas, fechar } = abrir({ buscar });

    await gravarEPararDepoisDe(destino, 300);
    await ate(() => expect(destino.textContent).toContain("A transcrição de áudio está indisponível agora."));
    fechar();

    expect(botao(destino, "Tentar de novo")).toBeDefined();
    expect(pecas).toEqual([]);
  });

  it("sem rede, diz que a transcrição está indisponível", async () => {
    const { destino } = abrir({ buscar: () => Promise.reject(new TypeError("Failed to fetch")) });

    await gravarEPararDepoisDe(destino, 300);

    await ate(() => expect(destino.textContent).toContain("A transcrição de áudio está indisponível agora."));
  });

  it("silêncio gravado diz que não ouviu nada", async () => {
    const { buscar } = servidor([Response.json({ texto: "", modelo: "whisper-large-v3-turbo", ms: 500 })]);
    const { destino } = abrir({ buscar });

    await gravarEPararDepoisDe(destino, 300);

    await ate(() => expect(destino.textContent).toContain("Não ouvi nada."));
  });

  it("a página registra o botão de áudio entre as entradas", () => {
    expect(entradasRegistradas.map((entrada) => entrada.id)).toContain("audio");
  });
});
