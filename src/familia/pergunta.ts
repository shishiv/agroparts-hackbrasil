import type { ChoiceQuestion, ChoiceResponse, NoulQuestion, NoulResponse, Usage } from "@typesafe-ai/sdk";
import type { ClasseCatmat, NaoVazia } from "../contrato";
import type { Classe } from "./classes";

/** Versão pinada: os limiares da regra foram escolhidos para ela, e um alias muda sem aviso. */
export const MODELO_DO_JEV = "jev-1.14.0";

export const NENHUMA = "nenhuma";

export interface PedidoAoJev {
  readonly state: { readonly descricao: string };
  readonly questions: { readonly classe: ChoiceQuestion; readonly alguma: NoulQuestion };
}

export interface RespostaDoJev {
  readonly model: string;
  readonly answers: { readonly classe: ChoiceResponse; readonly alguma: NoulResponse };
  readonly usage: Usage;
}

/** O que o Jev viu e respondeu, já ligado a uma classe do CATMAT ou a "nenhuma". */
export interface BrutoDoJev {
  escolha: ClasseCatmat | typeof NENHUMA;
  probabilidadeDaEscolha: number;
  confiancaDaEscolha: number;
  noul: number;
  modelo: string;
}

/**
 * O nome da opção leva o código e o nome da classe, porque o Jev lê os nomes.
 * Um nome só de dígitos iria para o começo do objeto, em ordem crescente, e a ordem das opções se perderia.
 */
export const rotuloDaClasse = (classe: Classe): string => `${classe.codigo} ${classe.nome}`;

/** `classes` já vem na ordem em que o Jev deve ler as opções. */
export function montarPedido(descricao: string, classes: NaoVazia<Classe>): PedidoAoJev {
  const opcoes: Record<string, string> = {};
  for (const classe of classes) opcoes[rotuloDaClasse(classe)] = classe.nomeGrupo;
  opcoes[NENHUMA] = "Nenhuma das classes oferecidas descreve este item.";

  return {
    state: { descricao },
    questions: {
      classe: {
        type: "choice",
        instructions: {
          question:
            "Em qual classe do CATMAT, o catálogo de materiais do governo federal do Brasil, se enquadra o item descrito em `descricao`?",
          focus:
            "Escolha pela peça ou produto que o texto nomeia, que costuma ser a primeira palavra. Não escolha pelo material de que o item é feito nem pelo equipamento em que é usado.",
        },
        criteria: opcoes,
      },
      alguma: {
        type: "noul",
        instructions: {
          question: "Alguma das classes de `classes` descreve o tipo de item descrito em `descricao`?",
          classes: classes.map(rotuloDaClasse),
        },
        criteria: {
          true: "O item é de um tipo que pelo menos uma das classes listadas cobre.",
          false: "O item é de um tipo que nenhuma das classes listadas cobre.",
        },
      },
    },
  };
}

const estaEntre0e1 = (n: number): boolean => Number.isFinite(n) && n >= 0 && n <= 1;

/** Fronteira com a rede: confere que a resposta fala das opções que o pedido ofereceu. */
export function interpretar(classes: readonly Classe[], resposta: RespostaDoJev): BrutoDoJev {
  const { classe: escolhida, alguma } = resposta.answers;
  const porRotulo = new Map<string, ClasseCatmat | typeof NENHUMA>(classes.map((c) => [rotuloDaClasse(c), c.codigo]));
  porRotulo.set(NENHUMA, NENHUMA);

  const escolha = porRotulo.get(escolhida.choice);
  if (escolha === undefined) throw new Error(`o Jev escolheu uma opção que o pedido não ofereceu: "${escolhida.choice}"`);
  const probabilidade = escolhida.probabilities[escolhida.choice];
  if (probabilidade === undefined || !estaEntre0e1(probabilidade)) {
    throw new Error("a resposta do Jev não traz a probabilidade da opção escolhida");
  }
  if (!estaEntre0e1(escolhida.confidence) || !estaEntre0e1(alguma.noul)) {
    throw new Error("a resposta do Jev traz confiança ou probabilidade fora de 0 a 1");
  }
  return {
    escolha,
    probabilidadeDaEscolha: probabilidade,
    confiancaDaEscolha: escolhida.confidence,
    noul: alguma.noul,
    modelo: resposta.model,
  };
}
