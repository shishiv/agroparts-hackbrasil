import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CadastroMaterial, CodigoLegado, Unificacao, VeredictoDoSku } from "../contrato";
import { lerMateriais } from "../exportacao";
import { lerCodigo, lerSku } from "../exportacao/valores";
import { unificar } from "../motor";
import { diagnosticar, resumir } from "./diagnosticar";

interface EsperadoSkus {
  skus: { sku: string; veredicto: VeredictoDoSku["tipo"]; codigos: string[]; grupos: string[][]; semGrupo: string[] }[];
  fragmentacoes: { codigos: string[]; skus: string[] }[];
  resumo: { coerentes: number; misturas: number; inconclusivos: number; fragmentacoes: number };
}

const PASTA = new URL("../../dados/demo/", import.meta.url);
const esperado: EsperadoSkus = JSON.parse(readFileSync(new URL("esperado-skus.json", PASTA), "utf8"));

function cadastroDaDemo(): readonly CadastroMaterial[] {
  const lido = lerMateriais(readFileSync(new URL("materiais.csv", PASTA), "utf8"));
  if (!lido.ok) throw new Error(`materiais da demo ilegíveis: ${JSON.stringify(lido.erros.slice(0, 3))}`);
  return lido.valor;
}

const codigo = (texto: string): CodigoLegado => {
  const lido = lerCodigo(texto);
  if (!lido.ok) throw new Error(lido.problema);
  return lido.valor;
};

const material = (c: string, descricao: string, sku: string | null): CadastroMaterial => {
  const lido = lerSku(sku ?? "");
  if (!lido.ok) throw new Error(lido.problema);
  return { codigo: codigo(c), descricao, unidade: "UN", sku: lido.valor };
};

const grupoDeCodigos = (unificacao: Unificacao, codigos: readonly string[]) => {
  const grupo = unificacao.grupoDe(codigo(codigos[0] ?? ""));
  if (!grupo) throw new Error(`${codigos[0]} não tem grupo`);
  return grupo;
};

describe("diagnosticar a demo contra o que o gerador plantou", () => {
  const cadastro = cadastroDaDemo();
  const unificacao = unificar(cadastro);
  const diagnostico = diagnosticar(cadastro, unificacao);

  it("dá um veredicto por SKU, e os SKUs são os mesmos do gerador", () => {
    expect(diagnostico.skus.map((s) => s.veredicto.sku)).toEqual(esperado.skus.map((s) => s.sku));
  });

  for (const planejado of esperado.skus) {
    it(`${planejado.sku}: ${planejado.veredicto}, com os códigos e os grupos plantados`, () => {
      const obtido = diagnostico.skus.find((s) => s.veredicto.sku === planejado.sku);
      expect(obtido?.codigos).toEqual(planejado.codigos);
      expect(obtido?.veredicto.tipo).toBe(planejado.veredicto);
      const veredicto = obtido?.veredicto;
      if (veredicto?.tipo === "mistura") {
        const plantadas = planejado.grupos.map((g) => grupoDeCodigos(unificacao, g).chave);
        expect([...veredicto.chaves].sort()).toEqual([...plantadas].sort());
        expect(veredicto.atributosQueDiferem.length).toBeGreaterThan(0);
      }
      if (veredicto?.tipo === "coerente") {
        expect(planejado.grupos).toHaveLength(1);
        expect(veredicto.chave).toBe(grupoDeCodigos(unificacao, planejado.grupos[0] ?? []).chave);
      }
      if (veredicto?.tipo === "inconclusivo") expect(veredicto.semChave).toEqual(planejado.semGrupo);
    });
  }

  it("acha as fragmentações plantadas, com os códigos do grupo e os SKUs em que ele está", () => {
    const ordenar = <T extends { codigos: readonly string[] }>(lista: readonly T[]) =>
      [...lista].sort((a, b) => ((a.codigos[0] ?? "") < (b.codigos[0] ?? "") ? -1 : 1));
    expect(ordenar(diagnostico.fragmentacoes.map((f) => ({ codigos: f.grupo.codigos, skus: f.skus })))).toEqual(
      ordenar(esperado.fragmentacoes),
    );
  });

  it("conta o que o gerador contou", () => {
    expect(resumir(diagnostico)).toEqual(esperado.resumo);
  });

  it("não depende da ordem do cadastro", () => {
    const invertido = [...cadastro].reverse();
    expect(JSON.stringify(diagnosticar(invertido, unificar(invertido)))).toBe(JSON.stringify(diagnostico));
  });
});

