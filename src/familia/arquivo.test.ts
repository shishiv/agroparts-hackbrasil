import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { escreverArquivoDeFamilias, lerArquivoDeFamilias } from "./arquivo";
import { classe, cod } from "./teste-de-apoio";

const TEXTO = readFileSync(new URL("../../dados/demo/familias-jev.json", import.meta.url), "utf8");

const MINIMO = {
  versao: "familias-jev-1",
  modelo: "jev-1.14.0",
  geradoEm: "2026-11-17",
  regra: { versao: "regra-1", noulMinimo: 0.7, escolhaMinima: 0.5 },
  classes: { "3030": { nome: "CORREAME", grupo: "TRANSMISSÃO" } },
  semTexto: ["10282"],
  sugestoes: [
    {
      codigo: "10032",
      resposta: { tipo: "classe", classe: "3030" },
      probabilidade: 0.96,
      confianca: 0.96,
      modelo: "jev-1.14.0",
      jev: { escolha: "3030", probabilidadeDaEscolha: 0.96, noul: 0.98 },
    },
  ],
};

/** Copia o arquivo mínimo, troca um campo e devolve o texto para a leitura. */
function com(mudanca: (copia: Record<string, any>) => void): string {
  const copia = structuredClone(MINIMO) as Record<string, any>;
  mudanca(copia);
  return JSON.stringify(copia);
}

function problemas(texto: string): string[] {
  const lido = lerArquivoDeFamilias(texto);
  return lido.ok ? [] : lido.erros.map((e) => `${e.coluna}: ${e.problema}`);
}

describe("lerArquivoDeFamilias", () => {
  it("lê o arquivo da demo e escreve de volta o mesmo texto", () => {
    const lido = lerArquivoDeFamilias(TEXTO);
    if (!lido.ok) throw new Error(JSON.stringify(lido.erros));
    expect(escreverArquivoDeFamilias(lido.valor)).toBe(TEXTO);
  });

  it("entrega as sugestões por código, com classes e sem-texto", () => {
    const lido = lerArquivoDeFamilias(JSON.stringify(MINIMO));
    expect(lido.ok).toBe(true);
    if (!lido.ok) return;
    expect(lido.valor.sugestoes.get(cod("10032"))?.resposta).toEqual({ tipo: "classe", classe: "3030" });
    expect(lido.valor.semTexto).toEqual(["10282"]);
    expect(lido.valor.classes.get(classe("3030", "x").codigo)).toEqual({ nome: "CORREAME", grupo: "TRANSMISSÃO" });
  });

  it("recusa JSON quebrado, raiz que não é objeto e versão desconhecida", () => {
    expect(problemas("{")).toEqual([": JSON inválido"]);
    expect(problemas("[]")).toEqual([": esperava um objeto na raiz"]);
    expect(problemas(com((c) => (c.versao = "familias-jev-9")))).toEqual(["versao: esperava familias-jev-1"]);
  });

  it("recusa uma sugestão de classe que não está em `classes`", () => {
    const erros = problemas(com((c) => (c.sugestoes[0].resposta.classe = "5330")));
    expect(erros).toContain('sugestoes[0].resposta.classe: classe 5330 não está em "classes"');
  });

  it("recusa uma sugestão de classe diferente da que o Jev escolheu", () => {
    const erros = problemas(
      com((c) => {
        c.classes["5330"] = { nome: "GAXETAS", grupo: "FERRAGENS" };
        c.sugestoes[0].jev.escolha = "5330";
      }),
    );
    expect(erros).toEqual(["sugestoes[0].jev.escolha: a sugestão de classe tem de ser a classe que o Jev escolheu"]);
  });

  it("aceita nenhuma com a escolha do Jev que a regra descartou", () => {
    const texto = com((c) => {
      c.sugestoes[0].resposta = { tipo: "nenhuma" };
      c.sugestoes[0].probabilidade = 0.05;
    });
    expect(problemas(texto)).toEqual([]);
  });

  it("recusa probabilidade fora de 0 a 1, código repetido e código que é sem-texto e sugestão ao mesmo tempo", () => {
    expect(problemas(com((c) => (c.sugestoes[0].probabilidade = 1.5)))).toEqual(["sugestoes[0].probabilidade: esperava um número de 0 a 1"]);
    expect(problemas(com((c) => c.sugestoes.push(c.sugestoes[0])))).toEqual(["sugestoes[1].codigo: código repetido: 10032"]);
    expect(problemas(com((c) => (c.semTexto = ["10032"])))).toEqual(["sugestoes[0].codigo: código repetido: 10032"]);
  });

  it("recusa código de classe que não tem quatro dígitos", () => {
    expect(problemas(com((c) => (c.classes = { "30x0": { nome: "A", grupo: "B" } })))).toContain("classes.30x0: classe do CATMAT inválida: \"30x0\"");
  });
});
