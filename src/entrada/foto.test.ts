import { describe, expect, it } from "bun:test";
import { FotoNaoLida, ENDERECO_DA_FOTO, LADO_MAXIMO, identificarPeca, ladosReduzidos, lerFoto, type Buscar } from "./foto";
import gravada from "./foto.gravada.json";

const resposta = (status: number, corpo: unknown): Awaited<ReturnType<Buscar>> => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => (corpo instanceof Error ? Promise.reject(corpo) : corpo),
});

const DA_FUNCAO = {
  texto: "JAPAN\n608\nUST",
  modelo: "us.openai.gpt-6-luna",
  ms: 1318,
  uso: { entrada: 2, escritaDeCache: 0, leituraDeCache: 2550, saida: 12 },
};

describe("redução para 1600 px", () => {
  it.each([
    [4000, 3000, 1600, 1200],
    [3000, 4000, 1200, 1600],
    [4080, 4080, 1600, 1600],
    [1920, 1080, 1600, 900],
  ])("%ix%i vira %ix%i, sem mudar a proporção", (largura, altura, esperadaLargura, esperadaAltura) => {
    expect(ladosReduzidos(largura, altura)).toEqual({ largura: esperadaLargura, altura: esperadaAltura });
  });

  it("não amplia foto que já cabe", () => {
    expect(ladosReduzidos(800, 600)).toEqual({ largura: 800, altura: 600 });
    expect(ladosReduzidos(LADO_MAXIMO, 10)).toEqual({ largura: LADO_MAXIMO, altura: 10 });
  });
});

describe("lerFoto", () => {
  it("manda o JPEG para /api/foto e devolve o que a função respondeu", async () => {
    const pedidos: [string, RequestInit][] = [];
    const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
    const lido = await lerFoto(jpeg, async (endereco, pedido) => {
      pedidos.push([endereco, pedido]);
      return resposta(200, DA_FUNCAO);
    });
    expect(lido).toEqual(DA_FUNCAO);
    expect(pedidos).toEqual([[ENDERECO_DA_FOTO, { method: "POST", headers: { "content-type": "image/jpeg" }, body: jpeg }]]);
  });

  it.each([
    ["a função responde 502", resposta(502, { erro: "modelo-indisponivel" })],
    ["a resposta não é JSON", resposta(200, new SyntaxError("Unexpected token"))],
    ["a resposta perdeu o texto", resposta(200, { ...DA_FUNCAO, texto: undefined })],
    ["a resposta perdeu o uso de tokens", resposta(200, { ...DA_FUNCAO, uso: { entrada: 2 } })],
  ])("recusa quando %s", async (_, recebida) => {
    await expect(lerFoto(new Blob(), async () => recebida)).rejects.toBeInstanceOf(FotoNaoLida);
  });
});

describe("a causa da falha, para a página dizer em português", () => {
  const falhaDe = (recebida: ReturnType<typeof resposta>) =>
    lerFoto(new Blob(), async () => recebida).then(
      () => "leu",
      (erro: unknown) => (erro instanceof FotoNaoLida ? erro.falha : "outro erro"),
    );

  it("429 é o limite da demo", async () => {
    expect(await falhaDe(resposta(429, { erro: "limite" }))).toBe("limite");
  });

  it.each([404, 405, 500, 502, 503])("%i é a função indisponível", async (status) => {
    expect(await falhaDe(resposta(status, { erro: "qualquer" }))).toBe("indisponivel");
  });

  it("uma resposta 200 que não é o JSON da função também é indisponível", async () => {
    expect(await falhaDe(resposta(200, new SyntaxError("<!doctype")))).toBe("indisponivel");
  });
});

describe("identificarPeca", () => {
  const lido = { texto: "SKF 6310-2Z/C3", modelo: "us.openai.gpt-6-luna" };

  it("põe o texto confirmado no motor com a origem foto e guarda o que o modelo leu", () => {
    const peca = identificarPeca(lido.texto, lido);
    expect(peca.origem).toEqual({ tipo: "foto", modelo: lido.modelo, textoLido: lido.texto, confirmadoPelaPessoa: true });
    expect(peca.leitura.decisao).toBe("resolve");
  });

  it("lê o texto que a pessoa corrigiu, e não o que o modelo leu", () => {
    const modelo = { texto: "SKF 6318-2Z/C3", modelo: lido.modelo };
    expect(identificarPeca(modelo.texto, modelo).leitura).toMatchObject({ decisao: "resolve", rotulo: "Rolamento 6318 ZZ C3" });
    const corrigida = identificarPeca("SKF 6310-2Z/C3", modelo);
    expect(corrigida.leitura).toMatchObject({ decisao: "resolve", rotulo: "Rolamento 6310 ZZ C3" });
    expect(corrigida.origem).toMatchObject({ textoLido: "SKF 6318-2Z/C3" });
  });

  it("o texto que o modelo leu da foto da NSK 608Z (sem o Z) não vira chave", () => {
    const texto = gravada.resposta.output.message.content[0]?.text ?? "";
    expect(identificarPeca(texto, { texto, modelo: lido.modelo }).leitura.decisao).not.toBe("resolve");
  });

  it("texto vazio é recusado pelo motor", () => {
    expect(identificarPeca("  ", lido).leitura).toMatchObject({ decisao: "recusa", motivo: "sem-texto" });
  });
});
