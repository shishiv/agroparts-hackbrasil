import { describe, expect, it } from "vitest";
import type { Amostra } from "./amostra";
import { avaliar, intervaloDeWilson, type RespostaMedida, type Resultados } from "./avaliar";
import { PROTOCOLO } from "./protocolo";

const AMOSTRA: Amostra = {
  fonte: "teste",
  consultadoEm: "2026-11-17",
  protocolo: PROTOCOLO.versao,
  semente: "s",
  classes: [
    { codigo: "3030", nome: "CORREIAS", grupo: "TRANSMISSÃO", dentro: true, candidatos: 50 },
    { codigo: "3110", nome: "ROLAMENTOS", grupo: "ROLAMENTOS E MANCAIS", dentro: true, candidatos: 50 },
    { codigo: "7510", nome: "ARTIGOS PARA ESCRITÓRIO", grupo: "ESCRITÓRIO", dentro: false, candidatos: 50 },
  ],
  itens: [
    { codigoItem: 1, codigoClasse: "3030", nomePdm: "A", descricao: "um" },
    { codigoItem: 2, codigoClasse: "3030", nomePdm: "A", descricao: "dois" },
    { codigoItem: 3, codigoClasse: "3110", nomePdm: "B", descricao: "três" },
    { codigoItem: 4, codigoClasse: "7510", nomePdm: "C", descricao: "quatro" },
    { codigoItem: 5, codigoClasse: "7510", nomePdm: "C", descricao: "cinco" },
  ],
};

function resposta(codigoItem: number, escolha: string, p: number, noul: number, ordem: RespostaMedida["ordem"] = "crescente"): RespostaMedida {
  return { codigoItem, ordem, escolha, probabilidadeDaEscolha: p, noul };
}

const RESULTADOS: Resultados = {
  modelo: "jev-1.14.0",
  chamadas: 7,
  tokensDeEntrada: 1000,
  respostas: [
    resposta(1, "3030", 0.9, 0.95),
    resposta(2, "3110", 0.8, 0.9),
    resposta(3, "3110", 0.4, 0.95),
    resposta(4, "nenhuma", 0.7, 0.1),
    resposta(5, "3030", 0.9, 0.95),
    resposta(1, "3030", 0.85, 0.95, "invertida"),
    resposta(3, "3110", 0.6, 0.95, "invertida"),
  ],
};

describe("avaliar", () => {
  const avaliacao = avaliar(AMOSTRA, RESULTADOS, PROTOCOLO);

  it("conta escolhas certas, sugestões e sugestões certas só nos itens de classes oferecidas", () => {
    expect(avaliacao.dentro).toEqual({ itens: 3, escolhaCerta: 2, sugestoes: 2, sugestoesCertas: 1 });
  });

  it("conta os controles que terminam em nenhuma", () => {
    expect(avaliacao.fora).toEqual({ itens: 2, emNenhuma: 1 });
  });

  it("compara a decisão e a escolha ao inverter a ordem", () => {
    expect(avaliacao.inversao).toEqual({
      itens: 2,
      mesmaEscolha: 2,
      mesmaDecisao: 1,
      escolhaCertaInvertida: 2,
      escolhaCertaNaOrdemNormal: 2,
    });
  });

  it("dá o resumo de cada classe", () => {
    const resumo = (codigo: string) => {
      const { classe: _, ...numeros } = avaliacao.porClasse.find((r) => r.classe.codigo === codigo)!;
      return numeros;
    };
    expect(resumo("3030")).toEqual({ itens: 2, escolhaCerta: 1, sugestoes: 2, sugestoesCertas: 1, emNenhuma: 0 });
    expect(resumo("3110")).toEqual({ itens: 1, escolhaCerta: 1, sugestoes: 0, sugestoesCertas: 0, emNenhuma: 1 });
    expect(resumo("7510")).toEqual({ itens: 2, escolhaCerta: 1, sugestoes: 1, sugestoesCertas: 0, emNenhuma: 1 });
  });

  it("lista onde o Choice trocou uma classe por outra", () => {
    expect(avaliacao.confusoes).toEqual([{ esperada: "3030", escolhida: "3110", vezes: 1 }]);
  });

  it("diz que classe a regra sugeriu para os controles que deviam terminar em nenhuma", () => {
    expect(avaliacao.desviosDosControles).toEqual([{ classe: "3030", vezes: 1 }]);
  });

  it("separa o acerto da escolha pela probabilidade que o Jev deu a ela", () => {
    expect(avaliacao.faixas.map((f) => [f.de, f.ate, f.itens, f.escolhaCerta])).toEqual([
      [0, 0.5, 1, 1],
      [0.5, 0.8, 0, 0],
      [0.8, 1, 2, 1],
    ]);
  });

  it("reprova a precisão e os controles, e o selo não entra", () => {
    expect(avaliacao.vereditos.precisao).toMatchObject({ k: 1, n: 2, passou: false });
    expect(avaliacao.vereditos.controles).toMatchObject({ k: 1, n: 2, passou: false });
    expect(avaliacao.vereditos.cobertura).toMatchObject({ k: 2, n: 3, passou: true });
    expect(avaliacao.seloEntra).toBe(false);
  });

  it("marca como fraca a classe cuja escolha acerta menos que o mínimo", () => {
    const fraca = avaliar(AMOSTRA, { ...RESULTADOS, respostas: RESULTADOS.respostas.map((r) => (r.codigoItem === 1 && r.ordem === "crescente" ? { ...r, escolha: "3110" } : r)) }, PROTOCOLO);
    expect(fraca.classesFracas.map((r) => r.classe.codigo)).toEqual(["3030"]);
  });

  it("deixa o selo entrar quando a precisão e os controles passam", () => {
    const certo: Resultados = {
      ...RESULTADOS,
      respostas: [
        resposta(1, "3030", 0.9, 0.95),
        resposta(2, "3030", 0.8, 0.9),
        resposta(3, "3110", 0.9, 0.95),
        resposta(4, "nenhuma", 0.7, 0.1),
        resposta(5, "nenhuma", 0.7, 0.1),
      ],
    };
    expect(avaliar(AMOSTRA, certo, PROTOCOLO).seloEntra).toBe(true);
  });

  it("recusa resultados a que falta a resposta de um item", () => {
    expect(() => avaliar(AMOSTRA, { ...RESULTADOS, respostas: RESULTADOS.respostas.slice(1) }, PROTOCOLO)).toThrow(/item 1 não tem resposta/);
  });
});

describe("intervaloDeWilson", () => {
  it("dá o intervalo de 95% de 8 acertos em 10", () => {
    const [de, ate] = intervaloDeWilson({ k: 8, n: 10 });
    expect(de).toBeCloseTo(0.4902, 3);
    expect(ate).toBeCloseTo(0.9433, 3);
  });

  it("não passa de 1 com todos os acertos e abre tudo sem itens", () => {
    expect(intervaloDeWilson({ k: 10, n: 10 })[1]).toBe(1);
    expect(intervaloDeWilson({ k: 0, n: 0 })).toEqual([0, 1]);
  });
});
