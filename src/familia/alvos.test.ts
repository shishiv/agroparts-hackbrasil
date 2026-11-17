import { describe, expect, it } from "vitest";
import type { CadastroMaterial } from "../contrato";
import { alvosDoJev } from "./alvos";
import { cod } from "./teste-de-apoio";

function material(codigo: string, descricao: string): CadastroMaterial {
  return { codigo: cod(codigo), descricao, unidade: "UN", sku: null };
}

describe("alvosDoJev", () => {
  it("separa o que o motor resolve, o que ele deixa sem grupo e o que não tem texto", () => {
    const alvos = alvosDoJev([
      material("1", "ROLAMENTO RIGIDO DE ESFERAS 6312 ZZ C3"),
      material("2", "CORREIA TRANSMISSÃO, NOME: CORREIA TRANSMISSÃO"),
      material("3", "ROL 6312 C3"),
      material("4", "   "),
    ]);
    expect(alvos.comTexto).toEqual([
      { codigo: "2", descricao: "CORREIA TRANSMISSÃO, NOME: CORREIA TRANSMISSÃO" },
      { codigo: "3", descricao: "ROL 6312 C3" },
    ]);
    expect(alvos.semTexto).toEqual(["4"]);
  });
});
