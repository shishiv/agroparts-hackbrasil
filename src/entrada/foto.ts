import type { Origem, PecaIdentificada } from "../contrato";
import { motor } from "../motor";

export const ENDERECO_DA_FOTO = "/api/foto";
export const LADO_MAXIMO = 1600;
export const QUALIDADE_DO_JPEG = 0.85;

export interface TextoDaFoto {
  texto: string;
  modelo: string;
  ms: number;
  uso: { entrada: number; escritaDeCache: number; leituraDeCache: number; saida: number };
}

export type Buscar = (endereco: string, pedido: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

export class FotoNaoLida extends Error {
  constructor(readonly motivo: string) {
    super(`a foto não virou texto: ${motivo}`);
  }
}

export function ladosReduzidos(largura: number, altura: number): { largura: number; altura: number } {
  const escala = Math.min(1, LADO_MAXIMO / Math.max(largura, altura));
  return { largura: Math.round(largura * escala), altura: Math.round(altura * escala) };
}

const ehObjeto = (valor: unknown): valor is Record<string, unknown> => typeof valor === "object" && valor !== null;

function lerTextoDaFoto(corpo: unknown): TextoDaFoto | null {
  if (!ehObjeto(corpo) || !ehObjeto(corpo.uso)) return null;
  const { texto, modelo, ms, uso } = corpo;
  if (typeof texto !== "string" || typeof modelo !== "string" || typeof ms !== "number") return null;
  const { entrada, escritaDeCache, leituraDeCache, saida } = uso;
  if (typeof entrada !== "number" || typeof escritaDeCache !== "number") return null;
  if (typeof leituraDeCache !== "number" || typeof saida !== "number") return null;
  return { texto, modelo, ms, uso: { entrada, escritaDeCache, leituraDeCache, saida } };
}

export async function lerFoto(jpeg: Blob, buscar: Buscar): Promise<TextoDaFoto> {
  const resposta = await buscar(ENDERECO_DA_FOTO, {
    method: "POST",
    headers: { "content-type": "image/jpeg" },
    body: jpeg,
  });
  if (!resposta.ok) throw new FotoNaoLida(`a função respondeu ${resposta.status}`);
  const lido = lerTextoDaFoto(await resposta.json().catch(() => null));
  if (!lido) throw new FotoNaoLida("resposta fora do formato");
  return lido;
}

/** O texto que a pessoa confirmou entra no motor com a origem foto; o texto que o modelo leu fica na origem. */
export function identificarPeca(textoConfirmado: string, lido: Pick<TextoDaFoto, "texto" | "modelo">): PecaIdentificada {
  const origem: Origem = {
    tipo: "foto",
    modelo: lido.modelo,
    textoLido: lido.texto,
    confirmadoPelaPessoa: true,
  };
  return { leitura: motor.ler({ texto: textoConfirmado, origem }), origem };
}
