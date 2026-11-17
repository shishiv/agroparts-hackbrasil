import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { CodigoLegado, ExportacaoDaUsina, Leitura } from "../contrato";
import { agrupar } from "../unificacao/agrupar";
import { lerExportacao, lerLeiturasDeExemplo, lerParticaoEsperada } from "./index";

const PASTA = new URL("../../dados/demo/", import.meta.url);
const ler = (nome: string) => readFileSync(new URL(nome, PASTA), "utf8");

function exportacaoDaDemo(): ExportacaoDaUsina {
  const lido = lerExportacao({
    equipamentos: ler("equipamentos.csv"),
    materiais: ler("materiais.csv"),
    consumo: ler("consumo.csv"),
    estoque: ler("estoque.csv"),
  });
  if (!lido.ok) throw new Error(`demo ilegível: ${JSON.stringify(lido.erros.slice(0, 3))}`);
  return lido.valor;
}

function particaoDaDemo() {
  const lido = lerParticaoEsperada(ler("esperado-particao.json"));
  if (!lido.ok) throw new Error(`gabarito ilegível: ${JSON.stringify(lido.erros.slice(0, 3))}`);
  return lido.valor;
}

function leiturasDoExemplo() {
  const lido = lerLeiturasDeExemplo(ler("unificacao-de-exemplo.json"));
  if (!lido.ok) throw new Error(`exemplo ilegível: ${JSON.stringify(lido.erros.slice(0, 3))}`);
  return lido.valor;
}

const comoConjuntos = (grupos: readonly (readonly string[])[]) =>
  grupos.map((g) => [...g].sort().join(",")).sort();

describe("a demo versionada, lida pela fronteira", () => {
  it("tem uns 12 equipamentos e uns 600 registros de troca em 24 meses", () => {
    const { equipamentos, trocas } = exportacaoDaDemo();
    expect(equipamentos).toHaveLength(12);
    expect(trocas.length).toBeGreaterThanOrEqual(550);
    expect(trocas.length).toBeLessThanOrEqual(650);
    const datas = trocas.map((t) => t.data).sort();
    expect(datas[0]?.slice(0, 7)).toBe("2024-11");
    expect(datas.at(-1)?.slice(0, 7)).toBe("2026-10");
  });

  it("traz posição em parte das trocas e não em outra parte", () => {
    const { trocas } = exportacaoDaDemo();
    const comPosicao = trocas.filter((t) => t.posicao !== null).length;
    expect(comPosicao).toBeGreaterThan(trocas.length * 0.3);
    expect(comPosicao).toBeLessThan(trocas.length * 0.9);
  });

  it("usa quantidade decimal e mais de uma unidade", () => {
    const { trocas } = exportacaoDaDemo();
    expect(trocas.some((t) => !Number.isInteger(t.quantidade))).toBe(true);
    expect(new Set(trocas.map((t) => t.unidade))).toEqual(new Set(["UN", "M", "PC"]));
  });

  it("tem código cadastrado com descrição vazia, que o gabarito recusa por falta de texto", () => {
    const { materiais } = exportacaoDaDemo();
    const vazios = materiais.filter((m) => m.descricao === "");
    expect(vazios).toHaveLength(1);
    const exemplo = leiturasDoExemplo().leituras.get(vazios[0]?.codigo as CodigoLegado);
    expect(exemplo).toMatchObject({ decisao: "recusa", motivo: "sem-texto" });
  });
});

