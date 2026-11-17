import { describe, expect, it } from "vitest";
import type { Classe } from "./classes";
import { interpretar, montarPedido, NENHUMA, rotuloDaClasse } from "./pergunta";
import { classe, classesDaGravacao, lerGravacao, respostaDoJev } from "./teste-de-apoio";

const CORREIAS = classe("3030", "CORREAME, CORREIAS DE TRANSMISSÃO", "TRANSMISSÃO");
const ROLAMENTOS = classe("3110", "ROLAMENTOS ANTIFRICÇÃO NÃO MONTADOS", "ROLAMENTOS E MANCAIS");
const VEDACAO = classe("5330", "GAXETAS E OUTROS MATERIAIS PARA VEDAÇÃO", "FERRAGENS");

describe("montarPedido", () => {
  it("oferece cada classe com o código no nome e o grupo na descrição, e a opção nenhuma por último", () => {
    const pedido = montarPedido("CORREIA V B 58", [CORREIAS, ROLAMENTOS]);
    expect(pedido.state).toEqual({ descricao: "CORREIA V B 58" });
    expect(Object.entries(pedido.questions.classe.criteria)).toEqual([
      ["3030 CORREAME, CORREIAS DE TRANSMISSÃO", "TRANSMISSÃO"],
      ["3110 ROLAMENTOS ANTIFRICÇÃO NÃO MONTADOS", "ROLAMENTOS E MANCAIS"],
      ["nenhuma", "Nenhuma das classes oferecidas descreve este item."],
    ]);
  });

  it("guarda a ordem das classes, também quando a lista vem invertida", () => {
    const nomes = (classes: readonly [Classe, ...Classe[]]) => Object.keys(montarPedido("X", classes).questions.classe.criteria);
    expect(nomes([ROLAMENTOS, CORREIAS])).toEqual([rotuloDaClasse(ROLAMENTOS), rotuloDaClasse(CORREIAS), NENHUMA]);
  });

  it("faz o Noul companheiro olhar a mesma lista de classes", () => {
    const pedido = montarPedido("X", [CORREIAS, VEDACAO]);
    expect(pedido.questions.alguma).toMatchObject({
      type: "noul",
      instructions: { classes: ["3030 CORREAME, CORREIAS DE TRANSMISSÃO", "5330 GAXETAS E OUTROS MATERIAIS PARA VEDAÇÃO"] },
    });
  });
});

describe("interpretar", () => {
  const classes = [CORREIAS, ROLAMENTOS];
  const rotulo = rotuloDaClasse(CORREIAS);

  it("liga a opção escolhida à classe do CATMAT e leva junto a probabilidade e o Noul", () => {
    expect(interpretar(classes, respostaDoJev(rotulo, { [rotulo]: 0.66, [NENHUMA]: 0.34 }, 0.96))).toEqual({
      escolha: "3030",
      probabilidadeDaEscolha: 0.66,
      confiancaDaEscolha: 0.9,
      noul: 0.96,
      modelo: "jev-1.14.0",
    });
  });

  it("entende a opção nenhuma", () => {
    expect(interpretar(classes, respostaDoJev(NENHUMA, { [NENHUMA]: 0.8 }, 0.1)).escolha).toBe(NENHUMA);
  });

  it("recusa uma opção que o pedido não ofereceu", () => {
    expect(() => interpretar(classes, respostaDoJev("9999 OUTRA", { "9999 OUTRA": 1 }, 0.9))).toThrow(/não ofereceu/);
  });

  it("recusa probabilidade fora de 0 a 1 e Noul que não é número", () => {
    expect(() => interpretar(classes, respostaDoJev(rotulo, { [rotulo]: 1.2 }, 0.9))).toThrow(/probabilidade/);
    expect(() => interpretar(classes, respostaDoJev(rotulo, { [rotulo]: 0.9 }, Number.NaN))).toThrow(/fora de 0 a 1/);
    expect(() => interpretar(classes, respostaDoJev(rotulo, {}, 0.9))).toThrow(/não traz a probabilidade/);
  });

  it("lê uma resposta gravada do Jev de verdade", () => {
    const { resposta } = lerGravacao("10032");
    expect(interpretar(classesDaGravacao(), resposta)).toMatchObject({ escolha: "3030", probabilidadeDaEscolha: 0.96, noul: 0.98 });
  });
});
