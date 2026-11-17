import type { ChaveIdentidade, Leitura, NaoVazia } from "../contrato";
import type { FalhaDaTranscricao } from "./audio";

export type OrigemDaFala = "sintetizada" | "gravada";

export interface Fala {
  arquivo: string;
  /** O texto que a peça tem escrito, do jeito que a usina o escreveria. Tem de resolver no motor. */
  esperado: string;
  /** O que a pessoa disse, para quem lê a tabela. */
  dito: string | null;
  voz: string | null;
}

export interface Manifesto {
  origem: OrigemDaFala;
  descricao: string;
  falas: NaoVazia<Fala>;
}

export type ManifestoLido = { ok: true; manifesto: Manifesto } | { ok: false; problemas: readonly string[] };

const objeto = (valor: unknown): valor is Record<string, unknown> => typeof valor === "object" && valor !== null && !Array.isArray(valor);

const textoNaoVazio = (valor: unknown): valor is string => typeof valor === "string" && valor.trim() !== "";

function lerFala(fala: unknown, onde: string, problemas: string[]): Fala | null {
  if (!objeto(fala)) {
    problemas.push(`${onde} tem de ser um objeto`);
    return null;
  }
  const { arquivo, esperado, dito, voz } = fala;
  if (!textoNaoVazio(arquivo)) problemas.push(`${onde}.arquivo tem de ser o nome de um arquivo`);
  if (!textoNaoVazio(esperado)) problemas.push(`${onde}.esperado tem de ser o texto da peça, como a usina escreve`);
  if (!textoNaoVazio(arquivo) || !textoNaoVazio(esperado)) return null;
  return { arquivo, esperado, dito: textoNaoVazio(dito) ? dito : null, voz: textoNaoVazio(voz) ? voz : null };
}

/** Lê `falas.json`, o arquivo que acompanha a pasta de gravações. */
export function lerManifesto(json: unknown): ManifestoLido {
  if (!objeto(json)) return { ok: false, problemas: ["falas.json tem de ser um objeto"] };
  const problemas: string[] = [];
  const { origem, descricao, falas } = json;
  const origemLida = origem === "sintetizada" || origem === "gravada" ? origem : null;
  if (origemLida === null) problemas.push('"origem" tem de ser "sintetizada" ou "gravada"');
  if (!textoNaoVazio(descricao)) problemas.push('"descricao" tem de ser um texto');
  if (!Array.isArray(falas) || falas.length === 0) problemas.push('"falas" tem de ser uma lista com pelo menos uma fala');
  const lidas = (Array.isArray(falas) ? falas : []).map((fala: unknown, i) => lerFala(fala, `falas[${i}]`, problemas));
  const [primeira, ...resto] = lidas.filter((fala): fala is Fala => fala !== null);
  if (problemas.length > 0 || origemLida === null || !textoNaoVazio(descricao) || primeira === undefined) return { ok: false, problemas };
  return { ok: true, manifesto: { origem: origemLida, descricao, falas: [primeira, ...resto] } };
}

export type Resultado =
  | { tipo: "certa" }
  | { tipo: "chave-errada"; rotulo: string }
  | { tipo: "para-a-pessoa"; leitura: Exclude<Leitura, { decisao: "resolve" }> }
  | { tipo: "sem-texto"; falha: FalhaDaTranscricao };

export function resultadoDaLeitura(leitura: Leitura, esperada: ChaveIdentidade): Resultado {
  if (leitura.decisao !== "resolve") return { tipo: "para-a-pessoa", leitura };
  return leitura.chave === esperada ? { tipo: "certa" } : { tipo: "chave-errada", rotulo: leitura.rotulo };
}

export interface Medida {
  fala: Fala;
  /** O que o modelo escreveu. */
  ouvido: string | null;
  /** O que o campo mostra, depois de `falaParaTexto`. */
  campo: string | null;
  resultado: Resultado;
  /** Tempo da chamada ao Groq, medido dentro da função. */
  ms: number | null;
}

const descreverResultado = (resultado: Resultado): string => {
  switch (resultado.tipo) {
    case "certa":
      return "certa";
    case "chave-errada":
      return `chave errada: ${resultado.rotulo}`;
    case "para-a-pessoa":
      return resultado.leitura.decisao === "revisa" ? `pessoa: revisa (${resultado.leitura.pendencias.join(", ")})` : `pessoa: recusa (${resultado.leitura.motivo})`;
    case "sem-texto":
      return `sem texto: ${resultado.falha}`;
  }
};

const celula = (texto: string | null): string => (texto === null ? "" : `\`${texto.replaceAll("`", "'").replaceAll("|", "/")}\``);

const mediana = (valores: readonly number[]): number => {
  const ordem = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordem.length / 2);
  return ordem.length % 2 === 1 ? (ordem[meio] ?? 0) : Math.round(((ordem[meio - 1] ?? 0) + (ordem[meio] ?? 0)) / 2);
};

export interface Contagem {
  certas: number;
  chavesErradas: number;
  paraAPessoa: number;
  semTexto: number;
}

export function contar(medidas: readonly Medida[]): Contagem {
  const quantas = (tipo: Resultado["tipo"]) => medidas.filter((m) => m.resultado.tipo === tipo).length;
  return { certas: quantas("certa"), chavesErradas: quantas("chave-errada"), paraAPessoa: quantas("para-a-pessoa"), semTexto: quantas("sem-texto") };
}

/** A seção do relatório para uma pasta de falas. */
export function relatorio(manifesto: Manifesto, medidas: readonly Medida[]): string {
  const total = medidas.length;
  const { certas, chavesErradas, paraAPessoa, semTexto } = contar(medidas);
  const tempos = medidas.flatMap((m) => (m.ms === null ? [] : [m.ms]));
  const origem = manifesto.origem === "sintetizada" ? "SINTETIZADAS (voz de máquina, não de pessoa)" : "gravadas por uma pessoa";
  const linhas = [
    `Origem: falas ${origem}. ${manifesto.descricao}`,
    "",
    `**${certas} de ${total} com a chave certa**, sem a pessoa corrigir o campo.`,
    "",
    `- Chave errada (o motor resolveu outra peça): ${chavesErradas}`,
    `- Foram para a pessoa (revisa ou recusa): ${paraAPessoa}`,
    `- Sem texto (a transcrição falhou ou veio vazia): ${semTexto}`,
    tempos.length > 0 ? `- Tempo da chamada ao Groq: mediana ${mediana(tempos)} ms, maior ${Math.max(...tempos)} ms (${tempos.length} chamadas)` : "- Tempo da chamada ao Groq: nenhuma chamada deu resposta",
    "",
    "| arquivo | dito | o modelo escreveu | campo | esperado | resultado |",
    "|---|---|---|---|---|---|",
    ...medidas.map((m) => `| ${m.fala.arquivo} | ${m.fala.dito ?? ""} | ${celula(m.ouvido)} | ${celula(m.campo)} | ${celula(m.fala.esperado)} | ${descreverResultado(m.resultado)} |`),
  ];
  return linhas.join("\n");
}