describe("o gabarito e o exemplo da demo", () => {
  it("dão a decisão de todo código do cadastro, e só dele", () => {
    const { materiais } = exportacaoDaDemo();
    const cadastro = materiais.map((m) => m.codigo).sort();
    expect(particaoDaDemo().decisoes.map((d) => d.codigo).sort()).toEqual(cadastro);
    expect([...leiturasDoExemplo().leituras.keys()].sort()).toEqual(cadastro);
  });

  it("concordam: o exemplo, passado por agrupar, dá exatamente os grupos e as decisões do gabarito", () => {
    const { versaoRegras, leituras } = leiturasDoExemplo();
    const unificacao = agrupar(versaoRegras, leituras);
    const esperado = particaoDaDemo();
    expect(comoConjuntos([...unificacao.grupos.values()].map((g) => g.codigos))).toEqual(
      comoConjuntos(esperado.grupos),
    );
    for (const { codigo, decisao } of esperado.decisoes) {
      expect(unificacao.leituras.get(codigo)?.decisao).toBe(decisao);
    }
  });

  it("deixa código revisa e recusa fora de todo grupo e tem os três casos de cada", () => {
    const { leituras } = leiturasDoExemplo();
    const todas = [...leituras.values()];
    const pendencias = new Set(todas.flatMap((l: Leitura) => (l.decisao === "revisa" ? l.pendencias : [])));
    const motivos = new Set(todas.flatMap((l: Leitura) => (l.decisao === "recusa" ? [l.motivo] : [])));
    expect(pendencias).toEqual(new Set(["sufixo-desconhecido", "designacao-ausente", "duas-leituras"]));
    expect(motivos).toEqual(new Set(["contradicao", "fora-das-familias", "sem-texto"]));
  });

  it("marca trechos que, no texto original do cadastro, são mesmo o que o atributo diz", () => {
    const { materiais } = exportacaoDaDemo();
    const descricaoDe = new Map(materiais.map((m) => [m.codigo, m.descricao]));
    const escritasDaVedacao: Record<string, string[]> = { ZZ: ["ZZ", "2Z"], "2RS": ["2RS", "2RS1"] };
    let conferidos = 0;
    for (const [codigo, leitura] of leiturasDoExemplo().leituras) {
      for (const atributo of leitura.atributos) {
        const escrito = (descricaoDe.get(codigo) ?? "").slice(atributo.trecho.inicio, atributo.trecho.fim);
        const aceitas =
          atributo.nome === "vedacao" ? escritasDaVedacao[atributo.valor] ?? [] : [atributo.valor];
        expect(aceitas).toContain(escrito.toUpperCase());
        conferidos++;
      }
    }
    expect(conferidos).toBeGreaterThan(100);
  });
});

describe("o que a demo planta para as fatias seguintes", () => {
  const { materiais, trocas, estoque } = exportacaoDaDemo();
  const { versaoRegras, leituras } = leiturasDoExemplo();
  const unificacao = agrupar(versaoRegras, leituras);
  const unidadeDe = new Map(materiais.map((m) => [m.codigo, m.unidade]));

  it("deixa saldo sob um código do grupo que a máquina nunca usou", () => {
    let casos = 0;
    for (const grupo of unificacao.grupos.values()) {
      const saldoPorCodigo = new Map<CodigoLegado, number>();
      for (const s of estoque) {
        if (grupo.codigos.includes(s.codigo)) saldoPorCodigo.set(s.codigo, (saldoPorCodigo.get(s.codigo) ?? 0) + s.quantidade);
      }
      const equipamentos = new Set(trocas.filter((t) => grupo.codigos.includes(t.codigo)).map((t) => t.patrimonio));
      for (const patrimonio of equipamentos) {
        const usados = new Set(trocas.filter((t) => t.patrimonio === patrimonio && grupo.codigos.includes(t.codigo)).map((t) => t.codigo));
        const sobOutro = [...saldoPorCodigo].some(([codigo, quantidade]) => quantidade > 0 && !usados.has(codigo));
        if (sobOutro) casos++;
      }
    }
    expect(casos).toBeGreaterThanOrEqual(6);
  });

  it("tem uma peça que a bomba B-104 lançou sob três códigos e tem saldo só sob um quarto código", () => {
    const hero = [...unificacao.grupos.values()].find((g) => {
      const usados = new Set(trocas.filter((t) => t.patrimonio === "004512" && g.codigos.includes(t.codigo)).map((t) => t.codigo));
      const soEstoque = g.codigos.filter((c) => !usados.has(c) && estoque.some((s) => s.codigo === c && s.quantidade > 0));
      return g.codigos.length === 4 && usados.size >= 3 && soEstoque.length === 1;
    });
    expect(hero).toBeDefined();
    const trocasDaBomba = trocas.filter((t) => t.patrimonio === "004512" && hero?.codigos.includes(t.codigo));
    expect(trocasDaBomba.length).toBeGreaterThanOrEqual(7);
  });

  it("tem grupo cujos códigos usam unidades diferentes, para a soma por unidade", () => {
    const misturado = [...unificacao.grupos.values()].filter(
      (g) => new Set(g.codigos.map((c) => unidadeDe.get(c))).size > 1,
    );
    expect(misturado.length).toBeGreaterThanOrEqual(1);
  });

  it("tem duas peças quase iguais, que só diferem na folga, com grupos separados", () => {
    const rotulos = [...unificacao.grupos.values()].map((g) => g.rotulo);
    expect(rotulos).toContain("Rolamento 6312-ZZ C3");
    expect(rotulos).toContain("Rolamento 6312-ZZ");
  });
});
