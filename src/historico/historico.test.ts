import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ExportacaoDaUsina, HistoricoDoEquipamento, ItemDoHistorico, Unificacao } from "../contrato";
import { lerExportacao, lerLeiturasDeExemplo } from "../exportacao";
import { agrupar } from "../unificacao/agrupar";
import { historicoDoEquipamento } from "./historico";
import { usinaDeTeste } from "./usina-de-teste";

const PASTA = new URL("../../dados/demo/", import.meta.url);
const ler = (nome: string) => readFileSync(new URL(nome, PASTA), "utf8");

function demo(): { exportacao: ExportacaoDaUsina; unificacao: Unificacao } {
  const lido = lerExportacao({
    equipamentos: ler("equipamentos.csv"),
    materiais: ler("materiais.csv"),
    consumo: ler("consumo.csv"),
    estoque: ler("estoque.csv"),
  });
  const exemplo = lerLeiturasDeExemplo(ler("unificacao-de-exemplo.json"));
  if (!lido.ok || !exemplo.ok) throw new Error("demo ilegível");
  return { exportacao: lido.valor, unificacao: agrupar(exemplo.valor.versaoRegras, exemplo.valor.leituras) };
}

function historicoDa(patrimonio: string): HistoricoDoEquipamento {
  const { exportacao, unificacao } = demo();
  const equipamento = exportacao.equipamentos.find((e) => e.patrimonio === patrimonio);
  if (!equipamento) throw new Error(`sem equipamento ${patrimonio}`);
  return historicoDoEquipamento(exportacao, unificacao, equipamento);
}

type Peca = Extract<ItemDoHistorico, { tipo: "peca" }>;
type SemChave = Extract<ItemDoHistorico, { tipo: "codigo-sem-chave" }>;
const pecas = (h: HistoricoDoEquipamento): Peca[] => h.itens.filter((i): i is Peca => i.tipo === "peca");
const semChave = (h: HistoricoDoEquipamento): SemChave[] =>
  h.itens.filter((i): i is SemChave => i.tipo === "codigo-sem-chave");

const linhasDeSaldo = (saldos: readonly { codigo: string; quantidade: number; endereco: string | null }[]) =>
  saldos.map((s) => [s.codigo, s.quantidade, s.endereco]);

/**
 * Contas feitas à mão com `consumo.csv`, `estoque.csv` e os grupos de `esperado-particao.json`
 * (python3 e awk sobre os CSV, sem passar por nenhum código deste repositório).
 */
describe("o histórico de três equipamentos da demo bate com a conta à mão", () => {
  it("004512, a bomba de caldo B-104: duas peças e quatro códigos sem chave", () => {
    const h = historicoDa("004512");
    expect(h.equipamento).toMatchObject({ patrimonio: "004512", tag: "B-104" });

    expect(
      pecas(h).map((p) => ({
        codigos: p.grupo.codigos,
        trocas: p.trocas.length,
        usadosAqui: p.codigosUsadosAqui,
        total: p.quantidadeTotal,
        ultima: p.ultimaTroca,
        aqui: linhasDeSaldo(p.saldoAqui),
        sobOutro: linhasDeSaldo(p.saldoSobOutroCodigo),
      })),
    ).toEqual([
      {
        codigos: ["10059", "10066", "10165"],
        trocas: 12,
        usadosAqui: ["10066", "10165"],
        total: 22,
        ultima: "2026-07-23",
        aqui: [],
        sobOutro: [["10059", 3, "B-05-1"]],
      },
      {
        codigos: ["10071", "10091", "10158", "10261"],
        trocas: 11,
        usadosAqui: ["10071", "10091", "10261"],
        total: 22,
        ultima: "2026-06-17",
        aqui: [
          ["10071", 0, null],
          ["10091", 2, "A-03-5"],
          ["10261", 0, null],
        ],
        sobOutro: [["10158", 4, "A-03-2"]],
      },
    ]);

    expect(
      semChave(h)
        .map((s) => [s.codigo, s.trocas.length, s.trocas[0].data])
        .sort(),
    ).toEqual([
      ["10012", 2, "2025-07-15"],
      ["10041", 2, "2026-09-03"],
      ["10203", 1, "2025-09-29"],
      ["10241", 15, "2026-09-29"],
    ]);
  });

  it("004504, o desfibrador: a peça com UN e PC não soma e mostra o saldo do código em PC", () => {
    const h = historicoDa("004504");
    const mista = pecas(h).find((p) => p.grupo.codigos.join() === "10034,10186,10198");
    expect(mista).toBeDefined();
    expect(mista?.trocas).toHaveLength(15);
    expect(mista?.codigosUsadosAqui).toEqual(["10034", "10186"]);
    expect(mista?.quantidadeTotal).toBeNull();
    expect(mista?.ultimaTroca).toBe("2026-09-06");
    expect(linhasDeSaldo(mista?.saldoAqui ?? [])).toEqual([["10186", 0, null]]);
    expect(new Set(mista?.trocas.map((t) => t.unidade))).toEqual(new Set(["UN", "PC"]));
  });

  it("004540, a bomba de vácuo do filtro: duas peças somadas e nada sob outro código", () => {
    const h = historicoDa("004540");
    expect(
      pecas(h).map((p) => [p.grupo.codigos, p.trocas.length, p.quantidadeTotal, p.ultimaTroca]),
    ).toEqual([
      [["10076", "10251"], 18, 34, "2026-10-04"],
      [["10131", "10176"], 13, 25, "2026-10-04"],
    ]);
    expect(pecas(h).flatMap((p) => p.saldoSobOutroCodigo)).toEqual([]);
    expect(semChave(h).map((s) => [s.codigo, s.trocas.length])).toEqual([
      ["10241", 15],
      ["10282", 1],
    ]);
  });
});

