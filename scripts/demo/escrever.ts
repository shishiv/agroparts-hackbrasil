import { COLUNAS_DO_CONSUMO } from "../../src/exportacao";
import type { ParticaoEsperadaJson, UnificacaoDeExemploJson } from "../../src/exportacao";
import type { UsinaDemo } from "./usina";

export const NOMES_DOS_ARQUIVOS = [
  "equipamentos.csv",
  "materiais.csv",
  "consumo.csv",
  "estoque.csv",
  "esperado-particao.json",
  "unificacao-de-exemplo.json",
  "esperado-skus.json",
] as const;

export type NomeDoArquivo = (typeof NOMES_DOS_ARQUIVOS)[number];

export type Veredicto = "coerente" | "mistura" | "inconclusivo";

export interface EsperadoSkus {
  regra: string;
  skus: { sku: string; veredicto: Veredicto; codigos: string[]; grupos: string[][]; semGrupo: string[] }[];
  fragmentacoes: { codigos: string[]; skus: string[] }[];
  resumo: { coerentes: number; misturas: number; inconclusivos: number; fragmentacoes: number };
}

const REGRA_DOS_SKUS =
  "Mistura: o SKU tem códigos de dois ou mais grupos. Inconclusivo: não é mistura e tem código sem grupo " +
  "(decisão revisa ou recusa). Coerente: todos os códigos do SKU estão no mesmo grupo. Fragmentação: grupo " +
  "com códigos em dois ou mais SKUs. Código sem SKU fica de fora de tudo.";

function campoCsv(valor: string): string {
  const precisaAspas = /[;"\r\n]/.test(valor) || valor !== valor.trim();
  return precisaAspas ? `"${valor.replaceAll('"', '""')}"` : valor;
}

function csv(cabecalho: readonly string[], linhas: readonly (readonly string[])[]): string {
  return [cabecalho, ...linhas].map((linha) => linha.map(campoCsv).join(";")).join("\n") + "\n";
}

function dataBrasileira(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function numeroBrasileiro(n: number): string {
  return String(n).replace(".", ",");
}

/** JSON com um item por linha nas listas de primeiro nível, para a revisão ler o diff. */
function jsonEmLinhas(raiz: Record<string, unknown>): string {
  const partes = Object.entries(raiz).map(([chave, valor]) => {
    if (!Array.isArray(valor)) return `  ${JSON.stringify(chave)}: ${JSON.stringify(valor)}`;
    const itens = valor.map((item) => `    ${JSON.stringify(item)}`).join(",\n");
    return `  ${JSON.stringify(chave)}: [\n${itens}\n  ]`;
  });
  return `{\n${partes.join(",\n")}\n}\n`;
}

const porTexto = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function particaoEsperada(usina: UsinaDemo): ParticaoEsperadaJson {
  const porParte = new Map<string, string[]>();
  for (const m of usina.materiais) {
    if (m.parte === null) continue;
    porParte.set(m.parte, [...(porParte.get(m.parte) ?? []), m.codigo]);
  }
  return {
    decisoes: usina.materiais.map((m) => ({ codigo: m.codigo, decisao: m.leitura.decisao })),
    grupos: [...porParte.values()].map((codigos) => codigos.sort(porTexto)).sort((a, b) => porTexto(a[0] ?? "", b[0] ?? "")),
  };
}

export function unificacaoDeExemplo(usina: UsinaDemo): UnificacaoDeExemploJson {
  return {
    versaoRegras: "exemplo-do-gerador-1",
    leituras: usina.materiais.map((m) => ({ codigo: m.codigo, leitura: m.leitura })),
  };
}

export function esperadoSkus(usina: UsinaDemo): EsperadoSkus {
  const grupoDe = new Map<string, string>();
  for (const m of usina.materiais) if (m.parte !== null) grupoDe.set(m.codigo, m.parte);

  const codigosPorSku = new Map<string, string[]>();
  const skusPorGrupo = new Map<string, Set<string>>();
  for (const m of usina.materiais) {
    if (m.sku === null) continue;
    codigosPorSku.set(m.sku, [...(codigosPorSku.get(m.sku) ?? []), m.codigo]);
    const grupo = grupoDe.get(m.codigo);
    if (grupo !== undefined) skusPorGrupo.set(grupo, (skusPorGrupo.get(grupo) ?? new Set()).add(m.sku));
  }

  const skus = [...codigosPorSku]
    .sort(([a], [b]) => porTexto(a, b))
    .map(([sku, codigos]) => {
      const porGrupo = new Map<string, string[]>();
      const semGrupo: string[] = [];
      for (const codigo of codigos) {
        const grupo = grupoDe.get(codigo);
        if (grupo === undefined) semGrupo.push(codigo);
        else porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), codigo]);
      }
      const veredicto: Veredicto = porGrupo.size >= 2 ? "mistura" : semGrupo.length > 0 ? "inconclusivo" : "coerente";
      return {
        sku,
        veredicto,
        codigos,
        grupos: [...porGrupo.values()].sort((a, b) => porTexto(a[0] ?? "", b[0] ?? "")),
        semGrupo,
      };
    });

  const particao = particaoEsperada(usina);
  const fragmentacoes = particao.grupos
    .map((codigos) => {
      const primeiro = codigos[0];
      const parte = primeiro === undefined ? undefined : grupoDe.get(primeiro);
      return { codigos, skus: [...(skusPorGrupo.get(parte ?? "") ?? [])].sort(porTexto) };
    })
    .filter((f) => f.skus.length >= 2);

  const conta = (v: Veredicto) => skus.filter((s) => s.veredicto === v).length;
  return {
    regra: REGRA_DOS_SKUS,
    skus,
    fragmentacoes,
    resumo: {
      coerentes: conta("coerente"),
      misturas: conta("mistura"),
      inconclusivos: conta("inconclusivo"),
      fragmentacoes: fragmentacoes.length,
    },
  };
}

export function arquivosDaDemo(usina: UsinaDemo): Record<NomeDoArquivo, string> {
  return {
    "equipamentos.csv": csv(
      ["patrimonio", "tag", "nome", "area"],
      usina.equipamentos.map((e) => [e.patrimonio, e.tag, e.nome, e.area]),
    ),
    "materiais.csv": csv(
      ["codigo", "descricao", "unidade", "sku"],
      usina.materiais.map((m) => [m.codigo, m.descricao, m.unidade, m.sku ?? ""]),
    ),
    "consumo.csv": csv(
      COLUNAS_DO_CONSUMO,
      usina.trocas.map((t) => [
        t.ordem,
        dataBrasileira(t.data),
        t.patrimonio,
        t.tipo,
        t.descricaoOrdem,
        t.codigo,
        t.descricaoMaterial,
        numeroBrasileiro(t.quantidade),
        t.unidade,
        t.posicao ?? "",
      ]),
    ),
    "estoque.csv": csv(
      ["codigo", "quantidade", "unidade", "endereco"],
      usina.estoque.map((s) => [s.codigo, numeroBrasileiro(s.quantidade), s.unidade, s.endereco ?? ""]),
    ),
    "esperado-particao.json": jsonEmLinhas({ ...particaoEsperada(usina) }),
    "unificacao-de-exemplo.json": jsonEmLinhas({ ...unificacaoDeExemplo(usina) }),
    "esperado-skus.json": jsonEmLinhas({ ...esperadoSkus(usina) }),
  };
}
