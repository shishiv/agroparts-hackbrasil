import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lerGabarito } from "./gabarito";

const PASTA = new URL("../../dados/", import.meta.url);
const arquivo = (nome: string) => readFileSync(new URL(nome, PASTA), "utf8");

interface ItemDoCatmat {
  codigoItem: number;
  descricaoItem: string;
}

function textosDoCatmat(): Map<string, string> {
  const textos = new Map<string, string>();
  for (const nome of ["rolamento-de-esfera-pdm-11797.json", "outras-pecas.json"]) {
    const { itens } = JSON.parse(arquivo(`catmat/${nome}`)) as { itens: ItemDoCatmat[] };
    for (const item of itens) textos.set(String(item.codigoItem), item.descricaoItem);
  }
  return textos;
}

describe("o gabarito", () => {
  const lido = lerGabarito(arquivo("gabarito/rotulos.json"));
  if (!lido.ok) throw new Error(`gabarito ilegível: ${JSON.stringify(lido.erros.slice(0, 3))}`);
  const gabarito = lido.valor;

  it("rotula cada texto do CATMAT em dados/catmat, e só eles, com o texto idêntico", () => {
    const catmat = textosDoCatmat();
    expect(new Map(gabarito.itens.map((i) => [i.codigo, i.texto]))).toEqual(catmat);
  });

  it("traz, em cada resolve, o trecho literal do texto que prova a série e a vedação", () => {
    const itens = JSON.parse(arquivo("gabarito/rotulos.json")).itens as {
      texto: string;
      decisao: string;
      provas?: { serie: string | null; vedacao: string | null; folga: string | null };
    }[];
    const resolvidos = itens.filter((i) => i.decisao === "resolve");
    expect(resolvidos.length).toBeGreaterThan(100);
    for (const item of resolvidos) {
      expect(item.provas?.serie, item.texto).not.toBeNull();
      expect(item.provas?.vedacao, item.texto).not.toBeNull();
      for (const prova of Object.values(item.provas ?? {})) {
        if (prova !== null) expect(item.texto, `prova "${prova}"`).toContain(prova);
      }
    }
  });

  it("recusa um arquivo cujos grupos não são os que as peças formam", () => {
    const adulterado = JSON.parse(arquivo("gabarito/rotulos.json"));
    adulterado.grupos[0].itens.pop();
    const resultado = lerGabarito(JSON.stringify(adulterado));
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erros[0]).toMatchObject({ coluna: "grupos" });
  });

  it("recusa uma peça que não bate com a série, a vedação e a folga", () => {
    const adulterado = JSON.parse(arquivo("gabarito/rotulos.json"));
    const resolve = adulterado.itens.find((i: { decisao: string }) => i.decisao === "resolve");
    resolve.peca = "9999 ZZ CN";
    const resultado = lerGabarito(JSON.stringify(adulterado));
    expect(resultado.ok).toBe(false);
  });
});
