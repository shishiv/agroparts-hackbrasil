/**
 * Maiúsculas sem acento, uma unidade UTF-16 para cada unidade do original.
 * Por isso a posição de um trecho no texto normalizado é a posição no original.
 *
 * Só usa `toUpperCase` e uma tabela própria de acentos. Nada que dependa de
 * localidade: o Bun, o Safari e o Chrome têm de dar a mesma chave.
 */

const ACENTOS: readonly (readonly [string, string])[] = [
  ["ÀÁÂÃÄÅàáâãäå", "A"],
  ["Çç", "C"],
  ["ÈÉÊËèéêë", "E"],
  ["ÌÍÎÏìíîï", "I"],
  ["Ññ", "N"],
  ["ÒÓÔÕÖòóôõö", "O"],
  ["ÙÚÛÜùúûü", "U"],
  ["Ýýÿ", "Y"],
  ["×", "X"],
];

const TRACOS = "\u2010\u2011\u2012\u2013\u2014\u2015\u2212";

/** Hífen opcional e espaços de largura zero: invisíveis no texto, mas partem a palavra. */
const INVISIVEIS = "\u00ad\u200b\u200c\u200d\u2060\ufeff";

const SEM_ACENTO: ReadonlyMap<string, string> = new Map(
  ACENTOS.flatMap(([letras, base]) => [...letras].map((letra) => [letra, base] as const)),
);

function normalizarUnidade(unidade: string): string {
  const sem = SEM_ACENTO.get(unidade);
  if (sem !== undefined) return sem;
  if (TRACOS.includes(unidade)) return "-";
  if (/\s/.test(unidade) || INVISIVEIS.includes(unidade)) return " ";
  const codigo = unidade.charCodeAt(0);
  const larguraCheia = codigo >= 0xff01 && codigo <= 0xff5e;
  if (larguraCheia) return normalizarUnidade(String.fromCharCode(codigo - 0xfee0));
  const maiuscula = unidade.toUpperCase();
  return maiuscula.length === 1 ? maiuscula : unidade;
}

export function normalizar(texto: string): string {
  let saida = "";
  for (let i = 0; i < texto.length; i++) saida += normalizarUnidade(texto.charAt(i));
  return saida;
}
