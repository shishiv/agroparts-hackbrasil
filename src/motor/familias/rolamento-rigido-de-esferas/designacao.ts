import type { Trecho } from "../../../contrato";

/**
 * A designação base de um rolamento rígido de esferas da série 6 (ISO 15):
 * os dígitos que dizem a série e o furo. É a única forma que a família aceita.
 */
const QUATRO_DIGITOS = /^6[023489]\d\d$/;
const CINCO_DIGITOS = /^(?:160|161|618|619|622|623|630)\d\d$/;
const MINIATURA = /^(?:60[4-9]|62[3-9]|63[3-9])$/;

/** Maior código de furo que a família aceita: 40 é o furo de 200 mm. O que passa disso é erro de digitação ou um número que não é rolamento. */
const MAIOR_CODIGO_DE_FURO = 40;

export function ehDesignacaoDaFamilia(digitos: string): boolean {
  const comFuro = QUATRO_DIGITOS.test(digitos) || CINCO_DIGITOS.test(digitos);
  if (comFuro) return Number(digitos.slice(-2)) <= MAIOR_CODIGO_DE_FURO;
  return MINIATURA.test(digitos);
}

/** Furo em milímetros: os dois últimos dígitos dão o código do furo; na miniatura, o último dígito é o furo. */
export function furoDaDesignacao(digitos: string): number {
  if (digitos.length === 3) return Number(digitos.slice(2));
  const codigo = Number(digitos.slice(-2));
  const abaixoDeQuatro = [10, 12, 15, 17];
  return abaixoDeQuatro[codigo] ?? codigo * 5;
}

export const SERIES_EM_ORDEM = [
  "60xx",
  "62xx",
  "63xx",
  "64xx",
  "68xx",
  "69xx",
  "6xx (miniatura)",
  "160xx",
  "161xx",
  "618xx",
  "619xx",
  "622xx",
  "623xx",
  "630xx",
] as const;

export function serieDaDesignacao(digitos: string): string {
  if (digitos.length === 3) return "6xx (miniatura)";
  return `${digitos.slice(0, digitos.length === 4 ? 2 : 3)}xx`;
}

/** Palavra que, logo depois de um número, diz que ele é uma medida e não uma referência. */
const UNIDADES = new Set([
  "MM", "CM", "KM", "POL", "KN", "KG", "KGF", "RPM", "KW", "CV", "HP", "HZ", "BAR", "PSI", "ML", "MICRA", "MICRAS", "MICRON",
]);

export interface Numero {
  digitos: string;
  trecho: Trecho;
}

const alfanumerico = (c: string): boolean => /[A-Z0-9]/.test(c);
const digito = (c: string): boolean => c >= "0" && c <= "9" && c !== "";

/**
 * Os números do texto que podem ser uma referência de fabricante: sequências
 * de dígitos (com ponto de milhar) que não estão grudadas em letra, não são
 * parte de decimal ou de medida em `AxBxC`, e não vêm seguidas de unidade.
 * `n` já está normalizado.
 */
export function numerosDeReferencia(n: string): Numero[] {
  const achados: Numero[] = [];
  for (const m of n.matchAll(/\d+(?:\.\d{3})*/g)) {
    const inicio = m.index;
    const fim = inicio + m[0].length;
    const antes = n.charAt(inicio - 1);
    const depois = n.charAt(fim);
    if (alfanumerico(antes)) continue;
    if ((antes === "," || antes === ".") && digito(n.charAt(inicio - 2))) continue;
    if (depois === "," && digito(n.charAt(fim + 1))) continue;
    if (antes === "X" && digito(n.charAt(inicio - 2))) continue;
    if (depois === "X" && digito(n.charAt(fim + 1))) continue;
    const unidade = /^ *([A-Z]+)/.exec(n.slice(fim))?.[1];
    if (unidade !== undefined && UNIDADES.has(unidade)) continue;
    achados.push({ digitos: m[0].replaceAll(".", ""), trecho: { inicio, fim } });
  }
  return achados;
}
