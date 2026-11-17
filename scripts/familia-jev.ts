import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { TypeSafeClient, type Fetch } from "@typesafe-ai/sdk";
import type { ClasseCatmat, ErroDeLinha, Lido } from "../src/contrato";
import { ARQUIVOS, lerMateriais } from "../src/exportacao";
import { alvosDoJev } from "../src/familia/alvos";
import {
  escreverArquivoDeFamilias,
  NOME_DO_ARQUIVO,
  VERSAO_DO_ARQUIVO,
  type ArquivoDeFamilias,
  type ClasseDoArquivo,
} from "../src/familia/arquivo";
import { classesOferecidas, inverter, lerClassesDaArvore, type Classe } from "../src/familia/classes";
import { REGRA } from "../src/familia/decidir";
import {
  escreverAmostra,
  hashDe,
  lerAmostra,
  lerItemDaApi,
  semRepeticao,
  sortearItens,
  type Amostra,
  type ItemPublico,
} from "../src/familia/medicao/amostra";
import { avaliar, type RespostaMedida, type Resultados } from "../src/familia/medicao/avaliar";
import { PROTOCOLO } from "../src/familia/medicao/protocolo";
import { formatarRelatorio } from "../src/familia/medicao/relatorio";
import { escreverResultados, lerResultados } from "../src/familia/medicao/resultados";
import { interpretar, MODELO_DO_JEV, montarPedido, NENHUMA, type RespostaDoJev } from "../src/familia/pergunta";
import { emParalelo, sugerirVarias, type Jev } from "../src/familia/sugerir";
import { acharSinaisDePrivacidade } from "./privacidade";
import { hojeEmBrasilia, lerPaginas } from "./baixar-catmat";

const RAIZ = fileURLToPath(new URL("../", import.meta.url));
export const ARQUIVO_DAS_FAMILIAS = `${RAIZ}dados/demo/${NOME_DO_ARQUIVO}`;
const ARQUIVO_DA_ARVORE = `${RAIZ}dados/catmat/arvore.json`;
export const ARQUIVO_DA_AMOSTRA = `${RAIZ}docs/medicao/familia-amostra.json`;
export const ARQUIVO_DAS_RESPOSTAS = `${RAIZ}docs/medicao/familia-respostas.json`;
export const ARQUIVO_DO_RELATORIO = `${RAIZ}docs/medicao/familia.md`;
const SIMULTANEAS = 4;
const FONTE = "API de Dados Abertos do Compras.gov.br, módulo material";

function descreverErros(erros: readonly ErroDeLinha[]): string {
  return erros
    .slice(0, 5)
    .map((e) => `  ${e.arquivo} ${e.coluna}: ${e.problema}`)
    .join("\n");
}

function ou<T>(lido: Lido<T>, arquivo: string): T {
  if (!lido.ok) throw new Error(`${arquivo} ilegível:\n${descreverErros(lido.erros)}`);
  return lido.valor;
}

/**
 * O SDK 0.7.0 no Bun 1.4.0 falha de vez em quando com `TypeError: Body already used` ao ler uma resposta 200.
 * Antes de ler, ele tira uma cópia da resposta e lê o corpo dos dois lados. Uma resposta já inteira
 * na memória, cuja cópia vem sem corpo, faz o SDK pular essa leitura.
 */
class RespostaInteira extends Response {
  override clone(): Response {
    return new Response(null);
  }
}

export const fetchComCorpoInteiro: Fetch = async (entrada, inicio) => {
  const resposta = await fetch(entrada, inicio);
  return new RespostaInteira(await resposta.arrayBuffer(), {
    status: resposta.status,
    statusText: resposta.statusText,
    headers: resposta.headers,
  });
};

function jevDaRede(): Jev {
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY não está definida no ambiente");
  const cliente = new TypeSafeClient({ timeout: 60_000, fetch: fetchComCorpoInteiro });
  return (pedido) => cliente.systemOne({ state: pedido.state, questions: pedido.questions, model: MODELO_DO_JEV });
}

export interface Contagem {
  /** Pedidos que o script mandou à rede nesta execução. O SDK pode repetir um pedido por 429 ou 5xx, e isso não entra aqui. */
  chamadas: number;
  doCache: number;
}

/** Guarda cada resposta em disco, para que repetir o comando não gaste uma segunda chamada. */
export function comCache(jev: Jev, pasta: string, contagem: Contagem): Jev {
  return async (pedido) => {
    const chave = createHash("sha256").update(JSON.stringify([MODELO_DO_JEV, pedido])).digest("hex").slice(0, 32);
    const arquivo = `${pasta}/${chave}.json`;
    try {
      const guardada = JSON.parse(await readFile(arquivo, "utf8")) as { resposta: RespostaDoJev };
      contagem.doCache++;
      return guardada.resposta;
    } catch {
      const resposta = await jev(pedido);
      contagem.chamadas++;
      await mkdir(pasta, { recursive: true });
      await writeFile(arquivo, JSON.stringify({ descricao: pedido.state.descricao, resposta }));
      return resposta;
    }
  };
}

