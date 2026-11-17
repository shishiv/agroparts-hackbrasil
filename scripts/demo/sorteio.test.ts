import { describe, expect, it } from "vitest";
import { Sorteio } from "./sorteio";

describe("Sorteio", () => {
  it("dá a mesma sequência para a mesma semente", () => {
    const a = new Sorteio(20261116);
    const b = new Sorteio(20261116);
    const sequenciaA = Array.from({ length: 5 }, () => a.inteiro(0, 1000));
    const sequenciaB = Array.from({ length: 5 }, () => b.inteiro(0, 1000));
    expect(sequenciaA).toEqual(sequenciaB);
    expect(sequenciaA).toEqual([249, 103, 487, 381, 517]);
  });

  it("muda a sequência quando a semente muda", () => {
    expect(new Sorteio(1).proximo()).not.toBe(new Sorteio(2).proximo());
  });

  it("sorteia inteiros dentro dos limites, extremos incluídos", () => {
    const sorteio = new Sorteio(7);
    const vistos = new Set(Array.from({ length: 300 }, () => sorteio.inteiro(3, 5)));
    expect([...vistos].sort()).toEqual([3, 4, 5]);
  });

  it("embaralha sem perder nem repetir itens", () => {
    const embaralhado = new Sorteio(9).embaralhar([1, 2, 3, 4, 5, 6]);
    expect([...embaralhado].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("escolhe com peso zero nunca o item de peso zero", () => {
    const sorteio = new Sorteio(5);
    const itens = Array.from({ length: 200 }, () => sorteio.escolherComPeso([["a", 0], ["b", 1]] as const));
    expect(new Set(itens)).toEqual(new Set(["b"]));
  });
});
