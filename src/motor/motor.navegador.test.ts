import { describe, expect, it } from "vitest";
import gabaritoJson from "../../dados/gabarito/rotulos.json?raw";
import consumo from "../../dados/demo/consumo.csv?raw";
import equipamentos from "../../dados/demo/equipamentos.csv?raw";
import particaoJson from "../../dados/demo/esperado-particao.json?raw";
import estoque from "../../dados/demo/estoque.csv?raw";
import materiais from "../../dados/demo/materiais.csv?raw";
import placarGravado from "../../docs/medicao/placar.md?raw";
import { lerExportacao, lerParticaoEsperada } from "../exportacao";
import { lerGabarito } from "./gabarito";
import { calcularPlacar, formatarPlacar } from "./placar";
import { unificar } from "./unificar";

const comoConjuntos = (grupos: readonly (readonly string[])[]) => grupos.map((g) => [...g].sort().join(",")).sort();

describe("o motor num navegador de verdade dá o mesmo resultado que no Bun", () => {
  it("roda num navegador, não no Bun", () => {
    expect(navigator.userAgent).toContain("Chrome");
    expect("Bun" in globalThis).toBe(false);
  });

  it("calcula o placar que o Bun gravou em docs/medicao/placar.md, com a mesma impressão das leituras", () => {
    const gabarito = lerGabarito(gabaritoJson);
    expect(gabarito.ok).toBe(true);
    if (!gabarito.ok) return;
    const placar = calcularPlacar(gabarito.valor);
    expect(placar.paresFalsos).toEqual([]);
    expect(formatarPlacar(placar)).toBe(placarGravado);
  });

  it("unifica o cadastro da demo nas decisões e nos grupos do gabarito da demo", () => {
    const exportacao = lerExportacao({ equipamentos, materiais, consumo, estoque });
    const esperado = lerParticaoEsperada(particaoJson);
    expect(exportacao.ok && esperado.ok).toBe(true);
    if (!exportacao.ok || !esperado.ok) return;
    const unificacao = unificar(exportacao.valor.materiais);
    const ordenar = (lista: readonly { codigo: string; decisao: string }[]) => [...lista].sort((a, b) => (a.codigo < b.codigo ? -1 : 1));
    expect(ordenar([...unificacao.leituras].map(([codigo, leitura]) => ({ codigo, decisao: leitura.decisao })))).toEqual(
      ordenar(esperado.valor.decisoes),
    );
    expect(comoConjuntos([...unificacao.grupos.values()].map((g) => g.codigos))).toEqual(comoConjuntos(esperado.valor.grupos));
  });
});
