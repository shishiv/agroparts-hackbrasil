/**
 * Monta `rotulos.json` e `amostra-30.md` a partir dos textos do CATMAT e dos
 * arquivos dos dois rotuladores. Só junta e confere: não decide rótulo.
 *
 * Uso: bun run dados/gabarito/montar.ts
 */
import { readFile, writeFile } from "node:fs/promises";

const RAIZ = new URL("../../", import.meta.url).pathname;
const CATMAT = ["rolamento-de-esfera-pdm-11797", "outras-pecas"] as const;
const SEMENTE_DA_AMOSTRA = 20261117;
const COTAS_DA_AMOSTRA = { resolve: 12, revisa: 8, contradicao: 4, "fora-das-familias": 6 } as const;

type Vedacao = "ABERTO" | "Z" | "ZZ" | "RS" | "2RS";
type Folga = "C1" | "C2" | "C3" | "C4" | "C5" | "CN";

interface Provas {
  serie?: string | null;
  vedacao?: string | null;
  folga?: string | null;
}

type Rotulo =
  | { codigoItem: number; decisao: "resolve"; serie: string; vedacao: Vedacao; folga: Folga; provas: Provas; nota: string }
  | { codigoItem: number; decisao: "revisa"; motivo: "sufixo-desconhecido" | "designacao-ausente" | "duas-leituras"; nota: string }
  | { codigoItem: number; decisao: "recusa"; motivo: "sem-texto" | "fora-das-familias" | "contradicao"; nota: string };

interface Texto {
  codigoItem: number;
  arquivo: (typeof CATMAT)[number];
  texto: string;
}

async function lerJson<T>(caminho: string): Promise<T> {
  return JSON.parse(await readFile(caminho, "utf8")) as T;
}

interface Correcao {
  codigoItem: number;
  decisao: "revisa";
  motivo: "sufixo-desconhecido";
  porque: string;
}

async function lerJsonl(caminho: string): Promise<Rotulo[]> {
  const linhas = (await readFile(caminho, "utf8")).trim().split("\n");
  return linhas.map((linha) => JSON.parse(linha) as Rotulo);
}

async function textosDoCatmat(): Promise<Texto[]> {
  const textos: Texto[] = [];
  for (const arquivo of CATMAT) {
    const { itens } = await lerJson<{ itens: { codigoItem: number; descricaoItem: string }[] }>(
      `${RAIZ}dados/catmat/${arquivo}.json`,
    );
    for (const item of itens) textos.push({ codigoItem: item.codigoItem, arquivo, texto: item.descricaoItem });
  }
  return textos.sort((a, b) => a.codigoItem - b.codigoItem);
}

function indexar(rotulos: readonly Rotulo[], nome: string): Map<number, Rotulo> {
  const mapa = new Map<number, Rotulo>();
  for (const rotulo of rotulos) {
    if (mapa.has(rotulo.codigoItem)) throw new Error(`${nome}: o item ${rotulo.codigoItem} aparece duas vezes`);
    mapa.set(rotulo.codigoItem, rotulo);
  }
  return mapa;
}

function resumo(rotulo: Rotulo): string {
  if (rotulo.decisao === "resolve") return `resolve ${rotulo.serie} ${rotulo.vedacao} ${rotulo.folga}`;
  return `${rotulo.decisao}/${rotulo.motivo}`;
}

function maisCurta(a: string | null | undefined, b: string | null | undefined): string | null {
  const candidatas = [a, b].filter((p): p is string => typeof p === "string" && p.length > 0);
  return candidatas.sort((x, y) => x.length - y.length)[0] ?? null;
}

class Sorteio {
  private estado: number;
  constructor(semente: number) {
    this.estado = semente >>> 0;
  }
  proximo(): number {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

function sortear<T>(itens: readonly T[], quantos: number, sorteio: Sorteio): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio.proximo() * (i + 1));
    [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  }
  return copia.slice(0, quantos);
}

