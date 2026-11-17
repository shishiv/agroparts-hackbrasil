import { describe, expect, it } from "vitest";
import type { Atributo } from "../../src/contrato";
import { decodificar, partirTexto } from "./texto";

const atributo = (nome: string, inicio: number, fim: number): Atributo => ({ nome, valor: "", trecho: { inicio, fim } });

describe("partirTexto", () => {
  const texto = "ROL 6210 2RS C3";
  const atributos = [atributo("serie", 4, 8), atributo("vedacao", 9, 12), atributo("folga", 13, 15)];

  it("marca os trechos lidos e guarda o resto como está", () => {
    expect(partirTexto(texto, atributos)).toEqual([
      { texto: "ROL ", marcado: false },
      { texto: "6210", marcado: true },
      { texto: " ", marcado: false },
      { texto: "2RS", marcado: true },
      { texto: " ", marcado: false },
      { texto: "C3", marcado: true },
    ]);
  });

  it("juntando as partes sai o texto original", () => {
    expect(
      partirTexto(texto, atributos)
        .map((p) => p.texto)
        .join(""),
    ).toBe(texto);
  });

  it("com nomes, marca só esses atributos", () => {
    const marcadas = partirTexto(texto, atributos, ["vedacao"]).filter((p) => p.marcado);
    expect(marcadas).toEqual([{ texto: "2RS", marcado: true }]);
  });

  it("ignora trecho vazio, trecho fora do texto e trecho sobreposto", () => {
    const partes = partirTexto(texto, [atributo("folga", 15, 15), atributo("serie", 4, 99), atributo("a", 4, 8), atributo("b", 6, 10)]);
    expect(partes.filter((p) => p.marcado)).toEqual([{ texto: "6210", marcado: true }]);
  });

  it("sem atributo, devolve o texto numa parte só, e texto vazio não tem parte", () => {
    expect(partirTexto(texto, [])).toEqual([{ texto, marcado: false }]);
    expect(partirTexto("", [])).toEqual([]);
  });
});

describe("decodificar", () => {
  it("lê UTF-8", () => {
    expect(decodificar(new TextEncoder().encode("RÍGIDO;ação").buffer)).toBe("RÍGIDO;ação");
  });

  it("lê o que o Excel grava em Windows-1252, em vez de trocar o acento por �", () => {
    const bytes = Uint8Array.from([0x52, 0xcd, 0x47, 0x49, 0x44, 0x4f, 0x3b, 0x61, 0xe7, 0xe3, 0x6f]);
    expect(decodificar(bytes.buffer)).toBe("RÍGIDO;ação");
  });
});