describe("o histórico de qualquer equipamento da demo", () => {
  it("coloca cada troca da máquina em exatamente um item, e só as dela", () => {
    const { exportacao, unificacao } = demo();
    for (const equipamento of exportacao.equipamentos) {
      const h = historicoDoEquipamento(exportacao, unificacao, equipamento);
      const dosItens = h.itens.flatMap((i) => i.trocas.map((t) => `${t.ordem}|${t.codigo}`)).sort();
      const dela = exportacao.trocas
        .filter((t) => t.patrimonio === equipamento.patrimonio)
        .map((t) => `${t.ordem}|${t.codigo}`)
        .sort();
      expect(dosItens).toEqual(dela);
      for (const item of h.itens) expect(item.trocas.every((t) => t.patrimonio === equipamento.patrimonio)).toBe(true);
    }
  });

  it("nunca soma um código sem chave nem põe código sem chave dentro de uma peça", () => {
    const { exportacao, unificacao } = demo();
    for (const equipamento of exportacao.equipamentos) {
      const h = historicoDoEquipamento(exportacao, unificacao, equipamento);
      for (const item of h.itens) {
        if (item.tipo === "peca") {
          expect(item.trocas.every((t) => item.grupo.codigos.includes(t.codigo))).toBe(true);
        } else {
          expect(unificacao.grupoDe(item.codigo)).toBeNull();
          expect(item.leitura.decisao).not.toBe("resolve");
          expect(new Set(item.trocas.map((t) => t.codigo))).toEqual(new Set([item.codigo]));
        }
      }
    }
  });

  it("separa o saldo dos códigos que a máquina usa do saldo sob os que ela nunca usou", () => {
    const { exportacao, unificacao } = demo();
    for (const equipamento of exportacao.equipamentos) {
      for (const item of pecas(historicoDoEquipamento(exportacao, unificacao, equipamento))) {
        const usados = new Set(item.codigosUsadosAqui);
        expect(item.saldoAqui.every((s) => usados.has(s.codigo))).toBe(true);
        expect(item.saldoSobOutroCodigo.every((s) => !usados.has(s.codigo) && item.grupo.codigos.includes(s.codigo))).toBe(true);
      }
    }
  });

  it("põe as peças antes dos códigos sem chave, cada parte da troca mais recente para a mais antiga", () => {
    const h = historicoDa("004512");
    expect(h.itens.map((i) => i.tipo)).toEqual(["peca", "peca", "codigo-sem-chave", "codigo-sem-chave", "codigo-sem-chave", "codigo-sem-chave"]);
    for (const item of h.itens) {
      const datas = item.trocas.map((t) => t.data);
      expect(datas).toEqual([...datas].sort().reverse());
    }
    const ultimas = pecas(h).map((p) => p.ultimaTroca);
    expect(ultimas).toEqual([...ultimas].sort().reverse());
  });
});

