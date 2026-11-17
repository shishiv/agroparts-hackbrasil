import { afterEach, describe, expect, it, vi } from "vitest";
import { PECA_IDENTIFICADA, type PecaIdentificada } from "../../src/contrato";
import type { Buscar } from "../../src/entrada/foto";
import { servidorDaDemo } from "../equipamento/demo-de-teste";
import { montarEquipamento } from "../equipamento/pagina";
import { criarEntradaDeFoto, publicarNaJanela, reduzirParaJpeg, type Ambiente } from "./foto";

const montados: HTMLElement[] = [];
afterEach(() => {
  for (const raiz of montados.splice(0)) raiz.remove();
});

const DO_MODELO = {
  texto: "SKF\n6310-2Z/C3\nMADE IN SWEDEN",
  modelo: "us.openai.gpt-6-luna",
  ms: 1500,
  uso: { entrada: 2, escritaDeCache: 2550, leituraDeCache: 0, saida: 14 },
};

const resposta = (status: number, corpo: unknown): Awaited<ReturnType<Buscar>> => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => corpo,
});

function montar(ambiente: Partial<Ambiente> = {}) {
  const raiz = document.createElement("main");
  document.body.append(raiz);
  montados.push(raiz);
  const publicados: PecaIdentificada[] = [];
  const pedidos: [string, RequestInit][] = [];
  criarEntradaDeFoto(() => ({
    buscar: async (endereco, pedido) => {
      pedidos.push([endereco, pedido]);
      return resposta(200, DO_MODELO);
    },
    reduzir: async (foto) => foto,
    publicar: (detalhe) => void publicados.push(detalhe),
    ...ambiente,
  })).montar(raiz);
  return { raiz, publicados, pedidos };
}

const estado = (raiz: HTMLElement) => raiz.querySelector<HTMLElement>(".entrada-foto")?.dataset.estado;
const botao = (raiz: HTMLElement, nome: string) =>
  [...raiz.querySelectorAll("button")].find((b) => b.textContent === nome) ?? expect.fail(`sem botão ${nome}`);
const campo = (raiz: HTMLElement) => raiz.querySelector("textarea") ?? expect.fail("sem campo de texto");

function escolher(raiz: HTMLElement, foto: File): void {
  const entrada = raiz.querySelector<HTMLInputElement>('input[type="file"]') ?? expect.fail("sem campo de arquivo");
  const lista = new DataTransfer();
  lista.items.add(foto);
  entrada.files = lista.files;
  entrada.dispatchEvent(new Event("change"));
}

const JPEG = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], "rolamento.jpg", { type: "image/jpeg" });

async function imagem(largura: number, altura: number): Promise<File> {
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext("2d") ?? expect.fail("sem canvas");
  contexto.fillStyle = "#808080";
  contexto.fillRect(0, 0, largura, altura);
  contexto.fillStyle = "#ffffff";
  contexto.font = "200px sans-serif";
  contexto.fillText("6310-2Z", 100, altura / 2);
  const png = await new Promise<Blob>((resolver) => tela.toBlob((b) => resolver(b ?? expect.fail("sem PNG")), "image/png"));
  return new File([png], "grande.png", { type: "image/png" });
}

describe("redução da foto no navegador", () => {
  it.each([
    [3200, 2400, 1600, 1200],
    [2400, 3200, 1200, 1600],
    [800, 600, 800, 600],
  ])("%ix%i sai em JPEG de %ix%i", async (largura, altura, esperadaLargura, esperadaAltura) => {
    const jpeg = await reduzirParaJpeg(await imagem(largura, altura));
    expect(jpeg.type).toBe("image/jpeg");
    const lida = await createImageBitmap(jpeg);
    expect([lida.width, lida.height]).toEqual([esperadaLargura, esperadaAltura]);
  });
});

