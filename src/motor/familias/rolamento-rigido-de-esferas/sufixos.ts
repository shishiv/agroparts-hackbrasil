import type { Trecho } from "../../../contrato";

export type Vedacao = "ABERTO" | "Z" | "ZZ" | "RS" | "2RS";
export const FOLGAS = ["C1", "C2", "C3", "C4", "C5", "CN"] as const;
export type Folga = (typeof FOLGAS)[number];

export const comoFolga = (texto: string): Folga | null => FOLGAS.find((f) => f === texto) ?? null;

export interface Escrito<V> {
  valor: V;
  trecho: Trecho;
}

type CodigoConhecido =
  | { tipo: "vedacao"; valor: Vedacao }
  | { tipo: "folga"; valor: Folga };

/**
 * Os sufixos que a família sabe ler, do jeito que a usina os escreve. Qualquer
 * outro sufixo colado na designação é desconhecido: muda a peça de um jeito
 * que esta tabela não sabe dizer, e o texto vai para revisão.
 */
const ESCRITAS: readonly (readonly [string, CodigoConhecido])[] = [
  ["ZZ", { tipo: "vedacao", valor: "ZZ" }],
  ["2Z", { tipo: "vedacao", valor: "ZZ" }],
  ["Z", { tipo: "vedacao", valor: "Z" }],
  ["2RSH", { tipo: "vedacao", valor: "2RS" }],
  ["2-RSH", { tipo: "vedacao", valor: "2RS" }],
  ["2RS1", { tipo: "vedacao", valor: "2RS" }],
  ["2-RS1", { tipo: "vedacao", valor: "2RS" }],
  ["2RS", { tipo: "vedacao", valor: "2RS" }],
  ["2-RS", { tipo: "vedacao", valor: "2RS" }],
  ["RSH", { tipo: "vedacao", valor: "RS" }],
  ["RS1", { tipo: "vedacao", valor: "RS" }],
  ["RS", { tipo: "vedacao", valor: "RS" }],
  ...FOLGAS.map((f): readonly [string, CodigoConhecido] => [f, { tipo: "folga", valor: f }]),
];

/** Do mais comprido ao mais curto, para `2RS1` ganhar de `2RS` e `ZZ` de `Z`. */
const TABELA = [...ESCRITAS].sort((a, b) => b[0].length - a[0].length);

/** Nomes de fabricante que podem vir depois da referência. Não são sufixo. */
export const FABRICANTES = new Set(["SKF", "FAG", "NSK", "NTN", "KOYO", "TIMKEN", "NACHI", "INA", "IKO", "NMB", "MRC", "URB", "ZEN", "STEYR", "SNR"]);

/** Palavras curtas de ligação, que encerram a cadeia de sufixos quando vêm depois de um espaço. Coladas por hífen ou barra ("-2Z-E"), são sufixo. */
const LIGACAO = new Set(["DE", "DA", "DO", "DAS", "DOS", "EM", "COM", "UMA", "UM", "PARA", "P", "S", "SEM", "OU", "E", "A", "O", "NA", "NO", "AS", "OS", "POR", "REF", "TIPO", "MARCA"]);

const UNIDADES_DE_MEDIDA = /^ *(?:MM|CM|POL|KN|KG|RPM)(?![A-Z0-9])/;

export interface Cadeia {
  vedacoes: Escrito<Vedacao>[];
  folgas: Escrito<Folga>[];
  desconhecidos: Trecho[];
}

function codigoEm(n: string, posicao: number): { codigo: CodigoConhecido; fim: number } | null {
  for (const [escrita, codigo] of TABELA) {
    if (n.startsWith(escrita, posicao)) return { codigo, fim: posicao + escrita.length };
  }
  return null;
}

const ehAlfanumerico = (c: string): boolean => /[A-Z0-9]/.test(c);

function fimDoToken(n: string, posicao: number): number {
  let fim = posicao;
  while (ehAlfanumerico(n.charAt(fim))) fim++;
  return fim;
}

