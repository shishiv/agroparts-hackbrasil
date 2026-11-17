import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lerGabarito } from "./gabarito";
import { calcularPlacar, formatarPlacar } from "./placar";

const PASTA = new URL("../../", import.meta.url);
const arquivo = (nome: string) => readFileSync(new URL(nome, PASTA), "utf8");

function gabarito(json: string) {
  const lido = lerGabarito(json);
  if (!lido.ok) throw new Error(JSON.stringify(lido.erros.slice(0, 3)));
  return lido.valor;
}

describe("o placar", () => {
  const placar = calcularPlacar(gabarito(arquivo("dados/gabarito/rotulos.json")));

  it("não junta nenhum par falso no gabarito", () => {
    expect(placar.paresFalsos).toEqual([]);
  });

  it("nunca resolve o que o gabarito não resolve, nem resolve outra peça", () => {
    expect(placar.resolvidosErrado).toBe(0);
  });

  it("só diverge do gabarito mandando para uma pessoa um texto que o gabarito resolve", () => {
    expect(placar.divergencias.length).toBe(placar.mandadosParaRevisao);
    for (const d of placar.divergencias) {
      expect(d.esperado.startsWith("resolve"), `item ${d.codigo}`).toBe(true);
      expect(d.obtido.startsWith("revisa"), `item ${d.codigo}`).toBe(true);
    }
  });

  it("junta quase todos os pares verdadeiros: o que fica de fora vem de textos mandados para revisão", () => {
    expect(placar.paresVerdadeiros).toBeGreaterThan(30);
    expect(placar.paresVerdadeirosJuntados).toBeGreaterThan(placar.paresVerdadeiros - 2 * placar.mandadosParaRevisao);
  });

  it("está gravado em docs/medicao/placar.md: rode `bun run placar` se mudar uma regra", () => {
    expect(formatarPlacar(placar)).toBe(arquivo("docs/medicao/placar.md"));
  });
});

describe("o placar enxerga um par falso", () => {
  it("conta o par quando o gabarito diz que dois códigos juntados são peças diferentes", () => {
    const bruto = JSON.parse(arquivo("dados/gabarito/rotulos.json"));
    const duplas = bruto.grupos.filter((g: { itens: number[] }) => g.itens.length === 2);
    const [primeira] = duplas;
    const [a, b] = primeira.itens as [number, number];
    const separar = bruto.itens.find((i: { codigoItem: number }) => i.codigoItem === b);
    separar.serie = "9999";
    separar.peca = `9999 ${separar.vedacao} ${separar.folga}`;
    bruto.grupos = [
      ...bruto.grupos.filter((g: unknown) => g !== primeira),
      { peca: primeira.peca, itens: [a] },
      { peca: separar.peca, itens: [b] },
    ];
    const placar = calcularPlacar(gabarito(JSON.stringify(bruto)));
    expect(placar.paresFalsos).toEqual([[String(a), String(b)]]);
  });
});