async function classesDaArvore(): Promise<readonly Classe[]> {
  return ou(lerClassesDaArvore(await readFile(ARQUIVO_DA_ARVORE, "utf8")), "arvore.json");
}

async function comandoDemo(pastaDoCache: string): Promise<void> {
  const classes = classesOferecidas(await classesDaArvore());
  const materiais = ou(lerMateriais(await readFile(`${RAIZ}dados/demo/${ARQUIVOS.materiais}`, "utf8")), "materiais.csv");
  const alvos = alvosDoJev(materiais);

  const contagem: Contagem = { chamadas: 0, doCache: 0 };
  const jev = comCache(jevDaRede(), pastaDoCache, contagem);
  const sugestoes = await sugerirVarias(jev, classes, alvos.comTexto, SIMULTANEAS);

  const usadas = new Set<ClasseCatmat>();
  for (const s of sugestoes) {
    if (s.resposta.tipo === "classe") usadas.add(s.resposta.classe);
    if (s.jev.escolha !== NENHUMA) usadas.add(s.jev.escolha);
  }
  const nomes = new Map<ClasseCatmat, ClasseDoArquivo>();
  for (const classe of classes) {
    if (usadas.has(classe.codigo)) nomes.set(classe.codigo, { nome: classe.nome, grupo: classe.nomeGrupo });
  }

  const modelo = sugestoes[0]?.modelo;
  if (modelo === undefined) throw new Error("não há códigos para sugerir");
  const arquivo: ArquivoDeFamilias = {
    versao: VERSAO_DO_ARQUIVO,
    modelo,
    geradoEm: hojeEmBrasilia(new Date()),
    regra: REGRA,
    classes: nomes,
    semTexto: alvos.semTexto,
    sugestoes: new Map(sugestoes.map((s) => [s.codigo, s])),
  };
  await writeFile(ARQUIVO_DAS_FAMILIAS, escreverArquivoDeFamilias(arquivo));

  for (const s of sugestoes) {
    const quem = s.resposta.tipo === "classe" ? `${s.resposta.classe} ${nomes.get(s.resposta.classe)?.nome ?? ""}` : "nenhuma";
    const descricao = alvos.comTexto.find((m) => m.codigo === s.codigo)?.descricao ?? "";
    console.log(`${s.codigo} p=${s.probabilidade.toFixed(2)} noul=${s.jev.noul.toFixed(2)} ${quem.slice(0, 50)} <- ${descricao.slice(0, 50)}`);
  }
  console.log(
    `familia-jev demo: ${sugestoes.length} sugestões, ${alvos.semTexto.length} sem texto; ${classes.length} classes oferecidas; ` +
      `${contagem.chamadas} chamadas ao Jev, ${contagem.doCache} do cache.`,
  );
}

const PAUSA_ENTRE_TENTATIVAS_MS = 1000;

