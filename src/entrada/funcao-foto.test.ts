import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { readFileSync } from "node:fs";
import { MAXIMO_DE_BYTES, MAXIMO_DE_TOKENS, MODELO, PEDIDO, onRequestPost, type Env } from "../../functions/api/foto";
import gravada from "./foto.gravada.json";

const JPEG = new Uint8Array(readFileSync(new URL("../../public/exemplos/nsk-608z.jpg", import.meta.url)));
const ENV: Env = { AWS_ACCESS_KEY_ID: "AKIDEXAMPLE", AWS_SECRET_ACCESS_KEY: "chave-de-teste" };

let pedidos: Request[] = [];
let responder: () => Response;
let rede: ReturnType<typeof spyOn>;

beforeEach(() => {
  pedidos = [];
  responder = () => Response.json(gravada.resposta);
  rede = spyOn(globalThis, "fetch").mockImplementation((async (entrada: Request) => {
    pedidos.push(entrada);
    return responder();
  }) as unknown as typeof fetch);
});

afterEach(() => rede.mockRestore());

const foto = (corpo: BodyInit = JPEG, cabecalhos: Record<string, string> = { "content-type": "image/jpeg" }) =>
  new Request("https://agroparts.test/api/foto", { method: "POST", headers: cabecalhos, body: corpo });

describe("POST /api/foto com a resposta gravada do Bedrock", () => {
  it("devolve o texto, o modelo, o tempo e o uso de tokens", async () => {
    const resposta = await onRequestPost({ request: foto(), env: ENV });
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({
      texto: "JAPAN\n608\nUST",
      modelo: MODELO,
      ms: expect.any(Number),
      uso: { entrada: 2, escritaDeCache: 0, leituraDeCache: 2550, saida: 12 },
    });
  });

  it("assina com SigV4 para o serviço bedrock em us-east-1 e leva a foto e o pedido de só transcrever", async () => {
    await onRequestPost({ request: foto(), env: { ...ENV, AWS_SESSION_TOKEN: "sessao" } });
    expect(pedidos).toHaveLength(1);
    const [pedido] = pedidos;
    expect(pedido?.method).toBe("POST");
    expect(pedido?.url).toBe(`https://bedrock-runtime.us-east-1.amazonaws.com/model/${MODELO}/converse`);
    expect(pedido?.headers.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/us-east-1\/bedrock\/aws4_request, SignedHeaders=.+, Signature=[0-9a-f]{64}$/,
    );
    expect(pedido?.headers.get("x-amz-security-token")).toBe("sessao");

    const corpo = await pedido?.json();
    const [imagem, texto] = corpo.messages[0].content;
    expect(imagem.image.format).toBe("jpeg");
    expect(Buffer.from(imagem.image.source.bytes, "base64").equals(Buffer.from(JPEG))).toBe(true);
    expect(texto.text).toBe(PEDIDO);
    expect(corpo.inferenceConfig).toEqual({ maxTokens: MAXIMO_DE_TOKENS });
    expect(corpo.additionalModelRequestFields).toEqual({ reasoning: { effort: "none" } });
  });

  it("não manda temperature: o modelo a recusa com 400", async () => {
    await onRequestPost({ request: foto(), env: ENV });
    expect(JSON.stringify(await pedidos[0]?.json())).not.toContain("temperature");
  });
});

describe("o que a função recusa ou repassa como erro", () => {
  it("sem credencial nas variáveis da função, responde 500 e não chama o Bedrock", async () => {
    const erro = spyOn(console, "error").mockImplementation(() => undefined);
    const resposta = await onRequestPost({ request: foto(), env: {} });
    erro.mockRestore();
    expect([resposta.status, await resposta.json()]).toEqual([500, { erro: "funcao-sem-credencial" }]);
    expect(pedidos).toHaveLength(0);
  });

  it("só aceita JPEG", async () => {
    const resposta = await onRequestPost({ request: foto(JPEG, { "content-type": "image/png" }), env: ENV });
    expect([resposta.status, await resposta.json()]).toEqual([415, { erro: "so-jpeg" }]);
    expect(pedidos).toHaveLength(0);
  });

  it("recusa corpo vazio", async () => {
    const resposta = await onRequestPost({ request: foto(new Uint8Array()), env: ENV });
    expect([resposta.status, await resposta.json()]).toEqual([400, { erro: "foto-vazia" }]);
    expect(pedidos).toHaveLength(0);
  });

  it("recusa foto acima de 3,75 MB sem chamar o Bedrock", async () => {
    const resposta = await onRequestPost({ request: foto(new Uint8Array(MAXIMO_DE_BYTES + 1)), env: ENV });
    expect([resposta.status, await resposta.json()]).toEqual([413, { erro: "foto-grande" }]);
    expect(pedidos).toHaveLength(0);
  });

  it("devolve 502 quando o Bedrock recusa o pedido", async () => {
    const erro = spyOn(console, "error").mockImplementation(() => undefined);
    responder = () => Response.json(gravada.recusaDeTemperatura, { status: 400 });
    const resposta = await onRequestPost({ request: foto(), env: ENV });
    expect([resposta.status, await resposta.json()]).toEqual([502, { erro: "modelo-indisponivel" }]);
    erro.mockRestore();
  });

  it("devolve 502 quando o raciocínio gasta os tokens e não vem texto", async () => {
    responder = () => Response.json(gravada.semTexto);
    const resposta = await onRequestPost({ request: foto(), env: ENV });
    expect([resposta.status, await resposta.json()]).toEqual([502, { erro: "modelo-sem-texto" }]);
  });

  it("devolve 502 quando a resposta não tem a forma da API Converse", async () => {
    responder = () => Response.json({ output: {} });
    const resposta = await onRequestPost({ request: foto(), env: ENV });
    expect([resposta.status, await resposta.json()]).toEqual([502, { erro: "resposta-invalida" }]);
  });
});
