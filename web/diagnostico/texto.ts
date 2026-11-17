import type { Atributo } from "../../src/contrato";

export interface Parte {
  texto: string;
  marcado: boolean;
}

/**
 * O texto original em partes, com marcados os trechos que o motor leu. Com `nomes`, só os
 * atributos com esses nomes. Trecho vazio ou sobreposto a outro já marcado fica de fora.
 */
export function partirTexto(descricao: string, atributos: readonly Atributo[], nomes?: readonly string[]): Parte[] {
  const trechos = atributos
    .filter((a) => nomes === undefined || nomes.includes(a.nome))
    .map((a) => a.trecho)
    .filter((t) => t.inicio < t.fim && t.fim <= descricao.length)
    .toSorted((a, b) => a.inicio - b.inicio);
  const partes: Parte[] = [];
  let cursor = 0;
  for (const { inicio, fim } of trechos) {
    if (inicio < cursor) continue;
    if (inicio > cursor) partes.push({ texto: descricao.slice(cursor, inicio), marcado: false });
    partes.push({ texto: descricao.slice(inicio, fim), marcado: true });
    cursor = fim;
  }
  if (cursor < descricao.length) partes.push({ texto: descricao.slice(cursor), marcado: false });
  return partes;
}

/** Os bytes de um CSV da usina: UTF-8, ou Windows-1252 (o que o Excel brasileiro grava) quando não são UTF-8 válido. */
export function decodificar(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
