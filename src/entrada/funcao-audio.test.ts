import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { onRequestPost } from "../../functions/api/audio";
import { motor } from "../motor";
import { identificarPeca, textoParaConferir, transcrever, type Buscar } from "./audio";

interface Gravada {
  status: number;
  cabecalhos?: Record<string, string>;
  corpo: unknown;
}

async function gravada(nome: string): Promise<Gravada> {
  return JSON.parse(await Bun.file(new URL(`./respostas-do-groq/${nome}.json`, import.meta.url)).text());
}

interface ChamadaAoGroq {
  endereco: string;
  autorizacao: string | null;
  campos: Record<string, string>;
  arquivo: { nome: string; tipo: string; bytes: number[] } | undefined;
}

const chamadas: ChamadaAoGroq[] = [];

/** O Groq, do jeito que ele respondeu quando gravei a resposta. Nenhum teste aqui usa a rede. */
async function groqResponde(nome: string): Promise<void> {
  const { status, cabecalhos, corpo } = await gravada(nome);
  spyOn(globalThis, "fetch").mockImplementation((async (entrada: string | URL | Request, init?: RequestInit) => {
    const formulario = init?.body;
    if (!(formulario instanceof FormData)) throw new Error("a função tem de mandar um formulário ao Groq");
    const arquivo = formulario.get("file");
    chamadas.push({
      endereco: String(entrada),
      autorizacao: new Headers(init?.headers).get("authorization"),
      campos: Object.fromEntries([...formulario.entries()].filter(([, valor]) => typeof valor === "string").map(([nome, valor]) => [nome, String(valor)])),
      arquivo: arquivo instanceof File ? { nome: arquivo.name, tipo: arquivo.type, bytes: [...new Uint8Array(await arquivo.arrayBuffer())] } : undefined,
    });
    return new Response(JSON.stringify(corpo), { status, headers: cabecalhos ?? {} });
  }) as unknown as typeof fetch);
}

afterEach(() => {
  chamadas.length = 0;
  mock.restore();
});

const COM_CHAVE = { GROQ_API_KEY: "chave-de-teste" };

const pedido = (corpo: BodyInit | null, tipo = "audio/webm;codecs=opus"): Request =>
  new Request("https://agroparts.test/api/audio", { method: "POST", headers: { "content-type": tipo }, body: corpo });

