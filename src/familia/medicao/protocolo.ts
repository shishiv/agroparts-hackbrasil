import type { Regra } from "../decidir";
import { REGRA } from "../decidir";

/**
 * O que a medição faz e que resultado decide o quê. Foi escrito e commitado antes da primeira
 * chamada ao Jev sobre a amostra, e `docs/medicao/familia.md` o repete a partir deste arquivo.
 */
export interface Protocolo {
  versao: string;
  /** Muda a ordem em que os itens de cada classe são sorteados. */
  semente: string;
  itensPorClasse: number;
  /** Classes que o Jev recebe como opção. O certo é a classe que o CATMAT dá ao item. */
  classesDentro: readonly string[];
  /** Classes que o Jev não recebe como opção. O certo é "nenhuma". */
  classesFora: readonly string[];
  /** Itens de classes oferecidas que são repetidos com as opções em ordem invertida. */
  itensNaInversao: number;
  regra: Regra;
  limiares: {
    /** Das sugestões de classe que a regra emite para itens de classes oferecidas, a parte que bate com a classe do CATMAT. */
    precisaoDasSugestoes: number;
    /** Dos itens de classes oferecidas, a parte que recebe uma sugestão de classe. */
    cobertura: number;
    /** Dos itens de classes não oferecidas, a parte que termina em "nenhuma". */
    controlesEmNenhuma: number;
    /** Dos itens repetidos com a ordem invertida, a parte que mantém a mesma decisão. */
    concordanciaAoInverter: number;
    /** Uma classe com acerto da escolha abaixo disto é marcada como fraca. */
    acertoMinimoPorClasse: number;
  };
}

export const PROTOCOLO: Protocolo = {
  versao: "medicao-familia-1",
  semente: "familia-jev-hackbrasil-2026",
  itensPorClasse: 10,
  classesDentro: [
    "3020", "3030", "3040", "3110", "3120", "3130", "4010", "4320", "4710", "4720",
    "4810", "4820", "5305", "5306", "5330", "5360", "5365", "6105", "6145", "9150",
  ],
  classesFora: ["7110", "7510", "7930"],
  itensNaInversao: 20,
  regra: REGRA,
  limiares: {
    precisaoDasSugestoes: 0.85,
    cobertura: 0.6,
    controlesEmNenhuma: 0.8,
    concordanciaAoInverter: 0.85,
    acertoMinimoPorClasse: 0.5,
  },
};
