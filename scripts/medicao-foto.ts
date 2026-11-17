import type { Leitura } from "../src/contrato";
import { motor } from "../src/motor";

/** US$ por milhão de tokens, geo US do gpt-6-luna no Bedrock (cartão do modelo na AWS, lido em 17/11/2026). */
export const PRECO_POR_MILHAO = { entrada: 0.11, escritaDeCache: 0.1375, leituraDeCache: 0.011, saida: 0.55 } as const;

export interface Verdade {
  arquivo: string;
  /** O que está escrito na peça e que se lê com certeza. */
  linhas: readonly string[];
  /** O que está na peça mas não se lê na foto com certeza: lido pelo modelo, não conta como inventado. */
  ambiguo: readonly string[];
  /** A designação como o almoxarifado a digitaria, sem inferir nada que a peça não escreva. */
  designacao: string | null;
}

export interface Uso {
  entrada: number;
  escritaDeCache: number;
  leituraDeCache: number;
  saida: number;
}

export interface Chamada {
  arquivo: string;
  texto: string | null;
  ms: number;
  uso: Uso | null;
  falha: string | null;
}

export type Desfecho =
  | "chave-certa"
  | "chave-errada"
  | "revisa"
  | "recusa"
  | "resolve-sem-chave-esperada"
  | "sem-chave-esperada";

export interface Pontuacao {
  arquivo: string;
  texto: string;
  tokensDaVerdade: number;
  tokensLidos: number;
  /** Palavra do modelo a poucas edições de uma palavra da peça (1 se ela tem 3 a 5 letras, 2 se tem 6 ou mais): leu torto. */
  lidosTortos: { lido: string; verdade: string }[];
  /** Palavra do modelo sem nenhuma parecida na peça: não está lá. */
  inventados: string[];
  caracteresInventados: number;
  marcouIlegivel: boolean;
  /** Todas as palavras da designação saíram no texto (null: a peça não tem designação). */
  designacaoLida: boolean | null;
  chaveEsperada: string | null;
  decisaoDoTexto: Leitura["decisao"];
  desfecho: Desfecho;
}

const SEM_MARCAS = /\p{M}/gu;

/** Maiúsculas, sem acento, só letras e números: "6310-2Z/C3" vira 6310, 2Z, C3. */
export function palavras(texto: string): string[] {
  return texto
    .replace(/\[[^\]]*\]/g, " ")
    .normalize("NFD")
    .replace(SEM_MARCAS, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((p) => p !== "");
}

export function edicoes(a: string, b: string): number {
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min((atual[j - 1] ?? 0) + 1, (anterior[j] ?? 0) + 1, (anterior[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    anterior = atual;
  }
  return anterior[b.length] ?? 0;
}

/** Quantas edições ainda contam como a mesma palavra mal lida: palavra curta não tolera nenhuma. */
const tolerancia = (palavra: string): number => (palavra.length <= 2 ? 0 : palavra.length >= 6 ? 2 : 1);

const retirar = (lista: string[], palavra: string): boolean => {
  const posicao = lista.indexOf(palavra);
  if (posicao < 0) return false;
  lista.splice(posicao, 1);
  return true;
};

const leitura = (texto: string): Leitura => motor.ler({ texto, origem: { tipo: "digitado" } });
const chaveDe = (l: Leitura): string | null => (l.decisao === "resolve" ? l.chave : null);

function desfechoDe(esperada: string | null, lida: Leitura): Desfecho {
  if (esperada === null) return lida.decisao === "resolve" ? "resolve-sem-chave-esperada" : "sem-chave-esperada";
  if (lida.decisao !== "resolve") return lida.decisao;
  return lida.chave === esperada ? "chave-certa" : "chave-errada";
}

export function pontuar(verdade: Verdade, texto: string): Pontuacao {
  const daVerdade = verdade.linhas.flatMap(palavras);
  const doModelo = palavras(texto);

  const faltando = [...daVerdade];
  const sobrando = doModelo.filter((p) => !retirar(faltando, p));
  const exatos = daVerdade.length - faltando.length;
  const aceitas = new Set(verdade.ambiguo.flatMap(palavras));

  const lidosTortos: Pontuacao["lidosTortos"] = [];
  const inventados: string[] = [];
  for (const palavra of sobrando) {
    if (aceitas.has(palavra)) continue;
    const parecida = faltando.find((v) => edicoes(palavra, v) <= tolerancia(v));
    if (parecida === undefined) inventados.push(palavra);
    else {
      lidosTortos.push({ lido: palavra, verdade: parecida });
      retirar(faltando, parecida);
    }
  }

  const designacao = verdade.designacao === null ? null : palavras(verdade.designacao);
  const esperada = verdade.designacao === null ? null : chaveDe(leitura(verdade.designacao));
  const lida = leitura(texto);
  return {
    arquivo: verdade.arquivo,
    texto,
    tokensDaVerdade: daVerdade.length,
    tokensLidos: exatos,
    lidosTortos,
    inventados,
    caracteresInventados: inventados.reduce((soma, p) => soma + p.length, 0),
    marcouIlegivel: /\[[^\]]*\]/.test(texto),
    designacaoLida: designacao === null ? null : designacao.every((p) => doModelo.includes(p)),
    chaveEsperada: esperada,
    decisaoDoTexto: lida.decisao,
    desfecho: desfechoDe(esperada, lida),
  };
}

export function custoEmDolares(uso: Uso): number {
  const p = PRECO_POR_MILHAO;
  return (uso.entrada * p.entrada + uso.escritaDeCache * p.escritaDeCache + uso.leituraDeCache * p.leituraDeCache + uso.saida * p.saida) / 1e6;
}

/** Foto que o modelo nunca viu: toda a imagem é escrita de cache, mesmo que numa chamada anterior ela já tenha sido lida do cache. */
export function custoDeFotoNova(uso: Uso): number {
  return custoEmDolares({ ...uso, escritaDeCache: uso.escritaDeCache + uso.leituraDeCache, leituraDeCache: 0 });
}

export function mediana(valores: readonly number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  const centro = ordenados[meio] ?? 0;
  return ordenados.length % 2 === 1 ? centro : (centro + (ordenados[meio - 1] ?? 0)) / 2;
}
