import type { Origem, PecaIdentificada } from "../contrato";
import { motor } from "../motor";
import { falaParaTexto } from "./fala";

export const ENDERECO_DA_TRANSCRICAO = "/api/audio";

/** A gravação para sozinha aqui: dez segundos de fala bastam para uma peça, e o resto só gasta o limite do Groq. */
export const GRAVACAO_MAXIMA_MS = 30_000;

export interface Transcricao {
  /** O que o modelo escreveu, sem mexer. */
  texto: string;
  modelo: string;
  ms: number;
}

export type FalhaDaTranscricao = "limite" | "formato" | "grande-demais" | "sem-fala" | "indisponivel";

export type ResultadoDaTranscricao = { ok: true; transcricao: Transcricao } | { ok: false; falha: FalhaDaTranscricao };

export type Buscar = (endereco: string, requisicao: RequestInit) => Promise<Response>;

const FALHA_POR_STATUS: ReadonlyMap<number, FalhaDaTranscricao> = new Map([
  [413, "grande-demais"],
  [415, "formato"],
  [429, "limite"],
]);

function lerTranscricao(corpo: unknown): Transcricao | null {
  if (typeof corpo !== "object" || corpo === null) return null;
  const { texto, modelo, ms } = corpo as Record<string, unknown>;
  if (typeof texto !== "string" || typeof modelo !== "string" || typeof ms !== "number") return null;
  return { texto, modelo, ms };
}

export async function transcrever(gravacao: Blob, buscar: Buscar): Promise<ResultadoDaTranscricao> {
  let resposta: Response;
  try {
    resposta = await buscar(ENDERECO_DA_TRANSCRICAO, { method: "POST", headers: { "content-type": gravacao.type }, body: gravacao });
  } catch {
    return { ok: false, falha: "indisponivel" };
  }
  if (!resposta.ok) return { ok: false, falha: FALHA_POR_STATUS.get(resposta.status) ?? "indisponivel" };
  const transcricao = lerTranscricao(await resposta.json().catch(() => null));
  if (!transcricao) return { ok: false, falha: "indisponivel" };
  if (transcricao.texto.trim() === "") return { ok: false, falha: "sem-fala" };
  return { ok: true, transcricao };
}

const FORMATOS_DE_GRAVACAO = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"] as const;

/** O primeiro formato que o navegador grava: webm no Android e no Chrome, mp4 no iPhone. */
export const escolherFormato = (suporta: (tipo: string) => boolean): string | undefined => FORMATOS_DE_GRAVACAO.find(suporta);

/** O que o campo mostra antes de a pessoa conferir. */
export const textoParaConferir = (transcricao: Transcricao): string => falaParaTexto(transcricao.texto);

/** Lê no motor o texto que a pessoa confirmou, com a transcrição guardada na origem. */
export function identificarPeca(transcricao: Transcricao, texto: string, confirmadoPelaPessoa: boolean): PecaIdentificada {
  const origem: Origem = { tipo: "audio", modelo: transcricao.modelo, textoOuvido: transcricao.texto, confirmadoPelaPessoa };
  return { leitura: motor.ler({ texto, origem }), origem };
}
