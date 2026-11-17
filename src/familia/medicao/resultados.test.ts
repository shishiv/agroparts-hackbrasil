import { describe, expect, it } from "vitest";
import type { Resultados } from "./avaliar";
import { escreverResultados, lerResultados } from "./resultados";

const RESULTADOS: Resultados = {
  modelo: "jev-1.14.0",
  chamadas: 2,
  tokensDeEntrada: 34000,
  respostas: [
    { codigoItem: 1, ordem: "crescente", escolha: "3030", probabilidadeDaEscolha: 0.9, noul: 0.95 },
    { codigoItem: 1, ordem: "invertida", escolha: "nenhuma", probabilidadeDaEscolha: 0.5, noul: 0.2 },
  ],
};

describe("resultados", () => {
  it("escreve e lê de volta os mesmos resultados", () => {
    expect(lerResultados(escreverResultados(RESULTADOS))).toEqual({ ok: true, valor: RESULTADOS });
  });

  it("recusa ordem desconhecida, probabilidade fora de 0 a 1 e resposta repetida", () => {
    const texto = (mudanca: (r: Record<string, unknown>[]) => void) => {
      const copia = structuredClone(RESULTADOS) as unknown as { respostas: Record<string, unknown>[] };
      mudanca(copia.respostas);
      return JSON.stringify(copia);
    };
    const problemas = (t: string) => {
      const lido = lerResultados(t);
      return lido.ok ? [] : lido.erros.map((e) => `${e.coluna}: ${e.problema}`);
    };
    expect(problemas(texto((r) => ((r[0] as Record<string, unknown>).ordem = "meio")))).toEqual(["respostas[0].ordem: esperava crescente ou invertida"]);
    expect(problemas(texto((r) => ((r[0] as Record<string, unknown>).noul = 2)))).toEqual(["respostas[0]: esperava probabilidadeDaEscolha e noul de 0 a 1"]);
    expect(problemas(texto((r) => r.push(r[0] as Record<string, unknown>)))).toEqual(["respostas[2]: resposta repetida: 1:crescente"]);
    expect(lerResultados("{").ok).toBe(false);
  });
});
