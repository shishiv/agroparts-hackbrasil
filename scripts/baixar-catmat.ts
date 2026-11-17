import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { acharSinaisDePrivacidade, type SinalDePrivacidade } from "./privacidade";

export const BASE = "https://dadosabertos.compras.gov.br/modulo-material";
export const FONTE = "API de Dados Abertos do Compras.gov.br, módulo material";
export const TAMANHO_DA_PAGINA = 500;
export const PDM_ROLAMENTO_DE_ESFERA = 11797;
export const ITENS_POR_PDM_DE_OUTRAS_PECAS = 30;

/** Peças de manutenção que não são rolamento. Servem de texto "fora das famílias" na demo. */
export const OUTRAS_PECAS = [
  { codigoPdm: 5892, nome: "correia de transmissão" },
  { codigoPdm: 11707, nome: "retentor" },
  { codigoPdm: 10954, nome: "polia" },
  { codigoPdm: 2052, nome: "acoplamento flexível" },
  { codigoPdm: 11992, nome: "selo mecânico" },
] as const;

export interface ItemCatmat {
  codigoItem: number;
  codigoGrupo: number;
  nomeGrupo: string;
  codigoClasse: number;
  nomeClasse: string;
  codigoPdm: number;
  nomePdm: string;
  descricaoItem: string;
  statusItem: boolean;
}

export interface ItemExcluido {
  codigoItem: number;
  motivo: SinalDePrivacidade[];
}

export interface ConjuntoDeItens {
  fonte: string;
  consultadoEm: string;
  consulta: string;
  itens: ItemCatmat[];
  excluidos: ItemExcluido[];
}

export interface ClasseDaArvore {
  codigoClasse: number;
  nomeClasse: string;
  statusClasse: boolean;
}

export interface GrupoDaArvore {
  codigoGrupo: number;
  nomeGrupo: string;
  statusGrupo: boolean;
  classes: ClasseDaArvore[];
}

export interface ArvoreDoCatmat {
  fonte: string;
  consultadoEm: string;
  grupos: GrupoDaArvore[];
}

export type Buscar = (url: string) => Promise<unknown>;

type Objeto = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);

function texto(registro: Objeto, campo: string): string {
  const v = registro[campo];
  if (typeof v !== "string") throw new Error(`campo ${campo} ausente ou sem texto na resposta da API`);
  return v;
}

function numero(registro: Objeto, campo: string): number {
  const v = registro[campo];
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new Error(`campo ${campo} ausente ou sem número inteiro na resposta da API`);
  }
  return v;
}

function booleano(registro: Objeto, campo: string): boolean {
  const v = registro[campo];
  if (typeof v !== "boolean") throw new Error(`campo ${campo} ausente ou sem verdadeiro/falso na resposta da API`);
  return v;
}

/** Percorre todas as páginas de uma rota e junta os registros. */
export async function lerPaginas(buscar: Buscar, rota: string, filtros: Record<string, number>): Promise<Objeto[]> {
  const registros: Objeto[] = [];
  for (let pagina = 1; ; pagina++) {
    const consulta = new URLSearchParams({
      pagina: String(pagina),
      tamanhoPagina: String(TAMANHO_DA_PAGINA),
      ...Object.fromEntries(Object.entries(filtros).map(([k, v]) => [k, String(v)])),
    });
    const resposta = await buscar(`${BASE}/${rota}?${consulta}`);
    if (!ehObjeto(resposta) || !Array.isArray(resposta.resultado)) {
      throw new Error(`resposta inesperada de ${rota}, página ${pagina}`);
    }
    for (const item of resposta.resultado) {
      if (!ehObjeto(item)) throw new Error(`registro inesperado em ${rota}, página ${pagina}`);
      registros.push(item);
    }
    const totalPaginas = resposta.totalPaginas;
    if (typeof totalPaginas !== "number") throw new Error(`totalPaginas ausente em ${rota}`);
    if (pagina >= totalPaginas) return registros;
  }
}

function comoItem(registro: Objeto): ItemCatmat {
  return {
    codigoItem: numero(registro, "codigoItem"),
    codigoGrupo: numero(registro, "codigoGrupo"),
    nomeGrupo: texto(registro, "nomeGrupo"),
    codigoClasse: numero(registro, "codigoClasse"),
    nomeClasse: texto(registro, "nomeClasse"),
    codigoPdm: numero(registro, "codigoPdm"),
    nomePdm: texto(registro, "nomePdm"),
    descricaoItem: texto(registro, "descricaoItem").trim(),
    statusItem: booleano(registro, "statusItem"),
  };
}

function separarExcluidos(itens: ItemCatmat[]): Pick<ConjuntoDeItens, "itens" | "excluidos"> {
  const aceitos: ItemCatmat[] = [];
  const excluidos: ItemExcluido[] = [];
  for (const item of itens) {
    const motivo = acharSinaisDePrivacidade(item.descricaoItem);
    if (motivo.length > 0) excluidos.push({ codigoItem: item.codigoItem, motivo });
    else aceitos.push(item);
  }
  return { itens: aceitos, excluidos };
}

