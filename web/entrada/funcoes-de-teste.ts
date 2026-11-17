import type { Page } from "playwright";
import { onRequestPost as funcaoDeAudio } from "../../functions/api/audio";
import { onRequestPost as funcaoDeFoto } from "../../functions/api/foto";
import fotoGravada from "../../src/entrada/foto.gravada.json";
import limiteDoGroq from "../../src/entrada/respostas-do-groq/limite.json";
import sucessoDoGroq from "../../src/entrada/respostas-do-groq/sucesso.json";

/** O que o provedor respondeu quando a resposta foi gravada. */
interface RespostaGravada {
  status: number;
  corpo: unknown;
  cabecalhos?: Record<string, string>;
}

export const BEDROCK_GRAVADO: RespostaGravada = { status: 200, corpo: fotoGravada.resposta };
export const GROQ_GRAVADO = { sucesso: sucessoDoGroq, limite: limiteDoGroq } satisfies Record<string, RespostaGravada>;

export const COM_CHAVE_DA_AWS = { AWS_ACCESS_KEY_ID: "AKIDEXAMPLE", AWS_SECRET_ACCESS_KEY: "chave-de-teste" };
export const COM_CHAVE_DO_GROQ = { GROQ_API_KEY: "chave-de-teste" };

export interface FuncaoRoteada {
  /** As variáveis da função: sem chave, a função responde como no Cloudflare sem segredo. */
  env: Record<string, string>;
  gravada: RespostaGravada;
}

const ENDERECOS_DOS_PROVEDORES = ["https://bedrock-runtime.us-east-1.amazonaws.com/", "https://api.groq.com/"];

/** Roda o código da função de verdade. O único `fetch` que ela faz é desviado para a resposta gravada, e qualquer outro endereço falha. */
async function rodar(
  funcao: typeof funcaoDeFoto | typeof funcaoDeAudio,
  request: Request,
  { env, gravada }: FuncaoRoteada,
  chamadasAoProvedor: string[],
): Promise<Response> {
  const fetchDaMaquina = globalThis.fetch;
  globalThis.fetch = (async (entrada: string | URL | Request) => {
    const endereco = entrada instanceof Request ? entrada.url : String(entrada);
    if (!ENDERECOS_DOS_PROVEDORES.some((inicio) => endereco.startsWith(inicio))) throw new Error(`rede bloqueada no teste: ${endereco}`);
    chamadasAoProvedor.push(endereco);
    return new Response(JSON.stringify(gravada.corpo), { status: gravada.status, headers: gravada.cabecalhos ?? {} });
  }) as typeof fetch;
  try {
    return await funcao({ request, env });
  } finally {
    globalThis.fetch = fetchDaMaquina;
  }
}

/**
 * Faz `/api/foto` e `/api/audio` da página responderem como a função responderia a uma resposta gravada do provedor.
 * A rota que não for dada não é interceptada: o servidor estático da página responde, como num site sem Functions.
 * Devolve os endereços do provedor que as funções chamaram.
 */
export async function rotearFuncoes(pagina: Page, funcoes: { foto?: FuncaoRoteada; audio?: FuncaoRoteada }): Promise<string[]> {
  const chamadasAoProvedor: string[] = [];
  for (const [nome, funcao] of [
    ["foto", funcaoDeFoto],
    ["audio", funcaoDeAudio],
  ] as const) {
    const roteada = funcoes[nome];
    if (!roteada) continue;
    await pagina.route(`**/api/${nome}`, async (rota) => {
      const pedido = rota.request();
      const corpo = pedido.postDataBuffer();
      const resposta = await rodar(
        funcao,
        new Request(pedido.url(), { method: pedido.method(), headers: pedido.headers(), body: corpo && new Uint8Array(corpo) }),
        roteada,
        chamadasAoProvedor,
      );
      await rota.fulfill({ status: resposta.status, headers: Object.fromEntries(resposta.headers), body: Buffer.from(await resposta.arrayBuffer()) });
    });
  }
  return chamadasAoProvedor;
}
