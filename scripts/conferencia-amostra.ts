import { readFileSync, writeFileSync } from "node:fs";

/**
 * bun run scripts/conferencia-amostra.ts
 *
 * Escreve `docs/medicao/conferencia-amostra.md` a partir de `docs/medicao/conferencia-amostra.json` e de `dados/gabarito/rotulos.json`.
 */

export type Resultado = "confere" | "nao-confere" | "nao-deu-para-conferir";
export type TipoDeItem = "familia" | "familia-fora" | "outra-peca";

export interface Medidas {
  d: number;
  D: number;
  B: number;
}

export interface FonteCitada {
  fonte: string;
  designacao: string;
  pagina: string | null;
}

export interface ItemConferido {
  codigoItem: number;
  tipo: TipoDeItem;
  referencia: string | null;
  resultado: Resultado;
  motivo: string;
  medidasDoCatalogo: Medidas | null;
  fontes: FonteCitada[];
}

export interface Conferencia {
  protocolo: string;
  conferidoEm: string;
  gabarito: string;
  conferidoPor: string;
  fontes: Record<string, { nome: string; url: string; observacao: string }>;
  itens: ItemConferido[];
}

export interface ItemRotulado {
  codigoItem: number;
  texto: string;
  decisao: string;
  peca?: string;
  motivo?: string;
}

const RAIZ = new URL("../", import.meta.url).pathname;
export const ARQUIVO_DA_CONFERENCIA = `${RAIZ}docs/medicao/conferencia-amostra.json`;
export const ARQUIVO_DO_RELATORIO = `${RAIZ}docs/medicao/conferencia-amostra.md`;
const ARQUIVO_DO_GABARITO = `${RAIZ}dados/gabarito/rotulos.json`;

const NOME_DO_RESULTADO: Record<Resultado, string> = {
  confere: "confere",
  "nao-confere": "não confere",
  "nao-deu-para-conferir": "não deu para conferir",
};

const rotuloEscrito = (item: ItemRotulado): string =>
  item.decisao === "resolve" ? `resolve ${item.peca}` : `${item.decisao}/${item.motivo}`;

const medidasEscritas = (m: Medidas): string => `${m.d} x ${m.D} x ${m.B} mm`;

function fonteEscrita(conferencia: Conferencia, citada: FonteCitada): string {
  const fonte = conferencia.fontes[citada.fonte];
  if (!fonte) throw new Error(`fonte desconhecida: ${citada.fonte}`);
  const pagina = citada.pagina === null ? "" : `, p. ${citada.pagina}`;
  return `[${citada.fonte}](${fonte.url})${pagina}: ${citada.designacao}`;
}

export function renderizarConferencia(conferencia: Conferencia, rotulados: ReadonlyMap<number, ItemRotulado>): string {
  const contagem = (r: Resultado): number => conferencia.itens.filter((i) => i.resultado === r).length;
  const divergentes = conferencia.itens.filter((i) => i.resultado === "nao-confere");
  const semTabela = conferencia.itens.filter((i) => i.resultado === "nao-deu-para-conferir");
  const linhas: string[] = [
    "# Conferência da amostra de 30 rótulos contra catálogos públicos",
    "",
    `Protocolo \`${conferencia.protocolo}\`, feito em ${conferencia.conferidoEm} sobre o gabarito \`${conferencia.gabarito}\`.`,
    "",
    `Conferido contra catálogo público, não revisado por pessoa. ${conferencia.conferidoPor}`,
    "",
    "Os 30 rótulos são os de `dados/gabarito/amostra-30.md`. Para cada rolamento, o diâmetro interno (d), o externo (D) e a largura (B) escritos no texto foram comparados com a tabela de um fabricante, e a série, a vedação e a folga foram lidas nas definições de sufixo do mesmo catálogo. Para as peças que não são rolamento, a conferência só confirma que o item não é um rolamento rígido de esferas da série 6.",
    "",
    "Os dados de cada item estão em `docs/medicao/conferencia-amostra.json`, e este arquivo sai dele com `bun run conferencia-amostra`.",
    "",
    "## Resultado",
    "",
    "| resultado | itens |",
    "|---|---:|",
    ...(["confere", "nao-confere", "nao-deu-para-conferir"] as const).map((r) => `| ${NOME_DO_RESULTADO[r]} | ${contagem(r)} |`),
    "",
    "## Divergências",
    "",
    ...(divergentes.length === 0
      ? ["Nenhum rótulo divergiu. O gabarito não mudou."]
      : divergentes.map((i) => `- item ${i.codigoItem}: ${i.motivo}`)),
    "",
    ...(semTabela.length === 0
      ? []
      : ["## Sem tabela para conferir", "", ...semTabela.map((i) => `- item ${i.codigoItem}: ${i.motivo}`), ""]),
    "## O que esta conferência não prova",
    "",
    "- Ela confere o que um catálogo diz sobre a referência. As regras de rotulagem (por exemplo, tratar LLU como sufixo desconhecido) continuam sendo escolhas do gabarito.",
    "- Os rótulos de recusa por contradição dependem de o texto dizer \"metálico e blindado\" junto de um código de borracha. O catálogo confirma o que cada código quer dizer, e não o que o texto quis dizer.",
    "- Os catálogos consultados são o da SKF e o da NTN. Um rolamento que só outro fabricante lista (como o 16011 ZZ) fica sem tabela para conferir.",
    "",
    "## Fontes",
    "",
    ...Object.entries(conferencia.fontes).map(([id, f]) => `- \`${id}\`: [${f.nome}](${f.url}) ${f.observacao}`),
    "",
    "## Item a item",
    "",
  ];
  conferencia.itens.forEach((item, n) => {
    const rotulado = rotulados.get(item.codigoItem);
    if (!rotulado) throw new Error(`o item ${item.codigoItem} não está no gabarito`);
    linhas.push(
      `### ${n + 1}. Item ${item.codigoItem}: ${NOME_DO_RESULTADO[item.resultado]}`,
      "",
      `> ${rotulado.texto}`,
      "",
      `- Rótulo do gabarito: \`${rotuloEscrito(rotulado)}\``,
      `- Referência lida: ${item.referencia === null ? "nenhuma" : `\`${item.referencia}\``}`,
      ...(item.medidasDoCatalogo ? [`- Medidas no catálogo: ${medidasEscritas(item.medidasDoCatalogo)}`] : []),
      `- ${item.motivo}`,
      ...item.fontes.map((f) => `- Fonte: ${fonteEscrita(conferencia, f)}`),
      "",
    );
  });
  return linhas.join("\n");
}

export function lerRotulados(json: string): Map<number, ItemRotulado> {
  const { itens } = JSON.parse(json) as { itens: ItemRotulado[] };
  return new Map(itens.map((i) => [i.codigoItem, i]));
}

if (import.meta.main) {
  const conferencia = JSON.parse(readFileSync(ARQUIVO_DA_CONFERENCIA, "utf8")) as Conferencia;
  const texto = renderizarConferencia(conferencia, lerRotulados(readFileSync(ARQUIVO_DO_GABARITO, "utf8")));
  writeFileSync(ARQUIVO_DO_RELATORIO, texto, "utf8");
  const por = (r: Resultado) => conferencia.itens.filter((i) => i.resultado === r).length;
  console.log(
    `Conferência gravada em docs/medicao/conferencia-amostra.md: ${por("confere")} conferem, ${por("nao-confere")} não conferem, ${por("nao-deu-para-conferir")} não deram para conferir.`,
  );
}