const porCodigo = (a: ItemCatmat, b: ItemCatmat) => a.codigoItem - b.codigoItem;

export async function baixarRolamentos(buscar: Buscar, consultadoEm: string): Promise<ConjuntoDeItens> {
  const registros = await lerPaginas(buscar, "4_consultarItemMaterial", { codigoPdm: PDM_ROLAMENTO_DE_ESFERA });
  const itens = registros.map(comoItem).sort(porCodigo);
  return {
    fonte: FONTE,
    consultadoEm,
    consulta: `4_consultarItemMaterial, codigoPdm=${PDM_ROLAMENTO_DE_ESFERA}, todos os itens`,
    ...separarExcluidos(itens),
  };
}

export async function baixarOutrasPecas(buscar: Buscar, consultadoEm: string): Promise<ConjuntoDeItens> {
  const escolhidos: ItemCatmat[] = [];
  for (const { codigoPdm } of OUTRAS_PECAS) {
    const registros = await lerPaginas(buscar, "4_consultarItemMaterial", { codigoPdm });
    const ativos = registros
      .map(comoItem)
      .filter((item) => item.statusItem)
      .sort(porCodigo);
    escolhidos.push(...ativos.slice(0, ITENS_POR_PDM_DE_OUTRAS_PECAS));
  }
  const pdms = OUTRAS_PECAS.map((p) => p.codigoPdm).join(", ");
  return {
    fonte: FONTE,
    consultadoEm,
    consulta: `4_consultarItemMaterial, codigoPdm em [${pdms}], os ${ITENS_POR_PDM_DE_OUTRAS_PECAS} itens ativos de menor código de cada um`,
    ...separarExcluidos(escolhidos.sort(porCodigo)),
  };
}

export async function baixarArvore(buscar: Buscar, consultadoEm: string): Promise<ArvoreDoCatmat> {
  const grupos = (await lerPaginas(buscar, "1_consultarGrupoMaterial", {})).map((g) => ({
    codigoGrupo: numero(g, "codigoGrupo"),
    nomeGrupo: texto(g, "nomeGrupo").trim(),
    statusGrupo: booleano(g, "statusGrupo"),
    classes: [] as ClasseDaArvore[],
  }));
  const porGrupo = new Map(grupos.map((g) => [g.codigoGrupo, g]));
  for (const c of await lerPaginas(buscar, "2_consultarClasseMaterial", {})) {
    const grupo = porGrupo.get(numero(c, "codigoGrupo"));
    if (!grupo) throw new Error(`classe ${numero(c, "codigoClasse")} de um grupo que a API não listou`);
    grupo.classes.push({
      codigoClasse: numero(c, "codigoClasse"),
      nomeClasse: texto(c, "nomeClasse").trim(),
      statusClasse: booleano(c, "statusClasse"),
    });
  }
  for (const grupo of grupos) grupo.classes.sort((a, b) => a.codigoClasse - b.codigoClasse);
  grupos.sort((a, b) => a.codigoGrupo - b.codigoGrupo);
  return { fonte: FONTE, consultadoEm, grupos };
}

const TENTATIVAS = 4;

async function buscarComTentativas(url: string): Promise<unknown> {
  for (let tentativa = 1; ; tentativa++) {
    const resposta = await fetch(url, { headers: { accept: "application/json" } });
    if (resposta.ok) return resposta.json();
    const repetivel = resposta.status === 429 || resposta.status >= 500;
    if (!repetivel || tentativa === TENTATIVAS) {
      throw new Error(`${resposta.status} ${resposta.statusText} em ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * tentativa));
  }
}

export function hojeEmBrasilia(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

async function gravar(caminho: string, conteudo: unknown): Promise<void> {
  await Bun.write(caminho, `${JSON.stringify(conteudo, null, 2)}\n`);
}

async function principal(): Promise<void> {
  const consultadoEm = hojeEmBrasilia(new Date());
  const pasta = fileURLToPath(new URL("../dados/catmat/", import.meta.url));
  await mkdir(pasta, { recursive: true });

  const rolamentos = await baixarRolamentos(buscarComTentativas, consultadoEm);
  await gravar(`${pasta}rolamento-de-esfera-pdm-${PDM_ROLAMENTO_DE_ESFERA}.json`, rolamentos);
  const outras = await baixarOutrasPecas(buscarComTentativas, consultadoEm);
  await gravar(`${pasta}outras-pecas.json`, outras);
  const arvore = await baixarArvore(buscarComTentativas, consultadoEm);
  await gravar(`${pasta}arvore.json`, arvore);

  const classes = arvore.grupos.reduce((soma, g) => soma + g.classes.length, 0);
  console.log(
    `CATMAT consultado em ${consultadoEm}: ${rolamentos.itens.length} itens de rolamento ` +
      `(${rolamentos.excluidos.length} excluídos por formato de dado pessoal), ` +
      `${outras.itens.length} itens de outras peças (${outras.excluidos.length} excluídos), ` +
      `${arvore.grupos.length} grupos e ${classes} classes.`,
  );
}

if (import.meta.main) await principal();
