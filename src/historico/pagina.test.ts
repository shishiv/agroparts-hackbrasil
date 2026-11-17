import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CodigoLegado, NumeroPatrimonio } from "../contrato";
import { lerExportacao, lerLeiturasDeExemplo } from "../exportacao";
import { lerCodigo, lerPatrimonio } from "../exportacao/valores";
import { agrupar } from "../unificacao/agrupar";
import { lerIndiceDeGrupos, lerPaginaDoEquipamento } from "./json";
import { caminhoDoEquipamento, indiceDeGrupos, paginaDoEquipamento } from "./pagina";

const PASTA = new URL("../../dados/demo/", import.meta.url);
const ler = (nome: string) => readFileSync(new URL(nome, PASTA), "utf8");

const lido = lerExportacao({
  equipamentos: ler("equipamentos.csv"),
  materiais: ler("materiais.csv"),
  consumo: ler("consumo.csv"),
  estoque: ler("estoque.csv"),
});
const exemplo = lerLeiturasDeExemplo(ler("unificacao-de-exemplo.json"));
if (!lido.ok || !exemplo.ok) throw new Error("demo ilegível");
const exportacao = lido.valor;
const unificacao = agrupar(exemplo.valor.versaoRegras, exemplo.valor.leituras);

function patrimonio(texto: string): NumeroPatrimonio {
  const lida = lerPatrimonio(texto);
  if (!lida.ok) throw new Error(lida.problema);
  return lida.valor;
}

function codigo(texto: string): CodigoLegado {
  const lido = lerCodigo(texto);
  if (!lido.ok) throw new Error(lido.problema);
  return lido.valor;
}

describe("a página de um equipamento", () => {
  it("leva o texto do cadastro e os atributos marcados de todo código das peças, até os que a máquina nunca usou", () => {
    const pagina = paginaDoEquipamento(exportacao, unificacao, patrimonio("004512"));
    const codigosDasPecas = pagina.historico.itens.flatMap((i) => (i.tipo === "peca" ? i.grupo.codigos : [i.codigo]));
    expect(pagina.textos.map((t) => t.codigo).sort()).toEqual([...codigosDasPecas].sort());

    const texto = pagina.textos.find((t) => t.codigo === "10158");
    expect(texto?.descricao).toBe(exportacao.materiais.find((m) => m.codigo === "10158")?.descricao);
    expect(texto?.atributos).toEqual(unificacao.leituras.get(codigo("10158"))?.atributos);
    expect(texto?.atributos.length).toBeGreaterThan(0);
  });

  it("não leva o texto de código nenhum que a máquina não cita", () => {
    const pagina = paginaDoEquipamento(exportacao, unificacao, patrimonio("004540"));
    expect(pagina.textos.length).toBeLessThan(exportacao.materiais.length / 2);
  });

  it("recusa um patrimônio que não está no cadastro de equipamentos", () => {
    expect(() => paginaDoEquipamento(exportacao, unificacao, patrimonio("999999"))).toThrow(/999999/);
  });

  it("dá a cada máquina um caminho próprio, fora de /e/", () => {
    expect(caminhoDoEquipamento(patrimonio("004512"))).toBe("/maquinas/004512.json");
  });
});

describe("o índice de grupos", () => {
  const indice = indiceDeGrupos(exportacao, unificacao);

  it("tem uma entrada por grupo, na ordem da unificação", () => {
    expect(indice.grupos.map((g) => g.chave)).toEqual([...unificacao.grupos.keys()]);
  });

  it("junta as linhas de estoque de todos os códigos de cada grupo, inclusive as zeradas", () => {
    for (const grupo of unificacao.grupos.values()) {
      const entrada = indice.grupos.find((g) => g.chave === grupo.chave);
      const esperado = exportacao.estoque.filter((s) => grupo.codigos.includes(s.codigo));
      expect(entrada?.saldo).toEqual(esperado);
    }
    expect(indice.grupos.some((g) => g.saldo.some((s) => s.quantidade === 0))).toBe(true);
  });
});

