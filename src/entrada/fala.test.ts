import { describe, expect, it } from "bun:test";
import { motor } from "../motor";
import { falaParaTexto } from "./fala";

const lido = (texto: string) => motor.ler({ texto, origem: { tipo: "digitado" } });

const chaveDe = (texto: string): string => {
  const leitura = lido(texto);
  if (leitura.decisao !== "resolve") throw new Error(`"${texto}" não resolve: ${leitura.decisao}`);
  return leitura.chave;
};

describe("números e letras ditos viram caracteres", () => {
  it.each([
    ["seis três um zero", "6310"],
    ["dois zê", "2Z"],
    ["cê três", "C3"],
    ["dois erre esse", "2RS"],
    ["zê zê", "ZZ"],
    ["dois erre esse agá", "2RSH"],
    ["seis zero zero quatro", "6004"],
    ["tres", "3"],
    ["Seis TRÊS Um Zero", "6310"],
  ])("%s é %s", (dito, escrito) => {
    expect(falaParaTexto(dito)).toBe(escrito);
  });

  it("dezenas ditas por extenso entram na conta: sessenta e dois zero cinco é 6205", () => {
    expect(falaParaTexto("sessenta e dois zero cinco")).toBe("6205");
    expect(falaParaTexto("seis dois dez")).toBe("6210");
    expect(falaParaTexto("trinta e um")).toBe("31");
  });

  it("deixa o resto da frase como está", () => {
    expect(falaParaTexto("Rolamento seis dois zero cinco dos fundos")).toBe("Rolamento 6205 dos fundos");
    expect(falaParaTexto("preciso do rolamento da bomba")).toBe("preciso do rolamento da bomba");
  });

  it("'um', 'uma', 'esse' e 'ele' só viram caractere ao lado de uma soletração firme", () => {
    expect(falaParaTexto("um rolamento")).toBe("um rolamento");
    expect(falaParaTexto("troquei esse rolamento ontem")).toBe("troquei esse rolamento ontem");
    expect(falaParaTexto("seis três um zero")).toBe("6310");
    expect(falaParaTexto("seis um um")).toBe("611");
    expect(falaParaTexto("dois erre esse")).toBe("2RS");
    expect(falaParaTexto("ele vê")).toBe("ele vê");
  });

  it("sem pausa na fala, números e letras ficam colados e a pessoa separa no campo", () => {
    expect(falaParaTexto("seis dois zero cinco dois erre esse")).toBe("62052RS");
  });
});

describe("a pausa entre dois códigos deixa de ser vírgula", () => {
  it.each([
    ["Rolamento seis três um zero, dois zê, cê três.", "Rolamento 6310 2Z C3"],
    [" Rolamento 6202, 2RS.", "Rolamento 6202 2RS"],
    ["Rolamento 6304, ZZ, C3.", "Rolamento 6304 ZZ C3"],
    ["Rolamento 6.203, 2Z.", "Rolamento 6.203 2Z"],
    ["Rolamento 6205 2RS", "Rolamento 6205 2RS"],
  ])("%s", (ouvido, esperado) => {
    expect(falaParaTexto(ouvido)).toBe(esperado);
  });

  it("mantém a vírgula entre uma palavra e um código", () => {
    expect(falaParaTexto("Rolamento, 6205 2RS, da bomba.")).toBe("Rolamento, 6205 2RS, da bomba");
  });

  it("texto vazio ou só pontuação dá texto vazio", () => {
    expect(falaParaTexto("")).toBe("");
    expect(falaParaTexto(" . ")).toBe("");
  });
});

describe("o texto que sai da fala cai na mesma peça que a designação escrita", () => {
  it.each([
    ["Rolamento seis três um zero, dois zê, cê três.", "Rolamento 6310 2Z C3"],
    ["Rolamento 6202, 2RS.", "Rolamento 6202 2RS"],
    ["Rolamento 6304, ZZ, C3.", "Rolamento 6304 ZZ C3"],
    ["rolamento sessenta e dois zero cinco, dois erre esse", "Rolamento 6205 2RS"],
    ["Rolamento seis zero zero seis, erre esse", "Rolamento 6006 RS"],
  ])("%s", (ouvido, escrito) => {
    expect(chaveDe(falaParaTexto(ouvido))).toBe(chaveDe(escrito));
  });

  it("sem tirar a pausa, o motor manda para uma pessoa", () => {
    expect(lido("Rolamento 6310, 2Z, C3.").decisao).toBe("revisa");
    expect(lido(falaParaTexto("Rolamento 6310, 2Z, C3.")).decisao).toBe("resolve");
  });
});
