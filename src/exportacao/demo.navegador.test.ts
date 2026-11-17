import { describe, expect, it } from "vitest";
import { agrupar } from "../unificacao/agrupar";
import consumo from "../../dados/demo/consumo.csv?raw";
import equipamentos from "../../dados/demo/equipamentos.csv?raw";
import particaoJson from "../../dados/demo/esperado-particao.json?raw";
import estoque from "../../dados/demo/estoque.csv?raw";
import materiais from "../../dados/demo/materiais.csv?raw";
import exemploJson from "../../dados/demo/unificacao-de-exemplo.json?raw";
import { lerExportacao, lerLeiturasDeExemplo, lerParticaoEsperada } from "./index";

const comoConjuntos = (grupos: readonly (readonly string[])[]) =>
  grupos.map((g) => [...g].sort().join(",")).sort();

describe("no navegador, a mesma fronteira e o mesmo agrupar dão o mesmo resultado que no Bun", () => {
  it("roda num navegador de verdade, não no Bun", () => {
    expect(navigator.userAgent).toContain("Chrome");
    expect("Bun" in globalThis).toBe(false);
  });

  it("lê a demo e confere o número de linhas de cada cadastro", () => {
    const lido = lerExportacao({ equipamentos, materiais, consumo, estoque });
    expect(lido.ok).toBe(true);
    if (!lido.ok) return;
    expect(lido.valor.equipamentos).toHaveLength(equipamentos.trim().split("\n").length - 1);
    expect(lido.valor.materiais).toHaveLength(materiais.trim().split("\n").length - 1);
    expect(lido.valor.trocas.length).toBeGreaterThanOrEqual(550);
    expect(lido.valor.estoque).toHaveLength(estoque.trim().split("\n").length - 1);
  });

  it("agrupa o exemplo nos grupos do gabarito", () => {
    const exemplo = lerLeiturasDeExemplo(exemploJson);
    const esperado = lerParticaoEsperada(particaoJson);
    expect(exemplo.ok && esperado.ok).toBe(true);
    if (!exemplo.ok || !esperado.ok) return;
    const unificacao = agrupar(exemplo.valor.versaoRegras, exemplo.valor.leituras);
    expect(comoConjuntos([...unificacao.grupos.values()].map((g) => g.codigos))).toEqual(
      comoConjuntos(esperado.valor.grupos),
    );
  });
});
