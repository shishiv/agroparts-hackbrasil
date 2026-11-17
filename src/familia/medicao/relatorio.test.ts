import { describe, expect, it } from "vitest";
import type { Amostra } from "./amostra";
import { avaliar, type Resultados } from "./avaliar";
import { PROTOCOLO } from "./protocolo";
import { formatarRelatorio, percentual } from "./relatorio";

const AMOSTRA: Amostra = {
  fonte: "teste",
  consultadoEm: "2026-11-17",
  protocolo: PROTOCOLO.versao,
  semente: "s",
  classes: [
    { codigo: "3030", nome: "CORREIAS | CORREAME", grupo: "TRANSMISSÃO", dentro: true, candidatos: 50 },
    { codigo: "7510", nome: "ARTIGOS PARA ESCRITÓRIO", grupo: "ESCRITÓRIO", dentro: false, candidatos: 50 },
  ],
  itens: [
    { codigoItem: 1, codigoClasse: "3030", nomePdm: "A", descricao: "um" },
    { codigoItem: 2, codigoClasse: "7510", nomePdm: "C", descricao: "dois" },
  ],
};

const RESULTADOS: Resultados = {
  modelo: "jev-1.14.0",
  chamadas: 2,
  tokensDeEntrada: 34_000,
  respostas: [
    { codigoItem: 1, ordem: "crescente", escolha: "3030", probabilidadeDaEscolha: 0.9, noul: 0.95 },
    { codigoItem: 2, ordem: "crescente", escolha: "nenhuma", probabilidadeDaEscolha: 0.7, noul: 0.1 },
  ],
};

describe("percentual", () => {
  it("usa vírgula e uma casa, e diz quando não há itens", () => {
    expect(percentual({ k: 1, n: 8 })).toBe("12,5%");
    expect(percentual({ k: 0, n: 0 })).toBe("sem itens");
  });
});

describe("formatarRelatorio", () => {
  it("antes da medição, traz o protocolo com os limiares e diz que ainda não mediu", () => {
    const texto = formatarRelatorio({ protocolo: PROTOCOLO, amostra: AMOSTRA, classesOferecidas: 231, medicao: null });
    expect(texto).toContain("| precisão das sugestões | das sugestões de classe para itens de classes oferecidas, as que batem com o CATMAT | 85% |");
    expect(texto).toContain("um Choice entre 231 classes");
    expect(texto).toContain("Para um item das 1 classes não oferecidas (1 itens)");
    expect(texto.endsWith("## Resultado\n\nAinda não medido.\n")).toBe(true);
  });

  it("depois da medição, traz o veredito, a linha de cada classe e o custo", () => {
    const avaliacao = avaliar(AMOSTRA, RESULTADOS, PROTOCOLO);
    const texto = formatarRelatorio({ protocolo: PROTOCOLO, amostra: AMOSTRA, classesOferecidas: 231, medicao: { resultados: RESULTADOS, avaliacao } });
    expect(texto).toContain("O selo de família sugerida entra, porque a precisão e os controles passaram.");
    expect(texto).toContain("| precisão das sugestões | 1 de 1 | 100,0% (21% a 100%) | 85% | passou |");
    expect(texto).toContain("| 3030 | CORREIAS / CORREAME | oferecida | 1 | 1 | 1 | 1 | 0 |  |");
    expect(texto).toContain("US$ 0,001");
  });

  it("diz que o selo não entra quando a precisão falha", () => {
    const errado: Resultados = {
      ...RESULTADOS,
      respostas: [{ codigoItem: 1, ordem: "crescente", escolha: "7510", probabilidadeDaEscolha: 0.9, noul: 0.95 }, ...RESULTADOS.respostas.slice(1)],
    };
    const avaliacao = avaliar(AMOSTRA, errado, PROTOCOLO);
    const texto = formatarRelatorio({ protocolo: PROTOCOLO, amostra: AMOSTRA, classesOferecidas: 231, medicao: { resultados: errado, avaliacao } });
    expect(texto).toContain("O selo de família sugerida não entra");
    expect(texto).toContain("Classes fracas: 3030.");
  });
});