describe("o botão de foto", () => {
  it("começa só com o botão Achar peça por foto, que abre a câmera traseira", () => {
    const { raiz } = montar();
    expect(estado(raiz)).toBe("pronta");
    expect(botao(raiz, "Achar peça por foto")).toBeTruthy();
    const arquivo = raiz.querySelector("input[type=file]");
    expect([arquivo?.getAttribute("accept"), arquivo?.getAttribute("capture")]).toEqual(["image/*", "environment"]);
  });

  it("mostra o texto lido num campo editável antes de qualquer coisa chegar ao motor", async () => {
    let chegou: (valor: ReturnType<typeof resposta>) => void = () => undefined;
    const { raiz, publicados } = montar({ buscar: () => new Promise((resolver) => (chegou = resolver)) });
    escolher(raiz, JPEG);
    await vi.waitFor(() => expect(estado(raiz)).toBe("lendo"));
    expect(raiz.querySelector("[aria-busy=true]")).toBeTruthy();
    chegou(resposta(200, DO_MODELO));
    await vi.waitFor(() => expect(estado(raiz)).toBe("conferindo"));
    expect(campo(raiz).value).toBe(DO_MODELO.texto);
    expect(publicados).toEqual([]);
  });

  it("confirma o texto que a pessoa corrigiu e avisa a página com origem foto", async () => {
    const { raiz, publicados, pedidos } = montar();
    escolher(raiz, JPEG);
    await vi.waitFor(() => expect(estado(raiz)).toBe("conferindo"));
    expect(pedidos.map(([endereco, pedido]) => [endereco, pedido.method, (pedido.body as Blob).type])).toEqual([["/api/foto", "POST", "image/jpeg"]]);

    campo(raiz).value = "SKF 6308-2Z/C3";
    botao(raiz, "Confirmar").click();

    expect(estado(raiz)).toBe("pronta");
    expect(publicados).toHaveLength(1);
    const [peca] = publicados;
    expect(peca?.origem).toEqual({ tipo: "foto", modelo: DO_MODELO.modelo, textoLido: DO_MODELO.texto, confirmadoPelaPessoa: true });
    expect(peca?.leitura).toMatchObject({ decisao: "resolve", rotulo: "Rolamento 6308 ZZ C3" });
  });

  it("descartar volta ao botão e não avisa ninguém", async () => {
    const { raiz, publicados } = montar();
    escolher(raiz, JPEG);
    await vi.waitFor(() => expect(estado(raiz)).toBe("conferindo"));
    botao(raiz, "Descartar").click();
    expect(estado(raiz)).toBe("pronta");
    expect(publicados).toEqual([]);
  });

  it.each([
    ["o site estático não tem a função (404 com HTML)", () => ({ ok: false, status: 404, json: async () => Promise.reject(new SyntaxError("<!doctype")) }), "A leitura de foto está indisponível agora."],
    ["a função está sem a chave da AWS (500)", () => resposta(500, { erro: "funcao-sem-credencial" }), "A leitura de foto está indisponível agora."],
    ["o Bedrock falhou (502)", () => resposta(502, { erro: "modelo-indisponivel" }), "A leitura de foto está indisponível agora."],
    ["a função responde 200 com HTML no lugar do JSON", () => ({ ok: true, status: 200, json: async () => Promise.reject(new SyntaxError("<!doctype")) }), "A leitura de foto está indisponível agora."],
    ["o celular está sem rede", () => Promise.reject(new TypeError("Failed to fetch")), "A leitura de foto está indisponível agora."],
    ["bateu o limite (429)", () => resposta(429, { erro: "limite" }), "Limite da demo atingido. Tente em um minuto."],
  ])("quando %s, diz em português e deixa tentar de novo", async (_, responder, aviso) => {
    const { raiz, publicados } = montar({ buscar: async () => responder() });
    escolher(raiz, JPEG);
    await vi.waitFor(() => expect(estado(raiz)).toBe("erro"));
    expect(raiz.querySelector("[role=alert]")?.textContent).toBe(aviso);
    expect(botao(raiz, "Achar peça por foto")).toBeTruthy();
    expect(publicados).toEqual([]);
  });

  it("depois de uma falha, a segunda foto lê normalmente", async () => {
    let pedidos = 0;
    const { raiz } = montar({ buscar: async () => (++pedidos === 1 ? resposta(502, { erro: "modelo-indisponivel" }) : resposta(200, DO_MODELO)) });
    escolher(raiz, JPEG);
    await vi.waitFor(() => expect(estado(raiz)).toBe("erro"));
    escolher(raiz, JPEG);
    await vi.waitFor(() => expect(estado(raiz)).toBe("conferindo"));
    expect(campo(raiz).value).toBe(DO_MODELO.texto);
  });

  it("quando a foto não reduz, diz que não conseguiu abri-la e não chama a função", async () => {
    const pedidos: string[] = [];
    const { raiz } = montar({
      reduzir: async () => Promise.reject(new Error("foto corrompida")),
      buscar: async (endereco) => {
        pedidos.push(endereco);
        return resposta(200, DO_MODELO);
      },
    });
    escolher(raiz, JPEG);
    await vi.waitFor(() => expect(estado(raiz)).toBe("erro"));
    expect(raiz.querySelector("[role=alert]")?.textContent).toBe("Não consegui abrir esta foto.");
    expect(pedidos).toEqual([]);
  });
});

describe("o aviso à página do equipamento", () => {
  it("publicarNaJanela dispara agroparts:peca-identificada com a peça no detalhe", () => {
    const recebidos: PecaIdentificada[] = [];
    const ouvir = (evento: Event) => void (evento instanceof CustomEvent && recebidos.push(evento.detail));
    window.addEventListener(PECA_IDENTIFICADA, ouvir);
    const peca: PecaIdentificada = { leitura: { decisao: "recusa", motivo: "sem-texto", detalhe: "", atributos: [] }, origem: { tipo: "digitado" } };
    publicarNaJanela(peca);
    window.removeEventListener(PECA_IDENTIFICADA, ouvir);
    expect(recebidos).toEqual([peca]);
  });

  async function paginaComFoto(texto: string) {
    const pagina = document.createElement("main");
    document.body.append(pagina);
    montados.push(pagina);
    const sinal = new EventTarget();
    await montarEquipamento(pagina, "004512", { buscar: servidorDaDemo().buscar, ir: () => undefined, escutar: sinal, entradas: [] });
    const { raiz } = montar({
      buscar: async () => resposta(200, { ...DO_MODELO, texto }),
      publicar: (detalhe) => void sinal.dispatchEvent(new CustomEvent(PECA_IDENTIFICADA, { detail: detalhe })),
    });
    escolher(raiz, JPEG);
    await vi.waitFor(() => expect(estado(raiz)).toBe("conferindo"));
    botao(raiz, "Confirmar").click();
    return pagina;
  }

  it("a página real responde a uma foto que o motor lê", async () => {
    const pagina = await paginaComFoto("SKF 6310-2Z/C3");
    await vi.waitFor(() => expect(pagina.querySelector("[data-aviso]")).toBeTruthy());
    expect(pagina.querySelector("[data-aviso]")?.getAttribute("data-aviso")).not.toBe("sem-chave");
  });

  it("a página real diz que não deu para identificar quando a foto sai ilegível", async () => {
    const pagina = await paginaComFoto("[ilegível]");
    await vi.waitFor(() => expect(pagina.querySelector("[data-aviso=sem-chave]")).toBeTruthy());
  });
});
