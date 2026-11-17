import type { Trecho } from "../../../contrato";

/**
 * O que cada parte do texto é.
 *
 * - `texto`: o motor conhece cada palavra dele.
 * - `material`: o campo de material do CATMAT, que só pode dizer aço.
 * - `aplicacao`: onde a peça é usada, no formato do CATMAT ("TIPO USO: MOTORES ELÉTRICOS"). Aceita as palavras
 *   do texto e as de equipamento que `explicacao.ts` lista. Nada dele muda a chave.
 */
export type Papel = "texto" | "material" | "aplicacao";

export interface Campo {
  papel: Papel;
  /** Posição onde o valor do campo começa e onde termina, no texto original. */
  inicio: number;
  fim: number;
  /** O rótulo do campo ("REFERENCIA FABRICANTE 1"), ou `null` no texto livre. */
  rotulo: Trecho | null;
}

const ROTULOS = new RegExp(
  "(?:^|,) *((?:TIPO DE USO|TIPO USO|APLICACAO|CARACTERISTICAS +ADICIONAIS|DIAMETRO +INTERNO|DIAMETRO +EXTERNO|LARGURA|ALTURA|ESPESSURA|MATERIAL|REFERENCIA +FABRICANTE|REFERENCIA|NORMAS +TECNICAS|CAPACIDADE +CARGA|ROTACAO|NOME)(?: +\\d+)?) *:",
  "gd",
);

function papelDoRotulo(rotulo: string): Papel {
  if (/^(?:TIPO DE USO|TIPO USO|APLICACAO)/.test(rotulo)) return "aplicacao";
  return rotulo.startsWith("MATERIAL") ? "material" : "texto";
}

/**
 * Divide o texto pelos rótulos do CATMAT ("TIPO USO:", "REFERÊNCIA FABRICANTE 1:"). O que vem antes
 * do primeiro rótulo, ou o texto inteiro quando não há rótulo, é texto. Uma vírgula sozinha não
 * muda de campo: "MOTORES ELÉTRICOS WEG, BRASIL E SIMILARES" continua no campo de aplicação.
 */
export function dividirEmCampos(n: string): Campo[] {
  const rotulos = [...n.matchAll(ROTULOS)].flatMap((m) => {
    const grupo = m.indices?.[1];
    return grupo && m[1] ? [{ nome: m[1], inicio: grupo[0], fim: grupo[1] }] : [];
  });
  const [primeiro] = rotulos;
  const campos: Campo[] = [{ papel: "texto", inicio: 0, fim: primeiro?.inicio ?? n.length, rotulo: null }];
  rotulos.forEach((rotulo, i) => {
    campos.push({
      papel: papelDoRotulo(rotulo.nome),
      inicio: rotulo.fim,
      fim: rotulos[i + 1]?.inicio ?? n.length,
      rotulo: { inicio: rotulo.inicio, fim: rotulo.fim },
    });
  });
  return campos;
}

export const emAplicacao = (campos: readonly Campo[], posicao: number): boolean =>
  campos.some((c) => c.papel === "aplicacao" && posicao >= c.inicio && posicao < c.fim);