async function buscar(url: string): Promise<unknown> {
  for (let tentativa = 1; ; tentativa++) {
    const resposta = await fetch(url, { headers: { accept: "application/json" } });
    if (resposta.ok) return resposta.json();
    if ((resposta.status !== 429 && resposta.status < 500) || tentativa === 4) {
      throw new Error(`${resposta.status} ${resposta.statusText} em ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, PAUSA_ENTRE_TENTATIVAS_MS * tentativa));
  }
}

async function comandoAmostrar(): Promise<void> {
  const todas = await classesDaArvore();
  const oferecidas = new Set(classesOferecidas(todas).map((c) => c.codigo as string));
  const { classesDentro, classesFora, itensPorClasse, semente } = PROTOCOLO;
  for (const codigo of classesDentro) if (!oferecidas.has(codigo)) throw new Error(`a classe ${codigo} não é oferecida ao Jev`);
  for (const codigo of classesFora) if (oferecidas.has(codigo)) throw new Error(`a classe ${codigo} é oferecida ao Jev`);

  const classes: Amostra["classes"][number][] = [];
  const itens: ItemPublico[] = [];
  for (const codigo of [...classesDentro, ...classesFora]) {
    const classe = todas.find((c) => c.codigo === codigo);
    if (!classe) throw new Error(`a classe ${codigo} não está na árvore do CATMAT`);
    const registros = await lerPaginas(buscar, "4_consultarItemMaterial", { codigoClasse: Number(codigo) });
    const publicos = registros
      .map(lerItemDaApi)
      .filter((i): i is ItemPublico => i !== null && i.codigoClasse === codigo && acharSinaisDePrivacidade(i.descricao).length === 0);
    const sorteados = sortearItens(publicos, itensPorClasse, semente);
    if (sorteados.length < itensPorClasse) throw new Error(`a classe ${codigo} só tem ${sorteados.length} itens para sortear`);
    classes.push({ codigo, nome: classe.nome, grupo: classe.nomeGrupo, dentro: oferecidas.has(codigo), candidatos: semRepeticao(publicos).length });
    itens.push(...sorteados);
    console.log(`${codigo} ${classe.nome.slice(0, 50)}: ${registros.length} itens, ${semRepeticao(publicos).length} candidatos`);
  }
  const amostra: Amostra = { fonte: FONTE, consultadoEm: hojeEmBrasilia(new Date()), protocolo: PROTOCOLO.versao, semente, classes, itens };
  await writeFile(ARQUIVO_DA_AMOSTRA, escreverAmostra(amostra));
  console.log(`familia-jev amostrar: ${itens.length} itens em ${classes.length} classes.`);
}

async function lerDaAmostra(): Promise<Amostra> {
  return ou(lerAmostra(await readFile(ARQUIVO_DA_AMOSTRA, "utf8")), "familia-amostra.json");
}

async function comandoMedir(pastaDoCache: string): Promise<void> {
  const amostra = await lerDaAmostra();
  const classes = classesOferecidas(await classesDaArvore());
  const invertidas = inverter(classes);
  const dentro = new Set(amostra.classes.filter((c) => c.dentro).map((c) => c.codigo));
  const naInversao = new Set(
    amostra.itens
      .filter((i) => dentro.has(i.codigoClasse))
      .map((i) => ({ i, h: hashDe(`inversao:${i.codigoItem}`) }))
      .sort((a, b) => a.h - b.h || a.i.codigoItem - b.i.codigoItem)
      .slice(0, PROTOCOLO.itensNaInversao)
      .map(({ i }) => i.codigoItem),
  );

  const pedidos = amostra.itens.flatMap((item) => [
    { item, ordem: "crescente" as const },
    ...(naInversao.has(item.codigoItem) ? [{ item, ordem: "invertida" as const }] : []),
  ]);
  const contagem: Contagem = { chamadas: 0, doCache: 0 };
  const jev = comCache(jevDaRede(), pastaDoCache, contagem);
  let modelo = "";
  let tokensDeEntrada = 0;
  const respostas: readonly RespostaMedida[] = await emParalelo(pedidos, SIMULTANEAS, async ({ item, ordem }) => {
    const opcoes = ordem === "crescente" ? classes : invertidas;
    const resposta = await jev(montarPedido(item.descricao, opcoes));
    const bruto = interpretar(opcoes, resposta);
    modelo = bruto.modelo;
    tokensDeEntrada += resposta.usage.input_tokens ?? 0;
    return { codigoItem: item.codigoItem, ordem, escolha: bruto.escolha, probabilidadeDaEscolha: bruto.probabilidadeDaEscolha, noul: bruto.noul };
  });

  const resultados: Resultados = { modelo, chamadas: pedidos.length, tokensDeEntrada, respostas };
  await writeFile(ARQUIVO_DAS_RESPOSTAS, escreverResultados(resultados));
  console.log(
    `familia-jev medir: ${pedidos.length} pedidos distintos; ${contagem.chamadas} foram à rede agora e ${contagem.doCache} vieram do cache.`,
  );
  await comandoRelatorio();
}

async function comandoRelatorio(): Promise<void> {
  const amostra = await lerDaAmostra();
  const oferecidas = classesOferecidas(await classesDaArvore());
  let resultados: Resultados | null = null;
  try {
    resultados = ou(lerResultados(await readFile(ARQUIVO_DAS_RESPOSTAS, "utf8")), "familia-respostas.json");
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
  }
  const medicao = resultados ? { resultados, avaliacao: avaliar(amostra, resultados, PROTOCOLO) } : null;
  await writeFile(ARQUIVO_DO_RELATORIO, formatarRelatorio({ protocolo: PROTOCOLO, amostra, classesOferecidas: oferecidas, medicao }));
  console.log(`familia-jev relatorio: docs/medicao/familia.md ${medicao ? "com resultado" : "só com o protocolo"}.`);
}

async function principal(): Promise<void> {
  const [comando = "", ...resto] = process.argv.slice(2);
  const cache = resto.find((a) => a.startsWith("--cache="))?.slice("--cache=".length) ?? `${RAIZ}node_modules/.cache/familia-jev`;
  if (comando === "demo") return comandoDemo(cache);
  if (comando === "amostrar") return comandoAmostrar();
  if (comando === "medir") return comandoMedir(cache);
  if (comando === "relatorio") return comandoRelatorio();
  console.error("uso: bun run familia-jev <demo|amostrar|medir|relatorio> [--cache=<pasta>]");
  process.exit(2);
}

if (import.meta.main) await principal();