describe("POST /api/audio", () => {
  it("repassa a gravação ao Groq com o modelo, o idioma e a chave do servidor, e devolve o texto", async () => {
    await groqResponde("sucesso");

    const resposta = await onRequestPost({ request: pedido(new Uint8Array([9, 8, 7])), env: COM_CHAVE });

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ texto: "Rolamento 6304, ZZ, C3.", modelo: "whisper-large-v3-turbo", ms: expect.any(Number) });
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]?.endereco).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    expect(chamadas[0]?.autorizacao).toBe("Bearer chave-de-teste");
    expect(chamadas[0]?.campos).toMatchObject({ model: "whisper-large-v3-turbo", language: "pt", temperature: "0" });
    expect(chamadas[0]?.arquivo).toEqual({ nome: "fala.webm", tipo: "audio/webm", bytes: [9, 8, 7] });
  });

  it("o prompt traz o vocabulário do rolamento e nenhuma designação inteira", async () => {
    await groqResponde("sucesso");
    await onRequestPost({ request: pedido(new Uint8Array([1])), env: COM_CHAVE });

    const prompt = chamadas[0]?.campos.prompt ?? "";
    expect(prompt).toContain("Rolamento");
    expect(prompt).toContain("2RS");
    expect(prompt).not.toMatch(/\b\d{4,5}\b/);
  });

  it("dá ao arquivo a extensão do tipo que o navegador gravou", async () => {
    await groqResponde("sucesso");
    await onRequestPost({ request: pedido(new Uint8Array([1]), "audio/mp4"), env: COM_CHAVE });
    await onRequestPost({ request: pedido(new Uint8Array([1]), "audio/ogg;codecs=opus"), env: COM_CHAVE });

    expect(chamadas.map((c) => c.arquivo?.nome)).toEqual(["fala.m4a", "fala.ogg"]);
  });

  it("silêncio ou ruído voltam do Groq como a última frase do prompt, e daqui saem como texto vazio", async () => {
    await groqResponde("silencio");

    const resposta = await onRequestPost({ request: pedido(new Uint8Array([1])), env: COM_CHAVE });

    expect(await resposta.json()).toMatchObject({ texto: "" });
  });

  it("sem a chave no ambiente, responde 503 e não chama o Groq", async () => {
    await groqResponde("sucesso");

    const resposta = await onRequestPost({ request: pedido(new Uint8Array([1])), env: {} });

    expect(resposta.status).toBe(503);
    expect(await resposta.json()).toEqual({ erro: "sem-chave" });
    expect(chamadas).toHaveLength(0);
  });

  it("recusa o que não é áudio, o corpo vazio e o arquivo acima do teto de 25 MB do Groq, sem chamar o Groq", async () => {
    await groqResponde("sucesso");

    const texto = await onRequestPost({ request: pedido("olá", "text/plain"), env: COM_CHAVE });
    const vazio = await onRequestPost({ request: pedido(new Uint8Array()), env: COM_CHAVE });
    const grande = await onRequestPost({ request: pedido(new Uint8Array(25 * 1024 * 1024 + 1)), env: COM_CHAVE });
    const noTeto = await onRequestPost({ request: pedido(new Uint8Array(25 * 1024 * 1024)), env: COM_CHAVE });

    expect([texto.status, vazio.status, grande.status, noTeto.status]).toEqual([415, 400, 413, 200]);
    expect(chamadas).toHaveLength(1);
  });

  it("quando o Groq recusa por limite, responde 429 com o tempo de espera", async () => {
    await groqResponde("limite");

    const resposta = await onRequestPost({ request: pedido(new Uint8Array([1])), env: COM_CHAVE });

    expect(resposta.status).toBe(429);
    expect(resposta.headers.get("retry-after")).toBe("3");
    expect(await resposta.json()).toEqual({ erro: "limite" });
  });

  it.each(["chave-invalida", "arquivo-invalido"])("o erro %s do Groq vira 502 sem repassar a mensagem dele", async (nome) => {
    await groqResponde(nome);

    const resposta = await onRequestPost({ request: pedido(new Uint8Array([1])), env: COM_CHAVE });

    expect(resposta.status).toBe(502);
    expect(await resposta.json()).toMatchObject({ erro: "groq" });
  });

  it("sem rede até o Groq, responde 502", async () => {
    spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const resposta = await onRequestPost({ request: pedido(new Uint8Array([1])), env: COM_CHAVE });

    expect(resposta.status).toBe(502);
  });

  it("nenhuma resposta carrega a chave", async () => {
    for (const nome of ["sucesso", "limite", "chave-invalida"]) {
      await groqResponde(nome);
      const resposta = await onRequestPost({ request: pedido(new Uint8Array([1])), env: COM_CHAVE });
      expect(JSON.stringify([...resposta.headers])).not.toContain("chave-de-teste");
      expect(await resposta.text()).not.toContain("chave-de-teste");
      mock.restore();
    }
  });
});

describe("da gravação ao grupo", () => {
  it("a fala gravada chega ao motor na mesma chave da designação escrita", async () => {
    await groqResponde("sucesso");
    const buscar: Buscar = (endereco, requisicao) => onRequestPost({ request: new Request(`https://agroparts.test${endereco}`, requisicao), env: COM_CHAVE });

    const resultado = await transcrever(new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm;codecs=opus" }), buscar);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.transcricao.texto).toBe("Rolamento 6304, ZZ, C3.");
    expect(textoParaConferir(resultado.transcricao)).toBe("Rolamento 6304 ZZ C3");
    const { leitura } = identificarPeca(resultado.transcricao, textoParaConferir(resultado.transcricao), true);
    const escrita = motor.ler({ texto: "Rolamento 6304 ZZ C3", origem: { tipo: "digitado" } });
    expect(leitura.decisao).toBe("resolve");
    expect(escrita.decisao).toBe("resolve");
    if (leitura.decisao !== "resolve" || escrita.decisao !== "resolve") return;
    expect(leitura.chave).toBe(escrita.chave);
  });

  it("o silêncio gravado chega à pessoa como 'sem fala', e não como uma peça", async () => {
    await groqResponde("silencio");
    const buscar: Buscar = (endereco, requisicao) => onRequestPost({ request: new Request(`https://agroparts.test${endereco}`, requisicao), env: COM_CHAVE });

    expect(await transcrever(new Blob([new Uint8Array([1])], { type: "audio/webm" }), buscar)).toEqual({ ok: false, falha: "sem-fala" });
  });
});
