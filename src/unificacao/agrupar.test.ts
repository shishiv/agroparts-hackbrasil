import { describe, expect, it } from "vitest";
import type { ChaveIdentidade, CodigoLegado, FamiliaId, Leitura } from "../contrato";
import { agrupar } from "./agrupar";

const codigo = (texto: string) => texto as CodigoLegado;
const chave = (texto: string) => texto as ChaveIdentidade;
const familia = (texto: string) => texto as FamiliaId;

function resolve(chaveTexto: string, rotulo: string, familiaTexto = "rolamento"): Leitura {
  return {
    decisao: "resolve",
    familia: familia(familiaTexto),
    chave: chave(chaveTexto),
    rotulo,
    atributos: [],
  };
}

const revisa: Leitura = {
  decisao: "revisa",
  familia: familia("rolamento"),
  pendencias: ["sufixo-desconhecido"],
  atributos: [],
};

const recusa: Leitura = {
  decisao: "recusa",
  motivo: "fora-das-familias",
  detalhe: "correia",
  atributos: [],
};

function mapa(entradas: readonly [string, Leitura][]): Map<CodigoLegado, Leitura> {
  return new Map(entradas.map(([c, l]) => [codigo(c), l]));
}

describe("agrupar", () => {
  const leituras = mapa([
    ["10003", resolve("6312|zz|c3", "6312 ZZ C3")],
    ["10001", resolve("6312|zz|c3", "6312 ZZ C3 (cadastro)")],
    ["10002", resolve("6309|2rs", "6309 2RS")],
    ["10004", revisa],
    ["10005", recusa],
    ["10006", resolve("6312|zz|c3", "6312 ZZ C3")],
  ]);

  it("junta em um grupo os códigos de mesma chave, em ordem de código", () => {
    const unificacao = agrupar("v1", leituras);
    const grupo = unificacao.grupos.get(chave("6312|zz|c3"));
    expect(grupo?.codigos).toEqual(["10001", "10003", "10006"]);
    expect(unificacao.grupos.get(chave("6309|2rs"))?.codigos).toEqual(["10002"]);
    expect(unificacao.grupos.size).toBe(2);
  });

  it("deixa revisa e recusa fora dos grupos e dentro das leituras", () => {
    const unificacao = agrupar("v1", leituras);
    expect(unificacao.grupoDe(codigo("10004"))).toBeNull();
    expect(unificacao.grupoDe(codigo("10005"))).toBeNull();
    expect(unificacao.leituras.get(codigo("10004"))).toBe(revisa);
    expect(unificacao.leituras.get(codigo("10005"))).toBe(recusa);
    expect(unificacao.leituras.size).toBe(6);
  });

  it("acha o grupo de cada código resolvido e devolve null para código desconhecido", () => {
    const unificacao = agrupar("v1", leituras);
    expect(unificacao.grupoDe(codigo("10006"))?.chave).toBe("6312|zz|c3");
    expect(unificacao.grupoDe(codigo("10002"))?.chave).toBe("6309|2rs");
    expect(unificacao.grupoDe(codigo("99999"))).toBeNull();
  });

  it("usa o rótulo e a família do menor código do grupo", () => {
    const grupo = agrupar("v1", leituras).grupos.get(chave("6312|zz|c3"));
    expect(grupo?.rotulo).toBe("6312 ZZ C3 (cadastro)");
    expect(grupo?.familia).toBe("rolamento");
  });

  it("guarda a versão das regras", () => {
    expect(agrupar("regras-7", leituras).versaoRegras).toBe("regras-7");
  });

  it("dá o mesmo resultado qualquer que seja a ordem do mapa de entrada", () => {
    const invertido = new Map([...leituras].reverse());
    const a = agrupar("v1", leituras);
    const b = agrupar("v1", invertido);
    expect([...b.grupos.values()]).toEqual([...a.grupos.values()]);
    expect([...b.leituras.keys()]).toEqual([...a.leituras.keys()]);
    expect([...a.grupos.keys()]).toEqual(["6312|zz|c3", "6309|2rs"]);
  });

  it("aceita um cadastro sem nenhum código resolvido", () => {
    const unificacao = agrupar("v1", mapa([["1", revisa]]));
    expect(unificacao.grupos.size).toBe(0);
    expect(unificacao.leituras.size).toBe(1);
  });

  it("recusa a mesma chave em duas famílias, porque o motor errou", () => {
    const duasFamilias = mapa([
      ["1", resolve("x", "x", "rolamento")],
      ["2", resolve("x", "x", "correia")],
    ]);
    expect(() => agrupar("v1", duasFamilias)).toThrow(/mais de uma família/);
  });
});
