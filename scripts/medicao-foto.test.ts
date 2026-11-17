import { describe, expect, it } from "bun:test";
import { custoDeFotoNova, custoEmDolares, edicoes, mediana, palavras, pontuar, type Verdade } from "./medicao-foto";

const verdade = (extra: Partial<Verdade> = {}): Verdade => ({
  arquivo: "nsk-608z.jpg",
  linhas: ["NSK", "608Z", "JAPAN"],
  ambiguo: [],
  designacao: "608Z",
  ...extra,
});

describe("palavras", () => {
  it("separa por qualquer sinal e ignora acento e caixa", () => {
    expect(palavras("skf 6310-2Z/C3")).toEqual(["SKF", "6310", "2Z", "C3"]);
    expect(palavras("ČSSR\nMADE IN SUÉDE")).toEqual(["CSSR", "MADE", "IN", "SUEDE"]);
  });

  it("o que o modelo marca como ilegível não é palavra", () => {
    expect(palavras("6203 [ilegível] C3")).toEqual(["6203", "C3"]);
  });
});

describe("edicoes", () => {
  it.each([
    ["608", "608Z", 1],
    ["UST", "NSK", 2],
    ["6304", "6304", 0],
    ["", "ABC", 3],
  ])("%s contra %s: %i", (a, b, esperado) => {
    expect(edicoes(a, b)).toBe(esperado);
  });
});

describe("pontuar", () => {
  it("texto igual à peça: nada inventado e a chave sai igual à da designação", () => {
    const p = pontuar(verdade(), "NSK\n608Z\nJAPAN");
    expect(p).toMatchObject({ tokensLidos: 3, lidosTortos: [], inventados: [], designacaoLida: true, desfecho: "chave-certa" });
  });

  it("a ordem das linhas e a pontuação não mudam a conta", () => {
    expect(pontuar(verdade(), "JAPAN, 608Z. NSK").inventados).toEqual([]);
  });

  it("palavra lida torta e palavra inventada são contadas à parte", () => {
    const p = pontuar(verdade(), "JAPAN\n608\nUST\n2RS");
    expect(p.lidosTortos).toEqual([{ lido: "608", verdade: "608Z" }]);
    expect(p.inventados).toEqual(["UST", "2RS"]);
    expect(p.caracteresInventados).toBe(6);
    expect(p.designacaoLida).toBe(false);
    expect(p.desfecho).toBe("recusa");
  });

  it("palavra curta não é lida torta: um sufixo que não está na peça é invenção", () => {
    const p = pontuar(verdade({ linhas: ["6203", "17"], designacao: null }), "6203 C3");
    expect(p.lidosTortos).toEqual([]);
    expect(p.inventados).toEqual(["C3"]);
  });

  it("o que a peça tem mas a foto não deixa ler não conta como inventado", () => {
    const p = pontuar(verdade({ linhas: [], ambiguo: ["530880A"], designacao: null }), "530880A");
    expect(p.inventados).toEqual([]);
  });

  it("foto sem texto: ilegível não é invenção, texto qualquer é", () => {
    const vazia = verdade({ linhas: [], designacao: null });
    expect(pontuar(vazia, "[ilegível]")).toMatchObject({ inventados: [], marcouIlegivel: true, desfecho: "sem-chave-esperada" });
    expect(pontuar(vazia, "NENHUM TEXTO").inventados).toEqual(["NENHUM", "TEXTO"]);
  });

  it("chave diferente da esperada é chave errada", () => {
    const p = pontuar(verdade({ linhas: ["6310 2Z C3"], designacao: "6310 2Z C3" }), "6318 2Z C3");
    expect(p.desfecho).toBe("chave-errada");
  });

  it("texto que resolve sem a peça ter chave esperada é aviso, não acerto", () => {
    const p = pontuar(verdade({ linhas: [], designacao: null }), "6310 2Z C3");
    expect(p.desfecho).toBe("resolve-sem-chave-esperada");
  });

  it("peça aberta: o motor manda para revisão mesmo com o texto certo", () => {
    const p = pontuar(verdade({ linhas: ["NACHI", "6203 C3"], designacao: "6203 C3" }), "NACHI\n6203 C3");
    expect(p).toMatchObject({ designacaoLida: true, chaveEsperada: null, desfecho: "sem-chave-esperada" });
  });
});

describe("custo e tempo", () => {
  it("custo: escrita de cache da imagem mais saída, em dólares", () => {
    const custo = custoEmDolares({ entrada: 2, escritaDeCache: 2550, leituraDeCache: 0, saida: 12 });
    expect(custo).toBeCloseTo(0.000357445, 9);
  });

  it("foto nova paga a imagem como escrita de cache, ainda que a chamada tenha lido do cache", () => {
    const lida = { entrada: 2, escritaDeCache: 0, leituraDeCache: 2550, saida: 12 };
    expect(custoEmDolares(lida)).toBeLessThan(custoDeFotoNova(lida));
    expect(custoDeFotoNova(lida)).toBeCloseTo(0.000357445, 9);
  });

  it("mediana de número par e ímpar de valores", () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 2, 3])).toBe(2.5);
  });
});
