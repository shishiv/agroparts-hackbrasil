import { readFile } from "node:fs/promises";
import type { ConjuntoDeItens, ItemCatmat } from "../baixar-catmat";

export type Vedacao = "ZZ" | "2RS";
export type Folga = "CN" | "C3";

/** Uma peça do cenário: o item do CATMAT que a define e o que a usina grava no texto. */
export interface Parte {
  id: string;
  item: number;
  serie: string;
  vedacao: Vedacao;
  folga: Folga;
}

export interface Dimensoes {
  interno: number;
  externo: number;
  largura: number;
}

export interface Catmat {
  rolamentos: ReadonlyMap<number, ItemCatmat>;
  outrasPecas: readonly ItemCatmat[];
  consultadoEm: string;
}

export const MARCAS_DE_VEDACAO: Record<Vedacao, readonly string[]> = {
  ZZ: ["ZZ", "2Z"],
  "2RS": ["2RS1", "2RS"],
};

async function lerConjunto(caminho: string): Promise<ConjuntoDeItens> {
  return JSON.parse(await readFile(caminho, "utf8")) as ConjuntoDeItens;
}

export async function carregarCatmat(pasta: string): Promise<Catmat> {
  const rolamentos = await lerConjunto(`${pasta}/rolamento-de-esfera-pdm-11797.json`);
  const outras = await lerConjunto(`${pasta}/outras-pecas.json`);
  return {
    rolamentos: new Map(rolamentos.itens.map((i) => [i.codigoItem, i])),
    outrasPecas: outras.itens,
    consultadoEm: rolamentos.consultadoEm,
  };
}

/** Valor de um campo estruturado da descrição, como "DIÂMETRO INTERNO: 60 MM". */
export function campoDe(descricao: string, rotulo: string): string | null {
  const m = new RegExp(`(?:^|, ?)${rotulo}: ?([^,]*)`).exec(descricao);
  return m?.[1]?.trim() ?? null;
}

function milimetros(descricao: string, rotulo: string): number | null {
  const m = /^(\d+) MM$/.exec(campoDe(descricao, rotulo) ?? "");
  return m?.[1] ? Number(m[1]) : null;
}

export function dimensoesDoItem(item: ItemCatmat): Dimensoes {
  const interno = milimetros(item.descricaoItem, "DIÂMETRO INTERNO");
  const externo = milimetros(item.descricaoItem, "DIÂMETRO EXTERNO");
  const largura = milimetros(item.descricaoItem, "LARGURA");
  if (interno === null || externo === null || largura === null) {
    throw new Error(`item ${item.codigoItem} do CATMAT sem diâmetros e largura estruturados`);
  }
  return { interno, externo, largura };
}

export function referenciaDoItem(item: ItemCatmat): string {
  const m = /REFERÊNCIA FABRICANTE ?\d*: ?([^,]*)/.exec(item.descricaoItem);
  return (m?.[1] ?? "").trim().toUpperCase();
}

/**
 * Confere a peça do cenário contra o registro do CATMAT que a define: o item
 * existe, está ativo, é rígido de uma carreira de esferas, e a referência
 * do fabricante traz a série, a vedação e a folga que o cenário afirma.
 */
export function conferirParte(parte: Parte, item: ItemCatmat | undefined): ItemCatmat {
  if (!item) throw new Error(`peça ${parte.id}: item ${parte.item} não está no CATMAT baixado`);
  const erros: string[] = [];
  if (!item.statusItem) erros.push("item inativo");
  if (!/RÍGIDO/.test(item.descricaoItem)) erros.push("o item não é rígido");
  const referencia = referenciaDoItem(item).replace(/[\s/-]/g, "");
  if (!referencia.includes(parte.serie)) erros.push(`a referência "${referenciaDoItem(item)}" não traz a série ${parte.serie}`);
  if (!MARCAS_DE_VEDACAO[parte.vedacao].some((marca) => referencia.includes(marca))) {
    erros.push(`a referência não traz a vedação ${parte.vedacao}`);
  }
  if (referencia.includes("C3") !== (parte.folga === "C3")) erros.push(`a folga ${parte.folga} não bate com a referência`);
  dimensoesDoItem(item);
  if (erros.length > 0) throw new Error(`peça ${parte.id} contra o item ${parte.item}: ${erros.join("; ")}`);
  return item;
}
