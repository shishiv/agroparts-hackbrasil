import type { ErroDeLinha, Lido } from "../../contrato";
import { limparNome } from "../classes";

/** Um item público do CATMAT, com a classe que o próprio CATMAT lhe dá. */
export interface ItemPublico {
  codigoItem: number;
  codigoClasse: string;
  nomePdm: string;
  descricao: string;
}

export interface ClasseDaAmostra {
  codigo: string;
  nome: string;
  grupo: string;
  /** Verdadeiro quando o Jev recebe a classe como opção. Falso quando o certo é "nenhuma". */
  dentro: boolean;
  /** Quantos itens ativos, sem sinal de dado pessoal e com descrição diferente, a classe tinha para o sorteio. */
  candidatos: number;
}

export interface Amostra {
  fonte: string;
  consultadoEm: string;
  protocolo: string;
  semente: string;
  classes: readonly ClasseDaAmostra[];
  itens: readonly ItemPublico[];
}

type Objeto = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);

/** Um registro de `4_consultarItemMaterial`. Item inativo ou sem descrição não entra na amostra. */
export function lerItemDaApi(registro: unknown): ItemPublico | null {
  if (!ehObjeto(registro) || registro.statusItem !== true) return null;
  const { codigoItem, codigoClasse, nomePdm, descricaoItem } = registro;
  if (typeof codigoItem !== "number" || !Number.isInteger(codigoItem)) return null;
  if (typeof codigoClasse !== "number" || !Number.isInteger(codigoClasse)) return null;
  if (typeof nomePdm !== "string" || typeof descricaoItem !== "string") return null;
  const descricao = descricaoItem.trim();
  if (descricao === "") return null;
  return { codigoItem, codigoClasse: String(codigoClasse), nomePdm: limparNome(nomePdm), descricao };
}

/** FNV-1a de 32 bits sobre as unidades UTF-16: o mesmo número em qualquer motor de JavaScript. */
export function hashDe(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h;
}

const chaveDoTexto = (descricao: string): string => descricao.replace(/\s+/g, " ").trim().toUpperCase();

/** Candidatos de uma classe sem repetir descrição, o primeiro de cada texto pelo menor código. */
export function semRepeticao(itens: readonly ItemPublico[]): ItemPublico[] {
  const vistos = new Set<string>();
  const unicos: ItemPublico[] = [];
  for (const item of [...itens].sort((a, b) => a.codigoItem - b.codigoItem)) {
    const chave = chaveDoTexto(item.descricao);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicos.push(item);
  }
  return unicos;
}

/** Sorteia `quantos` itens pela ordem do hash de semente e código. A lista de entrada não precisa estar ordenada. */
export function sortearItens(candidatos: readonly ItemPublico[], quantos: number, semente: string): ItemPublico[] {
  return semRepeticao(candidatos)
    .map((item) => ({ item, h: hashDe(`${semente}:${item.codigoItem}`) }))
    .sort((a, b) => a.h - b.h || a.item.codigoItem - b.item.codigoItem)
    .slice(0, quantos)
    .map(({ item }) => item)
    .sort((a, b) => a.codigoItem - b.codigoItem);
}

/** Os itens da amostra cujo texto é igual ao de uma descrição que o Jev já viu, como a do cadastro da demo. */
export function itensJaVistos(amostra: Amostra, descricoesVistas: readonly string[]): number[] {
  const vistas = new Set(descricoesVistas.map(chaveDoTexto));
  return amostra.itens.filter((i) => vistas.has(chaveDoTexto(i.descricao))).map((i) => i.codigoItem);
}

