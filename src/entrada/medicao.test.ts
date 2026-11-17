import { describe, expect, it } from "bun:test";
import type { ChaveIdentidade } from "../contrato";
import { motor } from "../motor";
import { contar, lerManifesto, relatorio, resultadoDaLeitura, type Manifesto, type Medida } from "./medicao";

const lido = (texto: string) => motor.ler({ texto, origem: { tipo: "digitado" } });

const chaveDe = (texto: string): ChaveIdentidade => {
  const leitura = lido(texto);
  if (leitura.decisao !== "resolve") throw new Error(`"${texto}" não resolve`);
  return leitura.chave;
};

describe("lerManifesto", () => {
  const valido = {
    origem: "gravada",
    descricao: "Dez falas do Myke.",
    falas: [{ arquivo: "01.m4a", esperado: "Rolamento 6205 2RS", dito: "rolamento seis dois zero cinco dois erre esse", voz: "myke" }, { arquivo: "02.m4a", esperado: "Rolamento 6003 ZZ" }],
  };

  it("lê as falas, com o que foi dito e a voz quando vêm", () => {
    const lida = lerManifesto(valido);
    expect(lida.ok).toBe(true);
    if (!lida.ok) return;
    expect(lida.manifesto.origem).toBe("gravada");
    expect(lida.manifesto.falas).toEqual([
      { arquivo: "01.m4a", esperado: "Rolamento 6205 2RS", dito: "rolamento seis dois zero cinco dois erre esse", voz: "myke" },
      { arquivo: "02.m4a", esperado: "Rolamento 6003 ZZ", dito: null, voz: null },
    ]);
  });

  it("diz cada problema do arquivo, para quem o escreveu à mão", () => {
    const lida = lerManifesto({ origem: "ao vivo", descricao: "", falas: [{ arquivo: "01.m4a" }, "02.m4a"] });
    expect(lida).toEqual({
      ok: false,
      problemas: [
        '"origem" tem de ser "sintetizada" ou "gravada"',
        '"descricao" tem de ser um texto',
        "falas[0].esperado tem de ser o texto da peça, como a usina escreve",
        "falas[1] tem de ser um objeto",
      ],
    });
  });

  it("recusa o que não é objeto e uma lista sem falas", () => {
    expect(lerManifesto([])).toEqual({ ok: false, problemas: ["falas.json tem de ser um objeto"] });
    expect(lerManifesto({ ...valido, falas: [] })).toEqual({ ok: false, problemas: ['"falas" tem de ser uma lista com pelo menos uma fala'] });
  });
});

describe("resultadoDaLeitura", () => {
  const esperada = chaveDe("Rolamento 6205 2RS");

  it("certa quando o motor resolve a mesma peça, mesmo escrita de outro jeito", () => {
    expect(resultadoDaLeitura(lido("rolamento 6205-2RSH"), esperada)).toEqual({ tipo: "certa" });
  });

  it("chave errada quando o motor resolve outra peça: é o pior caso", () => {
    expect(resultadoDaLeitura(lido("Rolamento 6206 2RS"), esperada)).toEqual({ tipo: "chave-errada", rotulo: "Rolamento 6206 2RS" });
  });

  it("para a pessoa quando o motor revisa ou recusa", () => {
    expect(resultadoDaLeitura(lido("Rolamento 6205"), esperada).tipo).toBe("para-a-pessoa");
    expect(resultadoDaLeitura(lido("Folga C3"), esperada).tipo).toBe("para-a-pessoa");
  });
});

describe("relatorio", () => {
  const manifesto: Manifesto = {
    origem: "sintetizada",
    descricao: "Duas falas de teste.",
    falas: [
      { arquivo: "01.webm", esperado: "Rolamento 6205 2RS", dito: "seis dois zero cinco", voz: null },
      { arquivo: "02.webm", esperado: "Rolamento 6003 ZZ", dito: null, voz: null },
    ],
  };
  const [primeira, segunda] = manifesto.falas;
  const medidas: Medida[] = [
    { fala: primeira, ouvido: "Rolamento 6205, 2RS.", campo: "Rolamento 6205 2RS", resultado: { tipo: "certa" }, ms: 300 },
    { fala: segunda ?? primeira, ouvido: "Rolamento 6, 0|3 ZZ", campo: "Rolamento 6 0|3 ZZ", resultado: resultadoDaLeitura(lido("Rolamento 6"), chaveDe("Rolamento 6003 ZZ")), ms: 500 },
  ];

  it("conta as falas certas, as que foram para a pessoa e as que deram chave errada", () => {
    expect(contar(medidas)).toEqual({ certas: 1, chavesErradas: 0, paraAPessoa: 1, semTexto: 0 });
  });

  it("diz no topo que a voz é de máquina e dá o k de N e o tempo", () => {
    const texto = relatorio(manifesto, medidas);
    expect(texto).toContain("SINTETIZADAS (voz de máquina, não de pessoa)");
    expect(texto).toContain("**1 de 2 com a chave certa**");
    expect(texto).toContain("mediana 400 ms, maior 500 ms (2 chamadas)");
  });

  it("uma linha por fala, e a barra do texto não quebra a tabela", () => {
    const linhas = relatorio(manifesto, medidas).split("\n").filter((l) => l.startsWith("| 0"));
    expect(linhas).toEqual([
      "| 01.webm | seis dois zero cinco | `Rolamento 6205, 2RS.` | `Rolamento 6205 2RS` | `Rolamento 6205 2RS` | certa |",
      "| 02.webm |  | `Rolamento 6, 0/3 ZZ` | `Rolamento 6 0/3 ZZ` | `Rolamento 6003 ZZ` | pessoa: revisa (designacao-ausente) |",
    ]);
  });

  it("gravada por uma pessoa diz isso", () => {
    expect(relatorio({ ...manifesto, origem: "gravada" }, medidas)).toContain("gravadas por uma pessoa");
  });
});
