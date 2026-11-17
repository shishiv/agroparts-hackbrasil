import { describe, expect, it } from "vitest";
import {
  baixarArvore,
  baixarOutrasPecas,
  baixarRolamentos,
  hojeEmBrasilia,
  lerPaginas,
  type Buscar,
  type ItemCatmat,
} from "./baixar-catmat";

function item(codigoItem: number, descricaoItem: string, extra: Partial<ItemCatmat> = {}) {
  return {
    codigoItem,
    codigoGrupo: 31,
    nomeGrupo: "ROLAMENTOS E MANCAIS",
    codigoClasse: 3110,
    nomeClasse: "ROLAMENTOS ANTIFRICÇÃO NÃO MONTADOS",
    codigoPdm: 11797,
    nomePdm: "ROLAMENTO DE ESFERA",
    descricaoItem,
    statusItem: true,
    codigo_ncm: "84",
    ...extra,
  };
}

/** API de mentira: devolve `registros` em páginas de `porPagina`, e guarda as URLs pedidas. */
function apiDeMentira(registros: unknown[], porPagina: number) {
  const pedidas: URL[] = [];
  const buscar: Buscar = async (url) => {
    const endereco = new URL(url);
    pedidas.push(endereco);
    const pagina = Number(endereco.searchParams.get("pagina"));
    return {
      resultado: registros.slice((pagina - 1) * porPagina, pagina * porPagina),
      totalRegistros: registros.length,
      totalPaginas: Math.max(1, Math.ceil(registros.length / porPagina)),
    };
  };
  return { buscar, pedidas };
}

describe("lerPaginas", () => {
  it("pede páginas até a última e junta os registros", async () => {
    const { buscar, pedidas } = apiDeMentira([{ a: 1 }, { a: 2 }, { a: 3 }], 2);
    expect(await lerPaginas(buscar, "rota", { codigoPdm: 7 })).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect(pedidas.map((u) => u.searchParams.get("pagina"))).toEqual(["1", "2"]);
    expect(pedidas[0]?.searchParams.get("codigoPdm")).toBe("7");
    expect(pedidas[0]?.pathname).toBe("/modulo-material/rota");
  });

  it("recusa resposta sem a lista de resultados", async () => {
    await expect(lerPaginas(async () => ({ erro: "x" }), "rota", {})).rejects.toThrow("resposta inesperada de rota");
  });
});

describe("baixarRolamentos", () => {
  it("ordena por código, apara a descrição e tira item com formato de dado pessoal", async () => {
    const { buscar } = apiDeMentira(
      [
        item(30, "ROLAMENTO B  "),
        item(10, "ROLAMENTO A"),
        item(20, "ROLAMENTO C, FONE (16) 99876-5432"),
        item(40, "ROLAMENTO D, SÉRIE 12345678901"),
      ],
      3,
    );
    const lido = await baixarRolamentos(buscar, "2026-11-17");
    expect(lido.itens.map((i) => [i.codigoItem, i.descricaoItem])).toEqual([
      [10, "ROLAMENTO A"],
      [30, "ROLAMENTO B"],
    ]);
    expect(lido.excluidos).toEqual([
      { codigoItem: 20, motivo: ["telefone"] },
      { codigoItem: 40, motivo: ["onze-digitos-seguidos"] },
    ]);
    expect(lido.consultadoEm).toBe("2026-11-17");
    expect(Object.keys(lido.itens[0] ?? {}).sort()).not.toContain("codigo_ncm");
  });
});

describe("baixarOutrasPecas", () => {
  it("guarda os 30 itens ativos de menor código de cada peça", async () => {
    const buscar: Buscar = async (url) => {
      const codigoPdm = Number(new URL(url).searchParams.get("codigoPdm"));
      const resultado = Array.from({ length: 80 }, (_, i) =>
        item(codigoPdm * 1000 - i, `PEÇA ${i}`, { codigoPdm, statusItem: i % 2 === 0 }),
      );
      return { resultado, totalPaginas: 1 };
    };
    const lido = await baixarOutrasPecas(buscar, "2026-11-17");
    const codigosDe = (pdm: number) => lido.itens.filter((i) => i.codigoPdm === pdm).map((i) => i.codigoItem);
    expect(codigosDe(5892)).toHaveLength(30);
    expect(codigosDe(5892)[0]).toBe(5892 * 1000 - 78);
    expect(codigosDe(5892).at(-1)).toBe(5892 * 1000 - 20);
    expect(lido.itens.every((i) => i.statusItem)).toBe(true);
    expect(lido.itens).toHaveLength(150);
    const todos = lido.itens.map((i) => i.codigoItem);
    expect(todos).toEqual([...todos].sort((a, b) => a - b));
  });
});

describe("baixarArvore", () => {
  it("põe cada classe dentro do seu grupo, em ordem de código", async () => {
    const respostas: Record<string, unknown[]> = {
      "1_consultarGrupoMaterial": [
        { codigoGrupo: 31, nomeGrupo: "ROLAMENTOS E MANCAIS", statusGrupo: true },
        { codigoGrupo: 30, nomeGrupo: "TRANSMISSÃO", statusGrupo: true },
      ],
      "2_consultarClasseMaterial": [
        { codigoClasse: 3120, codigoGrupo: 31, nomeClasse: "MANCAIS", statusClasse: true },
        { codigoClasse: 3110, codigoGrupo: 31, nomeClasse: "ROLAMENTOS", statusClasse: true },
        { codigoClasse: 3030, codigoGrupo: 30, nomeClasse: "CORREIAS", statusClasse: false },
      ],
    };
    const buscar: Buscar = async (url) => {
      const rota = new URL(url).pathname.split("/").pop() ?? "";
      return { resultado: respostas[rota], totalPaginas: 1 };
    };
    const arvore = await baixarArvore(buscar, "2026-11-17");
    expect(arvore.grupos.map((g) => [g.codigoGrupo, g.classes.map((c) => c.codigoClasse)])).toEqual([
      [30, [3030]],
      [31, [3110, 3120]],
    ]);
    expect(arvore.grupos[0]?.classes[0]?.statusClasse).toBe(false);
  });

  it("recusa classe de grupo desconhecido", async () => {
    const buscar: Buscar = async (url) => {
      const grupos = new URL(url).pathname.endsWith("1_consultarGrupoMaterial");
      const resultado = grupos
        ? [{ codigoGrupo: 1, nomeGrupo: "A", statusGrupo: true }]
        : [{ codigoClasse: 9, codigoGrupo: 2, nomeClasse: "B", statusClasse: true }];
      return { resultado, totalPaginas: 1 };
    };
    await expect(baixarArvore(buscar, "2026-11-17")).rejects.toThrow("classe 9 de um grupo que a API não listou");
  });
});

describe("hojeEmBrasilia", () => {
  it("usa o dia de Brasília, não o de Greenwich", () => {
    expect(hojeEmBrasilia(new Date("2026-11-17T02:30:00Z"))).toBe("2026-11-16");
    expect(hojeEmBrasilia(new Date("2026-11-17T12:00:00Z"))).toBe("2026-11-17");
  });
});
