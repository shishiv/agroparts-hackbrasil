import { readFileSync } from "node:fs";
import { lerCodigo } from "../exportacao/valores";
import type { CodigoLegado } from "../contrato";
import { classesOferecidas, lerClassesDaArvore, marcarClasse, type Classe } from "./classes";
import type { RespostaDoJev } from "./pergunta";

export function classe(codigo: string, nome: string, nomeGrupo = "GRUPO"): Classe {
  const marcada = marcarClasse(codigo);
  if (!marcada.ok) throw new Error(marcada.problema);
  return { codigo: marcada.valor, nome, codigoGrupo: 30, nomeGrupo };
}

/** As classes que o Jev recebeu como opção quando as respostas gravadas foram pedidas. */
export function classesDaGravacao() {
  const lidas = lerClassesDaArvore(readFileSync(new URL("../../dados/catmat/arvore.json", import.meta.url), "utf8"));
  if (!lidas.ok) throw new Error("árvore do CATMAT ilegível");
  return classesOferecidas(lidas.valor);
}

export interface Gravacao {
  descricao: string;
  resposta: RespostaDoJev;
}

export function lerGravacao(codigo: string): Gravacao {
  return JSON.parse(readFileSync(new URL(`./gravacoes/${codigo}.json`, import.meta.url), "utf8")) as Gravacao;
}

export function respostaDoJev(escolha: string, probabilidades: Record<string, number>, noul: number, confianca = 0.9): RespostaDoJev {
  return {
    model: "jev-1.14.0",
    answers: {
      classe: { type: "choice", choice: escolha, confidence: confianca, probabilities: probabilidades },
      alguma: { type: "noul", noul },
    },
    usage: { input_tokens: 100, output_tokens: 10 },
  };
}

export function cod(texto: string): CodigoLegado {
  const codigo = lerCodigo(texto);
  if (!codigo.ok) throw new Error(codigo.problema);
  return codigo.valor;
}
