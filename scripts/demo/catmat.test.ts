import { describe, expect, it } from "vitest";
import { PASTA_DO_CATMAT } from "../gerar-demo";
import { PARTES } from "./cenario";
import { campoDe, carregarCatmat, conferirParte, dimensoesDoItem } from "./catmat";

const catmat = await carregarCatmat(PASTA_DO_CATMAT);
const item = (codigo: number) => {
  const achado = catmat.rolamentos.get(codigo);
  if (!achado) throw new Error(`item ${codigo} fora do CATMAT baixado`);
  return achado;
};

describe("conferirParte", () => {
  it("aceita todas as peças do cenário contra o item do CATMAT que as define", () => {
    for (const parte of PARTES) {
      expect(conferirParte(parte, catmat.rolamentos.get(parte.item)).codigoItem).toBe(parte.item);
    }
  });

  it("recusa folga que a referência do CATMAT não traz", () => {
    const sem = PARTES.find((p) => p.id === "p02");
    if (!sem) throw new Error("p02 sumiu do cenário");
    expect(() => conferirParte({ ...sem, folga: "C3" }, item(sem.item))).toThrow(/folga C3/);
  });

  it("recusa vedação e série que a referência do CATMAT não traz", () => {
    const parte = PARTES[0];
    if (!parte) throw new Error("cenário sem peças");
    expect(() => conferirParte({ ...parte, vedacao: "2RS" }, item(parte.item))).toThrow(/vedação 2RS/);
    expect(() => conferirParte({ ...parte, serie: "6313" }, item(parte.item))).toThrow(/série 6313/);
  });

  it("recusa item que não existe no CATMAT baixado", () => {
    const parte = PARTES[0];
    if (!parte) throw new Error("cenário sem peças");
    expect(() => conferirParte(parte, undefined)).toThrow(/não está no CATMAT/);
  });
});

describe("campos estruturados do CATMAT", () => {
  it("lê diâmetros e largura do item", () => {
    expect(dimensoesDoItem(item(311967))).toEqual({ interno: 60, externo: 130, largura: 31 });
  });

  it("lê um campo pelo rótulo e devolve null quando ele não existe", () => {
    const descricao = "ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , DIÂMETRO INTERNO: 60 MM, LARGURA: 31 MM";
    expect(campoDe(descricao, "DIÂMETRO INTERNO")).toBe("60 MM");
    expect(campoDe(descricao, "DIÂMETRO EXTERNO")).toBeNull();
    expect(campoDe(descricao, "TIPO USO")).toBe("MÁQUINAS EM GERAL");
  });
});
