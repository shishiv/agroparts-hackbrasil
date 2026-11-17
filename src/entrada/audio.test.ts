import { describe, expect, it } from "bun:test";
import { escolherFormato, identificarPeca, textoParaConferir, transcrever, type Buscar } from "./audio";

const resposta = (status: number, corpo: unknown): Response => new Response(JSON.stringify(corpo), { status });

const gravacao = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/webm;codecs=opus" });

const responde =
  (status: number, corpo: unknown): Buscar =>
  async () =>
    resposta(status, corpo);

describe("transcrever", () => {
  it("manda a gravação como veio, com o tipo dela, e devolve o texto, o modelo e o tempo", async () => {
    let enviado: { endereco: string; metodo: string | undefined; tipo: string | null; bytes: number[] } | undefined;
    const buscar: Buscar = async (endereco, requisicao) => {
      enviado = {
        endereco,
        metodo: requisicao.method,
        tipo: new Headers(requisicao.headers).get("content-type"),
        bytes: [...new Uint8Array(await new Response(requisicao.body).arrayBuffer())],
      };
      return resposta(200, { texto: "Rolamento 6202, 2RS.", modelo: "whisper-large-v3-turbo", ms: 640 });
    };

    const resultado = await transcrever(gravacao, buscar);

    expect(resultado).toEqual({ ok: true, transcricao: { texto: "Rolamento 6202, 2RS.", modelo: "whisper-large-v3-turbo", ms: 640 } });
    expect(enviado).toEqual({ endereco: "/api/audio", metodo: "POST", tipo: "audio/webm;codecs=opus", bytes: [1, 2, 3, 4] });
  });

  it.each([
    [413, "grande-demais"],
    [415, "formato"],
    [429, "limite"],
    [502, "indisponivel"],
    [503, "indisponivel"],
  ] as const)("a resposta %i vira a falha %s", async (status, falha) => {
    expect(await transcrever(gravacao, responde(status, { erro: "qualquer" }))).toEqual({ ok: false, falha });
  });

  it("sem rede, é indisponível", async () => {
    const semRede: Buscar = async () => {
      throw new TypeError("Failed to fetch");
    };
    expect(await transcrever(gravacao, semRede)).toEqual({ ok: false, falha: "indisponivel" });
  });

  it("uma resposta 200 que não tem a forma combinada é indisponível", async () => {
    expect(await transcrever(gravacao, responde(200, { text: "Rolamento 6202" }))).toEqual({ ok: false, falha: "indisponivel" });
    expect(await transcrever(gravacao, async () => new Response("<html>", { status: 200 }))).toEqual({ ok: false, falha: "indisponivel" });
  });

  it("texto em branco é falta de fala", async () => {
    expect(await transcrever(gravacao, responde(200, { texto: "  ", modelo: "m", ms: 1 }))).toEqual({ ok: false, falha: "sem-fala" });
  });
});

describe("escolherFormato", () => {
  it("prefere webm com opus, depois mp4, depois o resto, e devolve nada quando o navegador não grava nenhum", () => {
    expect(escolherFormato(() => true)).toBe("audio/webm;codecs=opus");
    expect(escolherFormato((tipo) => tipo === "audio/mp4")).toBe("audio/mp4");
    expect(escolherFormato((tipo) => tipo.startsWith("audio/ogg"))).toBe("audio/ogg;codecs=opus");
    expect(escolherFormato(() => false)).toBeUndefined();
  });
});

describe("identificarPeca", () => {
  const ouvido = { texto: "Rolamento 6202, 2RS.", modelo: "whisper-large-v3-turbo", ms: 640 };

  it("mostra no campo o que o motor lê, sem a pausa do ditado", () => {
    expect(textoParaConferir(ouvido)).toBe("Rolamento 6202 2RS");
  });

  it("lê o texto confirmado e guarda na origem o que o modelo ouviu, mesmo quando a pessoa corrigiu", () => {
    const peca = identificarPeca(ouvido, "Rolamento 6203 2RS", true);

    expect(peca.origem).toEqual({ tipo: "audio", modelo: "whisper-large-v3-turbo", textoOuvido: "Rolamento 6202, 2RS.", confirmadoPelaPessoa: true });
    expect(peca.leitura.decisao).toBe("resolve");
    if (peca.leitura.decisao !== "resolve") return;
    expect(peca.leitura.rotulo).toBe("Rolamento 6203 2RS");
  });

  it("sem confirmação da pessoa, a origem diz isso", () => {
    expect(identificarPeca(ouvido, textoParaConferir(ouvido), false).origem).toMatchObject({ tipo: "audio", confirmadoPelaPessoa: false });
  });

  it("texto que não é rolamento volta recusado, e vazio volta sem texto", () => {
    expect(identificarPeca(ouvido, "Folga C3", true).leitura).toMatchObject({ decisao: "recusa", motivo: "fora-das-familias" });
    expect(identificarPeca(ouvido, "", true).leitura).toMatchObject({ decisao: "recusa", motivo: "sem-texto" });
  });
});
