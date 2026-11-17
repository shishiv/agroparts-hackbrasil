import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CadastroMaterial, CodigoLegado } from "../contrato";
import { lerExportacao, lerParticaoEsperada } from "../exportacao";
import { lerCodigo } from "../exportacao/valores";
import { ler } from "./ler";
import { unificar } from "./unificar";

const PASTA = new URL("../../dados/demo/", import.meta.url);
const arquivo = (nome: string) => readFileSync(new URL(nome, PASTA), "utf8");

function cadastroDaDemo(): readonly CadastroMaterial[] {
  const lido = lerExportacao({
    equipamentos: arquivo("equipamentos.csv"),
    materiais: arquivo("materiais.csv"),
    consumo: arquivo("consumo.csv"),
    estoque: arquivo("estoque.csv"),
  });
  if (!lido.ok) throw new Error(`demo ilegível: ${JSON.stringify(lido.erros.slice(0, 3))}`);
  return lido.valor.materiais;
}

const comoConjuntos = (grupos: readonly (readonly string[])[]) => grupos.map((g) => [...g].sort().join(",")).sort();

describe("unificar sobre o cadastro da demo", () => {
  const lido = lerParticaoEsperada(arquivo("esperado-particao.json"));
  if (!lido.ok) throw new Error("gabarito da demo ilegível");
  const esperado = lido.valor;
  const unificacao = unificar(cadastroDaDemo());

  it("dá a decisão esperada para cada código", () => {
    const obtidas = [...unificacao.leituras].map(([codigo, leitura]) => ({ codigo, decisao: leitura.decisao }));
    const ordenar = (lista: readonly { codigo: string; decisao: string }[]) => [...lista].sort((a, b) => (a.codigo < b.codigo ? -1 : 1));
    expect(ordenar(obtidas)).toEqual(ordenar(esperado.decisoes));
  });

  it("forma os grupos esperados, como conjuntos de códigos", () => {
    expect(comoConjuntos([...unificacao.grupos.values()].map((g) => g.codigos))).toEqual(comoConjuntos(esperado.grupos));
  });

  it("não depende da ordem do cadastro", () => {
    const invertido = unificar([...cadastroDaDemo()].reverse());
    expect(comoConjuntos([...invertido.grupos.values()].map((g) => g.codigos))).toEqual(
      comoConjuntos([...unificacao.grupos.values()].map((g) => g.codigos)),
    );
    expect([...invertido.grupos.keys()].sort()).toEqual([...unificacao.grupos.keys()].sort());
  });

  it("cita a versão das regras", () => {
    expect(unificacao.versaoRegras).toBe("motor-1");
  });
});

describe("unificar", () => {
  const codigo = (texto: string): CodigoLegado => {
    const lido = lerCodigo(texto);
    if (!lido.ok) throw new Error(lido.problema);
    return lido.valor;
  };
  const material = (c: string, descricao: string): CadastroMaterial => ({ codigo: codigo(c), descricao, unidade: "UN", sku: null });

  it("soma sob uma peça os códigos escritos de jeitos diferentes e deixa de fora o que difere", () => {
    const unificacao = unificar([
      material("1", "ROL 6310-2Z/C3"),
      material("2", "ROLAMENTO RIGIDO DE ESFERAS 6310 ZZ C3 - 50X110X27 MM"),
      material("3", "ROL 6310-2RS1 C3"),
      material("4", "ROL 6310 ZZ"),
      material("5", "ROL 6310 C3"),
    ]);
    expect([...unificacao.grupos.values()].map((g) => g.codigos)).toEqual([["1", "2"], ["3"], ["4"]]);
    expect(unificacao.grupoDe(codigo("5"))).toBeNull();
    expect(unificacao.leituras.get(codigo("5"))?.decisao).toBe("revisa");
  });

  it("lê o texto do cadastro do mesmo jeito que `ler` lê o texto digitado", () => {
    const texto = "ROLAMENTO 6205-2RS1 SKF";
    const noCadastro = unificar([material("1", texto)]).leituras.get(codigo("1"));
    expect(noCadastro).toEqual(ler({ texto, origem: { tipo: "digitado" } }));
  });
});