export function escreverAmostra(amostra: Amostra): string {
  const linhas = [
    "{",
    `  "fonte": ${JSON.stringify(amostra.fonte)},`,
    `  "consultadoEm": ${JSON.stringify(amostra.consultadoEm)},`,
    `  "protocolo": ${JSON.stringify(amostra.protocolo)},`,
    `  "semente": ${JSON.stringify(amostra.semente)},`,
    '  "classes": [',
    amostra.classes.map((c) => `    ${JSON.stringify(c)}`).join(",\n"),
    "  ],",
    '  "itens": [',
    amostra.itens.map((i) => `    ${JSON.stringify(i)}`).join(",\n"),
    "  ]",
    "}",
  ];
  return `${linhas.join("\n")}\n`;
}

const ARQUIVO = "familia-amostra.json";

export function lerAmostra(texto: string): Lido<Amostra> {
  const erros: ErroDeLinha[] = [];
  const erro = (coluna: string, problema: string): undefined => {
    erros.push({ arquivo: ARQUIVO, linha: 0, coluna, problema });
    return undefined;
  };
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { ok: false, erros: [{ arquivo: ARQUIVO, linha: 0, coluna: "", problema: "JSON inválido" }] };
  }
  if (!ehObjeto(bruto)) {
    return { ok: false, erros: [{ arquivo: ARQUIVO, linha: 0, coluna: "", problema: "esperava um objeto na raiz" }] };
  }
  const textoDe = (campo: string): string => {
    const v = bruto[campo];
    if (typeof v === "string" && v !== "") return v;
    erro(campo, "esperava um texto");
    return "";
  };
  const fonte = textoDe("fonte");
  const consultadoEm = textoDe("consultadoEm");
  const protocolo = textoDe("protocolo");
  const semente = textoDe("semente");

  const classes: ClasseDaAmostra[] = [];
  const codigosDeClasse = new Set<string>();
  const listaDeClasses: unknown[] = Array.isArray(bruto.classes) ? bruto.classes : [];
  if (!Array.isArray(bruto.classes)) erro("classes", "esperava uma lista");
  listaDeClasses.forEach((c, i) => {
    const onde = `classes[${i}]`;
    if (
      !ehObjeto(c) ||
      typeof c.codigo !== "string" ||
      typeof c.nome !== "string" ||
      typeof c.grupo !== "string" ||
      typeof c.dentro !== "boolean" ||
      typeof c.candidatos !== "number"
    ) {
      return void erro(onde, "esperava codigo, nome, grupo, dentro e candidatos");
    }
    if (codigosDeClasse.has(c.codigo)) return void erro(onde, `classe repetida: ${c.codigo}`);
    codigosDeClasse.add(c.codigo);
    classes.push({ codigo: c.codigo, nome: c.nome, grupo: c.grupo, dentro: c.dentro, candidatos: c.candidatos });
  });

  const itens: ItemPublico[] = [];
  const codigosDeItem = new Set<number>();
  const listaDeItens: unknown[] = Array.isArray(bruto.itens) ? bruto.itens : [];
  if (!Array.isArray(bruto.itens)) erro("itens", "esperava uma lista");
  listaDeItens.forEach((item, i) => {
    const onde = `itens[${i}]`;
    if (
      !ehObjeto(item) ||
      typeof item.codigoItem !== "number" ||
      typeof item.codigoClasse !== "string" ||
      typeof item.nomePdm !== "string" ||
      typeof item.descricao !== "string"
    ) {
      return void erro(onde, "esperava codigoItem, codigoClasse, nomePdm e descricao");
    }
    if (!codigosDeClasse.has(item.codigoClasse)) return void erro(onde, `classe ${item.codigoClasse} não está em "classes"`);
    if (codigosDeItem.has(item.codigoItem)) return void erro(onde, `item repetido: ${item.codigoItem}`);
    codigosDeItem.add(item.codigoItem);
    itens.push({ codigoItem: item.codigoItem, codigoClasse: item.codigoClasse, nomePdm: item.nomePdm, descricao: item.descricao });
  });

  const [primeiro, ...resto] = erros;
  if (primeiro) return { ok: false, erros: [primeiro, ...resto] };
  return { ok: true, valor: { fonte, consultadoEm, protocolo, semente, classes, itens } };
}
