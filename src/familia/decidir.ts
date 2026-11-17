import type { ClasseCatmat, FamiliaSugerida } from "../contrato";
import { NENHUMA, type BrutoDoJev } from "./pergunta";

/**
 * Quando a sugestão de classe sai. As duas respostas do Jev têm de concordar: o Noul
 * companheiro diz que alguma classe serve, e o Choice dá a ela probabilidade suficiente.
 * Qualquer outro caso é "nenhuma".
 */
export interface Regra {
  versao: string;
  noulMinimo: number;
  escolhaMinima: number;
}

export const REGRA: Regra = { versao: "regra-1", noulMinimo: 0.7, escolhaMinima: 0.5 };

export type RespostaDoJevParaARegra = Pick<BrutoDoJev, "escolha" | "probabilidadeDaEscolha" | "noul">;

/** A classe que a regra sugere, ou `nenhuma`. */
export function classeSugerida(jev: RespostaDoJevParaARegra, regra: Regra = REGRA): ClasseCatmat | typeof NENHUMA {
  const { escolha, probabilidadeDaEscolha, noul } = jev;
  return escolha !== NENHUMA && noul >= regra.noulMinimo && probabilidadeDaEscolha >= regra.escolhaMinima ? escolha : NENHUMA;
}

const arredondar = (n: number): number => Math.round(n * 10_000) / 10_000;

export type Decisao = Pick<FamiliaSugerida, "resposta" | "probabilidade" | "confianca">;

/**
 * Classe: `probabilidade` é a que o Choice dá a ela. Nenhuma: é a que o Noul dá a "nenhuma
 * classe serve" (um menos o Noul). Num "nenhuma" por falta de certeza ela fica baixa, e diz
 * que o Jev não afirma que nenhuma classe serve. `confianca` é sempre a do Choice.
 */
export function decidir(bruto: BrutoDoJev, regra: Regra = REGRA): Decisao {
  const classe = classeSugerida(bruto, regra);
  if (classe !== NENHUMA) {
    return { resposta: { tipo: "classe", classe }, probabilidade: bruto.probabilidadeDaEscolha, confianca: bruto.confiancaDaEscolha };
  }
  return { resposta: { tipo: "nenhuma" }, probabilidade: arredondar(1 - bruto.noul), confianca: bruto.confiancaDaEscolha };
}
