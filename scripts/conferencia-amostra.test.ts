import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { renderizarConferencia, lerRotulados, type Conferencia, type ItemConferido, type ItemRotulado } from "./conferencia-amostra";

const RAIZ = new URL("../", import.meta.url);
const arquivo = (nome: string) => readFileSync(new URL(nome, RAIZ), "utf8");

const conferencia = JSON.parse(arquivo("docs/medicao/conferencia-amostra.json")) as Conferencia;
const rotulados = lerRotulados(arquivo("dados/gabarito/rotulos.json"));
const correcoes = (JSON.parse(arquivo("dados/gabarito/correcoes.json")) as { correcoes: { codigoItem: number }[] }).correcoes;

const codigosDaAmostra = [...arquivo("dados/gabarito/amostra-30.md").matchAll(/^## \d+\. Item (\d+)$/gm)].map((m) => Number(m[1]));

function medidasDoTexto(texto: string): { d: number; D: number; B: number } | null {
  const m = /DIÂMETRO INTERNO: (\d+) MM, DIÂMETRO EXTERNO: (\d+) MM, (?:LARGURA|ALTURA): (\d+) MM/.exec(texto);
  return m ? { d: Number(m[1]), D: Number(m[2]), B: Number(m[3]) } : null;
}

/** O diâmetro interno que a designação da série 6 dá, pela regra de `dados/gabarito/regras-de-rotulagem.md`. */
function diametroInternoDaSerie(serie: string): number {
  if (serie.length === 3) return Number(serie.slice(-1));
  const codigo = Number(serie.slice(-2));
  return [10, 12, 15, 17][codigo] ?? codigo * 5;
}

const rotuladoDe = (item: ItemConferido): ItemRotulado => {
  const rotulado = rotulados.get(item.codigoItem);
  if (!rotulado) throw new Error(`item ${item.codigoItem} fora do gabarito`);
  return rotulado;
};

describe("a conferência da amostra", () => {
  it("cobre os mesmos 30 itens de amostra-30.md, na mesma ordem", () => {
    expect(codigosDaAmostra).toHaveLength(30);
    expect(conferencia.itens.map((i) => i.codigoItem)).toEqual(codigosDaAmostra);
  });

  it("cita só fontes que lista, e cada item cita ao menos uma", () => {
    for (const item of conferencia.itens) {
      expect(item.fontes.length, `item ${item.codigoItem}`).toBeGreaterThan(0);
      for (const fonte of item.fontes) expect(conferencia.fontes[fonte.fonte], `item ${item.codigoItem}`).toBeDefined();
    }
  });

  it("traz as medidas do catálogo de todo rolamento da família, e o texto que as escreve diz o mesmo", () => {
    for (const item of conferencia.itens.filter((i) => i.tipo === "familia")) {
      expect(item.medidasDoCatalogo, `item ${item.codigoItem}`).not.toBeNull();
      const doTexto = medidasDoTexto(rotuladoDe(item).texto);
      if (doTexto) expect(item.medidasDoCatalogo, `item ${item.codigoItem}`).toEqual(doTexto);
    }
  });

  it("lê no catálogo o mesmo diâmetro interno que a designação da série dá", () => {
    for (const item of conferencia.itens.filter((i) => i.tipo === "familia")) {
      const serie = /^(\d+)/.exec(item.referencia ?? "")?.[1];
      expect(serie, `item ${item.codigoItem}`).toBeDefined();
      expect(item.medidasDoCatalogo?.d, `item ${item.codigoItem}`).toBe(diametroInternoDaSerie(serie as string));
    }
  });

  it("não deixa um rótulo que não confere sem correção em correcoes.json", () => {
    const corrigidos = new Set(correcoes.map((c) => c.codigoItem));
    for (const item of conferencia.itens.filter((i) => i.resultado === "nao-confere")) {
      expect(corrigidos.has(item.codigoItem), `item ${item.codigoItem}`).toBe(true);
    }
  });

  it("tem um relatório igual ao que o JSON gera", () => {
    expect(arquivo("docs/medicao/conferencia-amostra.md")).toBe(renderizarConferencia(conferencia, rotulados));
  });
});

describe("os textos que falam do gabarito", () => {
  it("não dizem que uma pessoa revisou os rótulos", () => {
    const textos = [
      "README.md",
      "dados/gabarito/README.md",
      "dados/gabarito/amostra-30.md",
      "docs/medicao/placar.md",
      "docs/medicao/conferencia-amostra.md",
    ];
    for (const nome of textos) {
      expect(arquivo(nome), nome).not.toMatch(/(?<!não )revisad[oa]s? por (uma )?pessoa/i);
      expect(arquivo(nome), nome).not.toMatch(/sem revisão de pessoa/i);
    }
  });
});
