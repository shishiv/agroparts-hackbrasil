import { describe, expect, it } from "vitest";
import { carregarCatmat } from "./demo/catmat";
import { PASTA_DO_CATMAT } from "./gerar-demo";
import { acharSinaisDePrivacidade } from "./privacidade";

describe("acharSinaisDePrivacidade", () => {
  it.each([
    ["CPF 123.456.789-09 do titular", ["cpf"]],
    ["fornecedor 12.345.678/0001-95", ["cnpj"]],
    ["fornecedor 12.ABC.345/01DE-35", ["cnpj"]],
    ["fornecedor 12.abc.345/01de-35", ["cnpj"]],
    ["contato joao.silva@exemplo.com.br", ["email"]],
    ["fone (16) 99876-5432", ["telefone"]],
    ["fone 16 3333-4444", ["telefone"]],
    ["fone +55 16 99876-5432", ["telefone"]],
    ["fone (16) 99876 5432", ["telefone"]],
    ["fone (16)99876-5432", ["telefone"]],
    ["fone (16)998765432", ["telefone"]],
    ["fone (16) 3333 4444", ["telefone"]],
    ["fone 16 3333 4444", ["telefone"]],
    ["fone 16-99876-5432", ["telefone"]],
    ["fone 16 998765432", ["telefone"]],
    ["fone 1699876 5432", ["telefone"]],
    ["ligar 99876-5432", ["telefone"]],
    ["registro 12345678901", ["onze-digitos-seguidos"]],
  ] as const)("acusa %s", (texto, esperado) => {
    expect(acharSinaisDePrivacidade(texto)).toEqual(esperado);
  });

  it.each([
    "ROLAMENTO 6312 ZZ C3 60X130X31 MM",
    "REFERÊNCIA FABRICANTE: 6206 2RS1 - SKF/ 6206 DDU - NSK",
    "10/03/2026 ordem 100234 código 10871 saldo 1.250,5",
    "REFERÊNCIA FABRICANTE 1: 2351-020-159",
    "2026-10-31 e 6312-2Z",
    "ref 1234567890",
  ])("deixa passar %s", (texto) => {
    expect(acharSinaisDePrivacidade(texto)).toEqual([]);
  });

  it("deixa passar todas as descrições do CATMAT baixado", async () => {
    const catmat = await carregarCatmat(PASTA_DO_CATMAT);
    const acusados = [...catmat.rolamentos.values(), ...catmat.outrasPecas]
      .filter((item) => acharSinaisDePrivacidade(item.descricaoItem).length > 0)
      .map((item) => item.codigoItem);
    expect(acusados).toEqual([]);
  });
});