/**
 * Lê a cadeia de sufixos que vem logo depois da designação, em `n` (texto normalizado) a partir de `inicio`.
 *
 * Hífen e barra colados juntam. Vírgula, ponto-e-vírgula, parêntese, e hífen ou barra com espaço dos dois
 * lados, encerram. Também encerram: medida (`60X130X31`, `60 MM`), nome de fabricante, palavra de ligação
 * depois de espaço, palavra de quatro letras ou mais e número solto.
 *
 * São sufixo desconhecido: um código colado em outras letras ("ZZNR") e uma vedação escrita duas vezes
 * ("Z Z", que pode ser ZZ).
 */
export function lerCadeia(n: string, inicio: number): Cadeia {
  const cadeia: Cadeia = { vedacoes: [], folgas: [], desconhecidos: [] };
  let p = inicio;
  while (p < n.length) {
    const c = n.charAt(p);
    if (c === " ") {
      let q = p;
      while (n.charAt(q) === " ") q++;
      const ponte = n.charAt(q);
      if ((ponte === "-" || ponte === "/") && (n.charAt(q + 1) === " " || q + 1 >= n.length)) break;
      p = q;
      continue;
    }
    if (c === "-" || c === "/") {
      if (n.charAt(p + 1) === " " || p + 1 >= n.length) break;
      p++;
      continue;
    }
    if (!ehAlfanumerico(c)) break;

    const achado = codigoEm(n, p);
    if (achado) {
      const trecho = { inicio: p, fim: achado.fim };
      const colado = ehAlfanumerico(n.charAt(achado.fim)) && !codigoEm(n, achado.fim);
      const { codigo } = achado;
      const repetido = codigo.tipo === "vedacao" && cadeia.vedacoes.some((v) => v.valor === codigo.valor);
      if (colado) {
        const fim = fimDoToken(n, p);
        cadeia.desconhecidos.push({ inicio: p, fim });
        p = fim;
      } else if (repetido) {
        cadeia.desconhecidos.push(trecho);
        p = achado.fim;
      } else {
        if (codigo.tipo === "vedacao") cadeia.vedacoes.push({ valor: codigo.valor, trecho });
        else cadeia.folgas.push({ valor: codigo.valor, trecho });
        p = achado.fim;
      }
      continue;
    }

    const fim = fimDoToken(n, p);
    const token = n.slice(p, fim);
    const soDigitos = /^\d+$/.test(token);
    const soLetras = /^[A-Z]+$/.test(token);
    const medida = /^\d+X\d/.test(token) || UNIDADES_DE_MEDIDA.test(n.slice(fim));
    const depoisDeEspaco = n.charAt(p - 1) === " ";
    const ligacao = depoisDeEspaco && LIGACAO.has(token);
    if (soDigitos || medida || FABRICANTES.has(token) || ligacao || (soLetras && token.length >= 4)) break;
    cadeia.desconhecidos.push({ inicio: p, fim });
    p = fim;
  }
  return cadeia;
}

const TOKEN_SOLTO = /(?:^|[^A-Z0-9])([A-Z0-9]+)(?![A-Z0-9])/gd;

/**
 * Os códigos de vedação ou de folga que o texto escreve fora de qualquer
 * cadeia lida, como o `C3` de "ROL 6310 BOMBA C3". Não dá para saber de que
 * peça são, e ignorá-los juntaria esta peça com a que não os tem.
 */
export function codigosSoltos(n: string, cobertos: readonly Trecho[]): Trecho[] {
  const soltos: Trecho[] = [];
  for (const m of n.matchAll(TOKEN_SOLTO)) {
    const grupo = m.indices?.[1];
    const token = m[1];
    if (!grupo || !token || !TABELA.some(([escrita]) => escrita === token)) continue;
    const [inicio, fim] = grupo;
    if (cobertos.some((c) => inicio >= c.inicio && fim <= c.fim)) continue;
    soltos.push({ inicio, fim });
  }
  return soltos;
}