describe("o JSON gravado e lido de volta", () => {
  it("volta igual para cada equipamento da demo", () => {
    for (const equipamento of exportacao.equipamentos) {
      const pagina = paginaDoEquipamento(exportacao, unificacao, equipamento.patrimonio);
      const lida = lerPaginaDoEquipamento(JSON.stringify(pagina));
      expect(lida).toEqual({ ok: true, valor: pagina });
    }
  });

  it("volta igual para o índice de grupos", () => {
    const indice = indiceDeGrupos(exportacao, unificacao);
    expect(lerIndiceDeGrupos(JSON.stringify(indice))).toEqual({ ok: true, valor: indice });
  });
});

describe("o leitor do JSON da máquina recusa o que a página não pode desenhar", () => {
  const original = JSON.parse(JSON.stringify(paginaDoEquipamento(exportacao, unificacao, patrimonio("004512"))));

  function recusa(mudar: (copia: typeof original) => void): { coluna: string; problema: string } {
    const copia = structuredClone(original);
    mudar(copia);
    const lida = lerPaginaDoEquipamento(JSON.stringify(copia));
    if (lida.ok) throw new Error("o leitor aceitou");
    const [erro] = lida.erros;
    return { coluna: erro.coluna, problema: erro.problema };
  }

  it("texto que não é JSON", () => {
    const lida = lerPaginaDoEquipamento("<!doctype html><title>x</title>");
    expect(lida).toMatchObject({ ok: false, erros: [{ problema: "JSON inválido" }] });
  });

  it("raiz que não é um objeto", () => {
    expect(lerPaginaDoEquipamento("[]")).toMatchObject({ ok: false });
  });

  it("data que não existe", () => {
    expect(recusa((c) => (c.historico.itens[0].trocas[0].data = "2026-02-31")).coluna).toBe(
      "historico.itens[0].trocas[0].data",
    );
  });

  it("peça sem nenhuma troca", () => {
    expect(recusa((c) => (c.historico.itens[0].trocas = [])).coluna).toBe("historico.itens[0].trocas");
  });

  it("grupo sem códigos", () => {
    expect(recusa((c) => (c.historico.itens[0].grupo.codigos = [])).coluna).toBe("historico.itens[0].grupo.codigos");
  });

  it("tipo de item desconhecido", () => {
    expect(recusa((c) => (c.historico.itens[0].tipo = "outro")).coluna).toBe("historico.itens[0].tipo");
  });

  it("código sem chave com leitura que resolve", () => {
    const iSemChave = original.historico.itens.findIndex((i: { tipo: string }) => i.tipo === "codigo-sem-chave");
    expect(
      recusa((c) => (c.historico.itens[iSemChave].leitura = { decisao: "resolve", familia: "f", chave: "k", rotulo: "r", atributos: [] }))
        .coluna,
    ).toBe(`historico.itens[${iSemChave}].leitura.decisao`);
  });

  it("quantidade que não é número", () => {
    expect(recusa((c) => (c.historico.itens[0].trocas[0].quantidade = "2")).coluna).toBe(
      "historico.itens[0].trocas[0].quantidade",
    );
  });

  it("patrimônio com caracter que não pode entrar num endereço", () => {
    expect(recusa((c) => (c.historico.equipamento.patrimonio = "../x")).coluna).toBe(
      "historico.equipamento.patrimonio",
    );
  });

  it("trecho de atributo que acaba antes de começar", () => {
    const iTexto = original.textos.findIndex((t: { atributos: unknown[] }) => t.atributos.length > 0);
    const coluna = recusa((c) => (c.textos[iTexto].atributos[0].trecho = { inicio: 9, fim: 3 })).coluna;
    expect(coluna).toBe(`textos[${iTexto}].atributos[0].trecho.fim`);
  });
});
