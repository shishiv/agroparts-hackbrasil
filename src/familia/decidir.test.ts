import { describe, expect, it } from "vitest";
import { classeSugerida, decidir, REGRA } from "./decidir";
import { NENHUMA, type BrutoDoJev } from "./pergunta";
import { classe } from "./teste-de-apoio";

const CORREIAS = classe("3030", "CORREIAS").codigo;

function bruto(parte: Partial<BrutoDoJev>): BrutoDoJev {
  return { escolha: CORREIAS, probabilidadeDaEscolha: 0.9, confiancaDaEscolha: 0.89, noul: 0.95, modelo: "jev-1.14.0", ...parte };
}

describe("decidir", () => {
  it("sugere a classe quando o Noul diz que alguma serve e o Choice tem probabilidade suficiente", () => {
    expect(decidir(bruto({}))).toEqual({
      resposta: { tipo: "classe", classe: "3030" },
      probabilidade: 0.9,
      confianca: 0.89,
    });
  });

  it("aceita os dois limiares exatamente no valor", () => {
    expect(classeSugerida(bruto({ noul: REGRA.noulMinimo, probabilidadeDaEscolha: REGRA.escolhaMinima }))).toBe("3030");
  });

  it("diz nenhuma, com a probabilidade do Noul, quando o Noul diz que nenhuma classe serve", () => {
    expect(decidir(bruto({ noul: 0.07 }))).toEqual({ resposta: { tipo: "nenhuma" }, probabilidade: 0.93, confianca: 0.89 });
  });

  it("diz nenhuma quando o Choice não chega ao mínimo, e a probabilidade baixa mostra que o Jev não afirma isso", () => {
    expect(decidir(bruto({ probabilidadeDaEscolha: 0.4, noul: 0.95 }))).toEqual({
      resposta: { tipo: "nenhuma" },
      probabilidade: 0.05,
      confianca: 0.89,
    });
  });

  it("diz nenhuma quando o Noul fica abaixo do mínimo", () => {
    expect(classeSugerida(bruto({ noul: 0.69 }))).toBe(NENHUMA);
  });

  it("diz nenhuma quando o Choice escolheu nenhuma, mesmo com o Noul alto", () => {
    expect(classeSugerida(bruto({ escolha: NENHUMA, noul: 0.99 }))).toBe(NENHUMA);
  });

  it("não deixa o erro de ponto flutuante de um menos o Noul aparecer", () => {
    expect(decidir(bruto({ noul: 0.07 })).probabilidade).toBe(0.93);
  });
});