describe("diagnosticar", () => {
  const cadastro = [
    material("1", "ROL 6310-2Z/C3", "A"),
    material("2", "ROLAMENTO RIGIDO DE ESFERAS 6310 ZZ C3 - 50X110X27 MM", "B"),
    material("3", "ROL 6310-2RS1 C3", "A"),
    material("4", "ROL 6310 ZZ", "C"),
    material("5", "ROL 6310 C3", "C"),
    material("6", "ROL 6310 ZZ C3", null),
    material("7", "ROL 6309 2RS", "D"),
    material("8", "ROL 6309 ZZ C3", "D"),
    material("9", "ROL 6204 2RS", "E"),
    material("10", "ROL 6205 2RS", "E"),
  ];
  const unificacao = unificar(cadastro);
  const diagnostico = diagnosticar(cadastro, unificacao);
  const veredictoDe = (sku: string) => diagnostico.skus.find((s) => s.veredicto.sku === sku)?.veredicto;

  it("diz em que atributo da chave os grupos de uma mistura diferem, na ordem da chave", () => {
    expect(veredictoDe("A")).toMatchObject({ tipo: "mistura", atributosQueDiferem: ["vedacao"] });
    expect(veredictoDe("D")).toMatchObject({ tipo: "mistura", atributosQueDiferem: ["vedacao", "folga"] });
    expect(veredictoDe("E")).toMatchObject({ tipo: "mistura", atributosQueDiferem: ["serie"] });
  });

  it("um SKU com uma peça só e um código sem chave é inconclusivo, e não coerente", () => {
    expect(veredictoDe("C")).toMatchObject({ tipo: "inconclusivo", semChave: ["5"] });
  });

  it("um SKU com um código de um grupo só é coerente, mesmo que o grupo tenha outros SKUs", () => {
    expect(veredictoDe("B")).toMatchObject({ tipo: "coerente" });
  });

  it("código sem SKU fica fora dos veredictos e fora da lista de SKUs da fragmentação", () => {
    expect(diagnostico.skus.flatMap((s) => s.codigos)).not.toContain("6");
    const [fragmentacao, ...outras] = diagnostico.fragmentacoes;
    expect(outras).toEqual([]);
    expect(fragmentacao?.grupo.codigos).toEqual(["1", "2", "6"]);
    expect(fragmentacao?.skus).toEqual(["A", "B"]);
  });

  it("um grupo que está num SKU só não fragmenta, e em dois SKUs fragmenta", () => {
    const noMesmoSku = [material("1", "ROL 6310 ZZ", "A"), material("2", "ROL 6310-2Z", "A")];
    const emDoisSkus = [material("1", "ROL 6310 ZZ", "A"), material("2", "ROL 6310-2Z", "B")];
    expect(diagnosticar(noMesmoSku, unificar(noMesmoSku)).fragmentacoes).toEqual([]);
    const [fragmentacao] = diagnosticar(emDoisSkus, unificar(emDoisSkus)).fragmentacoes;
    expect([fragmentacao?.grupo.codigos, fragmentacao?.skus]).toEqual([["1", "2"], ["A", "B"]]);
  });

  it("o código sem SKU não cria SKU, e o mesmo código com SKU cria", () => {
    const semSku = [material("1", "ROL 6310 ZZ", null)];
    const comSku = [material("1", "ROL 6310 ZZ", "A")];
    expect(diagnosticar(semSku, unificar(semSku)).skus).toEqual([]);
    expect(diagnosticar(comSku, unificar(comSku)).skus.map((s) => [s.veredicto.sku, s.veredicto.tipo])).toEqual([["A", "coerente"]]);
  });
});