describe("o histórico de uma usina pequena", () => {
  const usina = usinaDeTeste({
    equipamentos: ["000001;T-1;Bomba;Caldo", "000002;T-2;Moenda;Extração", "000003;T-3;Esteira;Recepção"],
    materiais: ["A1;rolamento a1;UN", "A2;rolamento a2;UN", "A3;rolamento a3;PC", "B1;correia;UN", "C1;parafuso ?;UN"],
    trocas: [
      { ordem: "1", data: "10/01/2026", patrimonio: "000001", codigo: "A1", quantidade: "1,1" },
      { ordem: "2", data: "20/03/2026", patrimonio: "000001", codigo: "A2", quantidade: "2,2" },
      { ordem: "3", data: "05/02/2026", patrimonio: "000001", codigo: "B1", quantidade: "2" },
      { ordem: "4", data: "01/04/2026", patrimonio: "000001", codigo: "C1", quantidade: "1" },
      { ordem: "5", data: "01/05/2026", patrimonio: "000002", codigo: "A3", quantidade: "7" },
      { ordem: "6", data: "20/03/2026", patrimonio: "000001", codigo: "A1", quantidade: "0,1" },
    ],
    estoque: ["A1;0;UN;", "A2;5;UN;P-01", "A3;9;PC;P-02", "B1;3;UN;P-03"],
    resolve: { A1: "rol", A2: "rol", A3: "rol", B1: "cor" },
    revisa: ["C1"],
  });
  const historico = (patrimonio: string) => {
    const equipamento = usina.exportacao.equipamentos.find((e) => e.patrimonio === patrimonio);
    if (!equipamento) throw new Error("sem equipamento");
    return historicoDoEquipamento(usina.exportacao, usina.unificacao, equipamento);
  };

  it("soma as quantidades do grupo sem o ruído do ponto flutuante: 0,1 + 2,2 + 1,1 dá 3,4", () => {
    const [peca] = pecas(historico("000001"));
    expect(peca?.quantidadeTotal).toBe(3.4);
    expect(peca?.trocas).toHaveLength(3);
  });

  it("a troca mais recente vem primeiro e, no mesmo dia, a ordem de número maior", () => {
    const [peca] = pecas(historico("000001"));
    expect(peca?.trocas.map((t) => [t.ordem, t.data])).toEqual([
      ["6", "2026-03-20"],
      ["2", "2026-03-20"],
      ["1", "2026-01-10"],
    ]);
    expect(peca?.ultimaTroca).toBe("2026-03-20");
  });

  it("o saldo de um código do grupo que só outra máquina usou é saldo sob outro código", () => {
    const [peca] = pecas(historico("000001"));
    expect(peca?.codigosUsadosAqui).toEqual(["A1", "A2"]);
    expect(linhasDeSaldo(peca?.saldoAqui ?? [])).toEqual([
      ["A1", 0, null],
      ["A2", 5, "P-01"],
    ]);
    expect(linhasDeSaldo(peca?.saldoSobOutroCodigo ?? [])).toEqual([["A3", 9, "P-02"]]);
  });

  it("deixa o código revisa em item à parte, sem soma, e depois das peças", () => {
    const h = historico("000001");
    expect(h.itens.map((i) => i.tipo)).toEqual(["peca", "peca", "codigo-sem-chave"]);
    const [sobra] = semChave(h);
    expect(sobra?.codigo).toBe("C1");
    expect(sobra?.leitura.decisao).toBe("revisa");
    expect(sobra?.trocas).toHaveLength(1);
  });

  it("deixa quantidadeTotal nulo quando as unidades das trocas não batem", () => {
    const { exportacao, unificacao } = usinaDeTeste({
      equipamentos: ["000001;T-1;Bomba;Caldo"],
      materiais: ["A1;a1;UN", "A3;a3;PC"],
      trocas: [
        { ordem: "1", data: "10/01/2026", patrimonio: "000001", codigo: "A1", quantidade: "2" },
        { ordem: "2", data: "11/01/2026", patrimonio: "000001", codigo: "A3", quantidade: "3", unidade: "PC" },
      ],
      estoque: [],
      resolve: { A1: "rol", A3: "rol" },
    });
    const [equipamento] = exportacao.equipamentos;
    if (!equipamento) throw new Error("sem equipamento");
    const [peca] = pecas(historicoDoEquipamento(exportacao, unificacao, equipamento));
    expect(peca?.quantidadeTotal).toBeNull();
    expect(peca?.trocas).toHaveLength(2);
  });

  it("devolve um histórico sem itens para a máquina sem nenhuma troca", () => {
    expect(historico("000003").itens).toEqual([]);
  });

  it("não mistura as trocas de máquinas diferentes", () => {
    const [peca] = pecas(historico("000002"));
    expect(peca?.trocas.map((t) => t.ordem)).toEqual(["5"]);
    expect(peca?.quantidadeTotal).toBe(7);
    expect(peca?.codigosUsadosAqui).toEqual(["A3"]);
    expect(linhasDeSaldo(peca?.saldoSobOutroCodigo ?? [])).toEqual([
      ["A1", 0, null],
      ["A2", 5, "P-01"],
    ]);
  });

  it("recusa a usina em que a unificação não cobre um código que tem troca", () => {
    const outra = usinaDeTeste({
      equipamentos: ["000001;T-1;Bomba;Caldo"],
      materiais: ["A1;a1;UN"],
      trocas: [{ ordem: "1", data: "10/01/2026", patrimonio: "000001", codigo: "A1", quantidade: "1" }],
      estoque: [],
      resolve: {},
    });
    const outroCadastro = usinaDeTeste({
      equipamentos: ["000001;T-1;Bomba;Caldo"],
      materiais: ["Z9;z9;UN"],
      trocas: [],
      estoque: [],
      resolve: {},
    });
    const [equipamento] = outra.exportacao.equipamentos;
    if (!equipamento) throw new Error("sem equipamento");
    expect(() => historicoDoEquipamento(outra.exportacao, outroCadastro.unificacao, equipamento)).toThrow(/A1/);
  });
});