const NOME_DO_MOTIVO: Record<string, string> = {
  "sufixo-desconhecido": "falta o código de vedação, ou ele não é um dos conhecidos",
  "designacao-ausente": "é rolamento, mas o texto não traz referência nenhuma",
  "duas-leituras": "o texto traz duas referências diferentes",
  "fora-das-familias": "não é rolamento rígido de esferas da série 6",
  contradicao: "o texto diz duas coisas que não podem ser verdade juntas",
  "sem-texto": "descrição vazia",
};

function rotuloPorExtenso(rotulo: Rotulo): string {
  if (rotulo.decisao === "resolve") {
    const folga = rotulo.folga === "CN" ? "folga normal (CN)" : `folga ${rotulo.folga}`;
    return `**resolve**: rolamento ${rotulo.serie}, vedação ${rotulo.vedacao}, ${folga}`;
  }
  return `**${rotulo.decisao}** (${rotulo.motivo}): ${NOME_DO_MOTIVO[rotulo.motivo]}`;
}

async function principal(): Promise<void> {
  const textos = await textosDoCatmat();
  const a = indexar(await lerJsonl(`${RAIZ}dados/gabarito/rotuladores/rotulador-a.jsonl`), "rotulador A");
  const b = indexar(await lerJsonl(`${RAIZ}dados/gabarito/rotuladores/rotulador-b.jsonl`), "rotulador B");
  if (a.size !== textos.length || b.size !== textos.length) {
    throw new Error(`esperava ${textos.length} rótulos de cada rotulador, vieram ${a.size} e ${b.size}`);
  }

  const correcoes = new Map(
    (await lerJson<{ correcoes: Correcao[] }>(`${RAIZ}dados/gabarito/correcoes.json`)).correcoes.map((c) => [c.codigoItem, c]),
  );
  const itens: Record<string, unknown>[] = [];
  const rotulosFinais = new Map<number, Rotulo>();
  for (const { codigoItem, arquivo, texto } of textos) {
    const ra = a.get(codigoItem);
    const rb = b.get(codigoItem);
    if (!ra || !rb) throw new Error(`item ${codigoItem} sem rótulo de algum rotulador`);
    if (resumo(ra) !== resumo(rb)) {
      throw new Error(`os rotuladores discordam no item ${codigoItem} (${resumo(ra)} contra ${resumo(rb)}): arbitre pelas regras antes de montar`);
    }
    const duvida = ra.nota.startsWith("DÚVIDA:") ? ra.nota.slice("DÚVIDA:".length).trim() : null;
    const base = { codigoItem, arquivo, texto, decisao: rb.decisao };
    if (rb.decisao === "resolve" && ra.decisao === "resolve") {
      const provas = {
        serie: maisCurta(ra.provas.serie, rb.provas.serie),
        vedacao: maisCurta(ra.provas.vedacao, rb.provas.vedacao),
        folga: maisCurta(ra.provas.folga, rb.provas.folga),
      };
      itens.push({
        ...base,
        peca: `${rb.serie} ${rb.vedacao} ${rb.folga}`,
        serie: rb.serie,
        vedacao: rb.vedacao,
        folga: rb.folga,
        provas,
        nota: rb.nota,
        ...(duvida ? { duvida } : {}),
        conferencia: "os dois rotuladores concordaram",
      });
    } else if (rb.decisao !== "resolve") {
      itens.push({
        ...base,
        motivo: rb.motivo,
        nota: rb.nota,
        ...(duvida ? { duvida } : {}),
        conferencia: "os dois rotuladores concordaram",
      });
    }
    const correcao = correcoes.get(codigoItem);
    if (correcao) {
      const corrigido: Rotulo = { codigoItem, decisao: correcao.decisao, motivo: correcao.motivo, nota: correcao.porque };
      const [atual] = itens.splice(itens.length - 1, 1);
      itens.push({
        codigoItem,
        arquivo,
        texto,
        decisao: corrigido.decisao,
        motivo: corrigido.motivo,
        nota: corrigido.nota,
        conferencia: `os dois rotuladores deram ${atual?.decisao}; corrigido depois, ver correcoes.json`,
      });
      rotulosFinais.set(codigoItem, corrigido);
      continue;
    }
    rotulosFinais.set(codigoItem, rb);
  }
  for (const codigo of correcoes.keys()) {
    if (!rotulosFinais.has(codigo)) throw new Error(`correção para um item que não existe: ${codigo}`);
  }

  const gruposPorPeca = new Map<string, number[]>();
  for (const item of itens) {
    if (item.decisao !== "resolve") continue;
    const peca = item.peca as string;
    gruposPorPeca.set(peca, [...(gruposPorPeca.get(peca) ?? []), item.codigoItem as number]);
  }
  const grupos = [...gruposPorPeca]
    .map(([peca, ids]) => ({ peca, itens: ids.sort((x, y) => x - y) }))
    .sort((x, y) => (x.peca < y.peca ? -1 : x.peca > y.peca ? 1 : 0));

  const cabecalho = {
    versao: "gabarito-1",
    fonte: "dados/catmat/rolamento-de-esfera-pdm-11797.json e dados/catmat/outras-pecas.json, consultados em 2026-11-16",
    regras: "dados/gabarito/regras-de-rotulagem.md",
    rotuladores: ["Claude Opus 5.5", "GPT-5.6 Sol"],
  };
  const linhas = [
    "{",
    ...Object.entries(cabecalho).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`),
    '  "itens": [',
    itens.map((i) => `    ${JSON.stringify(i)}`).join(",\n"),
    "  ],",
    '  "grupos": [',
    grupos.map((g) => `    ${JSON.stringify(g)}`).join(",\n"),
    "  ]",
    "}",
    "",
  ];
  await writeFile(`${RAIZ}dados/gabarito/rotulos.json`, linhas.join("\n"), "utf8");

  const porId = new Map(textos.map((t) => [t.codigoItem, t]));
  const sorteio = new Sorteio(SEMENTE_DA_AMOSTRA);
  const chave = (rotulo: Rotulo): keyof typeof COTAS_DA_AMOSTRA =>
    rotulo.decisao === "resolve" ? "resolve" : rotulo.decisao === "revisa" ? "revisa" : (rotulo.motivo as "contradicao" | "fora-das-familias");
  const amostra: Rotulo[] = [];
  for (const [estrato, cota] of Object.entries(COTAS_DA_AMOSTRA) as [keyof typeof COTAS_DA_AMOSTRA, number][]) {
    const candidatos = [...rotulosFinais.values()].filter((r) => chave(r) === estrato).sort((x, y) => x.codigoItem - y.codigoItem);
    amostra.push(...sortear(candidatos, cota, sorteio));
  }
  const ordem = sortear(amostra, amostra.length, sorteio);

  const md = [
    "# Amostra de 30 rótulos",
    "",
    "Estes 30 rótulos foram conferidos contra catálogos públicos de fabricantes, e não revisados por pessoa. O resultado de cada item está em `docs/medicao/conferencia-amostra.md`. As regras que definem cada rótulo estão em `dados/gabarito/regras-de-rotulagem.md`.",
    "",
    `Sorteio com a semente ${SEMENTE_DA_AMOSTRA}, por faixa: ${Object.entries(COTAS_DA_AMOSTRA).map(([k, v]) => `${v} ${k}`).join(", ")}. A ordem abaixo está embaralhada.`,
    "",
    ...ordem.flatMap((rotulo, n) => [
      `## ${n + 1}. Item ${rotulo.codigoItem}`,
      "",
      `> ${porId.get(rotulo.codigoItem)?.texto ?? ""}`,
      "",
      `Rótulo: ${rotuloPorExtenso(rotulo)}`,
      "",
      `Por quê: ${rotulo.nota}`,
      "",
    ]),
  ];
  await writeFile(`${RAIZ}dados/gabarito/amostra-30.md`, md.join("\n"), "utf8");

  const contagem = new Map<string, number>();
  for (const r of rotulosFinais.values()) contagem.set(resumo(r).split(" ")[0] ?? "", (contagem.get(resumo(r).split(" ")[0] ?? "") ?? 0) + 1);
  console.log(`${itens.length} rótulos, ${grupos.length} grupos, ${[...contagem].map(([k, v]) => `${v} ${k}`).join(", ")}`);
}

if (import.meta.main) await principal();
