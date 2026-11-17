import { AwsClient } from "aws4fetch";

export const MODELO = "us.openai.gpt-6-luna";
export const REGIAO = "us-east-1";
export const MAXIMO_DE_TOKENS = 300;
/** Limite da API Converse por imagem: 3,75 MB. */
export const MAXIMO_DE_BYTES = 3_750_000;

export const PEDIDO =
  "Copie exatamente o texto impresso ou gravado na peça, uma linha por linha visível. " +
  "Não corrija, não complete, não interprete. Escreva [ilegível] onde não der para ler.";

export interface Env {
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_SESSION_TOKEN?: string;
}

export interface Credenciais {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export interface Transcricao {
  texto: string;
  modelo: string;
  /** Tempo da chamada ao Bedrock, visto de quem chama. */
  ms: number;
  /** O Bedrock cobra a imagem como escrita ou leitura de cache implícito, não como `inputTokens`. */
  uso: { entrada: number; escritaDeCache: number; leituraDeCache: number; saida: number };
}

export type Falha = { status: number; erro: "modelo-indisponivel" | "modelo-sem-texto" | "resposta-invalida" };

export type Buscar = (pedido: Request) => Promise<Response>;

const NOME_DO_SERVICO = "bedrock";
const ENDERECO = `https://bedrock-runtime.${REGIAO}.amazonaws.com/model/${encodeURIComponent(MODELO)}/converse`;

function emBase64(bytes: Uint8Array): string {
  const bloco = 0x8000;
  let binario = "";
  for (let i = 0; i < bytes.length; i += bloco) binario += String.fromCharCode(...bytes.subarray(i, i + bloco));
  return btoa(binario);
}

/**
 * O gpt-6-luna recusa `temperature` (400: "This model doesn't support the temperature field"), então o pedido não a leva.
 * Sem `reasoning.effort: "none"` ele gasta os 300 tokens pensando e não devolve texto (stopReason max_tokens).
 */
export function corpoDoConverse(jpeg: Uint8Array): string {
  return JSON.stringify({
    messages: [
      {
        role: "user",
        content: [{ image: { format: "jpeg", source: { bytes: emBase64(jpeg) } } }, { text: PEDIDO }],
      },
    ],
    inferenceConfig: { maxTokens: MAXIMO_DE_TOKENS },
    additionalModelRequestFields: { reasoning: { effort: "none" } },
  });
}

const ehObjeto = (valor: unknown): valor is Record<string, unknown> => typeof valor === "object" && valor !== null;

/** Lê a resposta da API Converse. É a fronteira: nada de fora passa daqui sem ser conferido. */
export function lerResposta(corpo: unknown): Omit<Transcricao, "ms"> | Falha {
  if (!ehObjeto(corpo) || !ehObjeto(corpo.output) || !ehObjeto(corpo.output.message) || !ehObjeto(corpo.usage)) {
    return { status: 502, erro: "resposta-invalida" };
  }
  const { content } = corpo.output.message;
  const { inputTokens, outputTokens, cacheWriteInputTokens = 0, cacheReadInputTokens = 0 } = corpo.usage;
  if (
    !Array.isArray(content) ||
    typeof inputTokens !== "number" ||
    typeof outputTokens !== "number" ||
    typeof cacheWriteInputTokens !== "number" ||
    typeof cacheReadInputTokens !== "number"
  ) {
    return { status: 502, erro: "resposta-invalida" };
  }
  const texto = content
    .flatMap((bloco) => (ehObjeto(bloco) && typeof bloco.text === "string" ? [bloco.text] : []))
    .join("\n")
    .trim();
  if (texto === "") return { status: 502, erro: "modelo-sem-texto" };
  return {
    texto,
    modelo: MODELO,
    uso: { entrada: inputTokens, escritaDeCache: cacheWriteInputTokens, leituraDeCache: cacheReadInputTokens, saida: outputTokens },
  };
}

/** Pede ao modelo a transcrição do texto que aparece na foto. */
export async function transcrever(
  jpeg: Uint8Array,
  credenciais: Credenciais,
  buscar: Buscar = fetch,
): Promise<Transcricao | Falha> {
  const aws = new AwsClient({ ...credenciais, service: NOME_DO_SERVICO, region: REGIAO });
  const pedido = await aws.sign(ENDERECO, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: corpoDoConverse(jpeg),
  });
  const inicio = Date.now();
  const resposta = await buscar(pedido);
  const ms = Date.now() - inicio;
  if (!resposta.ok) {
    console.error(`bedrock respondeu ${resposta.status}: ${(await resposta.text()).slice(0, 300)}`);
    return { status: 502, erro: "modelo-indisponivel" };
  }
  const lida = lerResposta(await resposta.json().catch(() => null));
  return "erro" in lida ? lida : { ...lida, ms };
}

const json = (corpo: object, status = 200): Response =>
  Response.json(corpo, { status, headers: { "cache-control": "no-store" } });

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  const { AWS_ACCESS_KEY_ID: accessKeyId, AWS_SECRET_ACCESS_KEY: secretAccessKey, AWS_SESSION_TOKEN: sessionToken } = env;
  if (!accessKeyId || !secretAccessKey) {
    console.error("faltam AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY nas variáveis da função");
    return json({ erro: "funcao-sem-credencial" }, 500);
  }
  if (request.headers.get("content-type")?.split(";")[0]?.trim() !== "image/jpeg") {
    return json({ erro: "so-jpeg" }, 415);
  }
  if (Number(request.headers.get("content-length")) > MAXIMO_DE_BYTES) return json({ erro: "foto-grande" }, 413);
  const jpeg = new Uint8Array(await request.arrayBuffer());
  if (jpeg.length === 0) return json({ erro: "foto-vazia" }, 400);
  if (jpeg.length > MAXIMO_DE_BYTES) return json({ erro: "foto-grande" }, 413);

  const resultado = await transcrever(jpeg, { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) });
  return "erro" in resultado ? json({ erro: resultado.erro }, resultado.status) : json(resultado);
};
