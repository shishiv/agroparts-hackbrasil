import type {
  Atributo,
  CodigoLegado,
  ErroDeLinha,
  Leitura,
  Lido,
  MotivoRecusa,
  NaoVazia,
  ParticaoEsperada,
  Pendencia,
} from "../contrato";
import { lerChave, lerCodigo, lerFamilia, type Tentativa } from "./valores";

export const ARQUIVO_PARTICAO = "esperado-particao.json";
export const ARQUIVO_EXEMPLO = "unificacao-de-exemplo.json";

export type DecisaoJson = Leitura["decisao"];

export interface ParticaoEsperadaJson {
  decisoes: { codigo: string; decisao: DecisaoJson }[];
  grupos: string[][];
}

export interface AtributoJson {
  nome: string;
  valor: string;
  trecho: { inicio: number; fim: number };
}

export type LeituraJson =
  | { decisao: "resolve"; familia: string; chave: string; rotulo: string; atributos: AtributoJson[] }
  | { decisao: "revisa"; familia: string | null; pendencias: Pendencia[]; atributos: AtributoJson[] }
  | { decisao: "recusa"; motivo: MotivoRecusa; detalhe: string; atributos: AtributoJson[] };

export interface UnificacaoDeExemploJson {
  versaoRegras: string;
  leituras: { codigo: string; leitura: LeituraJson }[];
}

export interface LeiturasDeExemplo {
  versaoRegras: string;
  leituras: ReadonlyMap<CodigoLegado, Leitura>;
}

const DECISOES: readonly DecisaoJson[] = ["resolve", "revisa", "recusa"];
const PENDENCIAS: readonly Pendencia[] = ["sufixo-desconhecido", "designacao-ausente", "duas-leituras"];
const MOTIVOS: readonly MotivoRecusa[] = ["contradicao", "fora-das-familias", "sem-texto"];

type Objeto = Record<string, unknown>;

const ehInteiro = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

const ehObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);

class Coletor {
  readonly erros: ErroDeLinha[] = [];
  constructor(private readonly arquivo: string) {}
  erro(caminho: string, problema: string): void {
    this.erros.push({ arquivo: this.arquivo, linha: 0, coluna: caminho, problema });
  }
  tentar<T>(caminho: string, tentativa: Tentativa<T>): T | undefined {
    if (tentativa.ok) return tentativa.valor;
    this.erro(caminho, tentativa.problema);
    return undefined;
  }
  texto(caminho: string, v: unknown): string | undefined {
    if (typeof v === "string") return v;
    this.erro(caminho, "esperava um texto");
    return undefined;
  }
  resultado<T>(valor: T): Lido<T> {
    const [primeiro, ...resto] = this.erros;
    return primeiro ? { ok: false, erros: [primeiro, ...resto] } : { ok: true, valor };
  }
}

function analisar(arquivo: string, texto: string): Lido<Objeto> {
  const falha = (problema: string): Lido<never> => ({
    ok: false,
    erros: [{ arquivo, linha: 0, coluna: "", problema }],
  });
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return falha("JSON inválido");
  }
  return ehObjeto(bruto) ? { ok: true, valor: bruto } : falha("esperava um objeto na raiz");
}

/** Confere que a partição é uma partição: cada código resolve está em exatamente um grupo. */
export function lerParticaoEsperada(texto: string): Lido<ParticaoEsperada> {
  const coletor = new Coletor(ARQUIVO_PARTICAO);
  const analise = analisar(ARQUIVO_PARTICAO, texto);
  if (!analise.ok) return analise;
  const raiz = analise.valor;

  const decisoes: { codigo: CodigoLegado; decisao: DecisaoJson }[] = [];
  const decisaoDe = new Map<CodigoLegado, DecisaoJson>();
  const listaDecisoes = Array.isArray(raiz.decisoes) ? raiz.decisoes : null;
  if (!listaDecisoes) coletor.erro("decisoes", "esperava uma lista");
  (listaDecisoes ?? []).forEach((item: unknown, i) => {
    const caminho = `decisoes[${i}]`;
    if (!ehObjeto(item)) return coletor.erro(caminho, "esperava um objeto");
    const codigo = coletor.tentar(`${caminho}.codigo`, lerCodigo(String(item.codigo ?? "")));
    const decisao = DECISOES.find((d) => d === item.decisao);
    if (!decisao) coletor.erro(`${caminho}.decisao`, "esperava resolve, revisa ou recusa");
    if (codigo === undefined || decisao === undefined) return;
    if (decisaoDe.has(codigo)) return coletor.erro(`${caminho}.codigo`, `código repetido: ${codigo}`);
    decisaoDe.set(codigo, decisao);
    decisoes.push({ codigo, decisao });
  });

  const grupos: NaoVazia<CodigoLegado>[] = [];
  const grupoDoCodigo = new Set<CodigoLegado>();
  const listaGrupos = Array.isArray(raiz.grupos) ? raiz.grupos : null;
  if (!listaGrupos) coletor.erro("grupos", "esperava uma lista");
  (listaGrupos ?? []).forEach((item: unknown, i) => {
    const caminho = `grupos[${i}]`;
    if (!Array.isArray(item) || item.length === 0) {
      return coletor.erro(caminho, "esperava uma lista com pelo menos um código");
    }
    const codigos: CodigoLegado[] = [];
    item.forEach((bruto: unknown, j) => {
      const codigo = coletor.tentar(`${caminho}[${j}]`, lerCodigo(String(bruto ?? "")));
      if (codigo === undefined) return;
      if (decisaoDe.get(codigo) !== "resolve") {
        return coletor.erro(`${caminho}[${j}]`, `código ${codigo} está num grupo sem decisão resolve`);
      }
      if (grupoDoCodigo.has(codigo)) return coletor.erro(`${caminho}[${j}]`, `código ${codigo} em dois grupos`);
      grupoDoCodigo.add(codigo);
      codigos.push(codigo);
    });
    const [primeiro, ...resto] = codigos;
    if (primeiro !== undefined) grupos.push([primeiro, ...resto]);
  });
  for (const [codigo, decisao] of decisaoDe) {
    if (decisao === "resolve" && !grupoDoCodigo.has(codigo)) {
      coletor.erro("grupos", `código ${codigo} resolve e não está em nenhum grupo`);
    }
  }
  return coletor.resultado({ decisoes, grupos });
}

function lerAtributos(coletor: Coletor, caminho: string, bruto: unknown): Atributo[] {
  if (!Array.isArray(bruto)) {
    coletor.erro(caminho, "esperava uma lista");
    return [];
  }
  const atributos: Atributo[] = [];
  bruto.forEach((item: unknown, i) => {
    const onde = `${caminho}[${i}]`;
    if (!ehObjeto(item) || !ehObjeto(item.trecho)) return coletor.erro(onde, "esperava nome, valor e trecho");
    const nome = coletor.texto(`${onde}.nome`, item.nome);
    const valor = coletor.texto(`${onde}.valor`, item.valor);
    const { inicio, fim } = item.trecho;
    if (!ehInteiro(inicio) || !ehInteiro(fim) || inicio < 0 || fim < inicio) {
      return coletor.erro(`${onde}.trecho`, "esperava inicio e fim inteiros, com 0 <= inicio <= fim");
    }
    if (nome !== undefined && valor !== undefined) atributos.push({ nome, valor, trecho: { inicio, fim } });
  });
  return atributos;
}

function lerLeitura(coletor: Coletor, caminho: string, bruto: unknown): Leitura | undefined {
  if (!ehObjeto(bruto)) {
    coletor.erro(caminho, "esperava um objeto");
    return undefined;
  }
  const atributos = lerAtributos(coletor, `${caminho}.atributos`, bruto.atributos);
  if (bruto.decisao === "resolve") {
    const familia = coletor.tentar(`${caminho}.familia`, lerFamilia(String(bruto.familia ?? "")));
    const chave = coletor.tentar(`${caminho}.chave`, lerChave(String(bruto.chave ?? "")));
    const rotulo = coletor.texto(`${caminho}.rotulo`, bruto.rotulo);
    if (familia === undefined || chave === undefined || rotulo === undefined) return undefined;
    return { decisao: "resolve", familia, chave, rotulo, atributos };
  }
  if (bruto.decisao === "revisa") {
    const familia =
      bruto.familia === null
        ? null
        : coletor.tentar(`${caminho}.familia`, lerFamilia(String(bruto.familia ?? "")));
    const pendencias = Array.isArray(bruto.pendencias)
      ? bruto.pendencias.filter((p): p is Pendencia => PENDENCIAS.some((x) => x === p))
      : [];
    const [primeira, ...resto] = pendencias;
    if (!Array.isArray(bruto.pendencias) || pendencias.length !== bruto.pendencias.length || !primeira) {
      coletor.erro(`${caminho}.pendencias`, "esperava uma lista não vazia de pendências conhecidas");
      return undefined;
    }
    if (familia === undefined) return undefined;
    return { decisao: "revisa", familia, pendencias: [primeira, ...resto], atributos };
  }
  if (bruto.decisao === "recusa") {
    const motivo = MOTIVOS.find((m) => m === bruto.motivo);
    const detalhe = coletor.texto(`${caminho}.detalhe`, bruto.detalhe);
    if (!motivo) coletor.erro(`${caminho}.motivo`, "motivo de recusa desconhecido");
    if (motivo === undefined || detalhe === undefined) return undefined;
    return { decisao: "recusa", motivo, detalhe, atributos };
  }
  coletor.erro(`${caminho}.decisao`, "esperava resolve, revisa ou recusa");
  return undefined;
}

/**
 * Lê `unificacao-de-exemplo.json`. Devolve as leituras, e quem chama monta a
 * `Unificacao` com `agrupar`.
 */
export function lerLeiturasDeExemplo(texto: string): Lido<LeiturasDeExemplo> {
  const coletor = new Coletor(ARQUIVO_EXEMPLO);
  const analise = analisar(ARQUIVO_EXEMPLO, texto);
  if (!analise.ok) return analise;
  const raiz = analise.valor;

  const versaoRegras = coletor.texto("versaoRegras", raiz.versaoRegras) ?? "";
  const leituras = new Map<CodigoLegado, Leitura>();
  const familiaDaChave = new Map<string, string>();
  const lista = Array.isArray(raiz.leituras) ? raiz.leituras : null;
  if (!lista) coletor.erro("leituras", "esperava uma lista");
  (lista ?? []).forEach((item: unknown, i) => {
    const caminho = `leituras[${i}]`;
    if (!ehObjeto(item)) return coletor.erro(caminho, "esperava um objeto");
    const codigo = coletor.tentar(`${caminho}.codigo`, lerCodigo(String(item.codigo ?? "")));
    const leitura = lerLeitura(coletor, `${caminho}.leitura`, item.leitura);
    if (codigo === undefined || leitura === undefined) return;
    if (leituras.has(codigo)) return coletor.erro(`${caminho}.codigo`, `código repetido: ${codigo}`);
    if (leitura.decisao === "resolve") {
      const anterior = familiaDaChave.get(leitura.chave);
      if (anterior !== undefined && anterior !== leitura.familia) {
        return coletor.erro(`${caminho}.leitura.chave`, `a chave ${leitura.chave} está em duas famílias`);
      }
      familiaDaChave.set(leitura.chave, leitura.familia);
    }
    leituras.set(codigo, leitura);
  });
  return coletor.resultado({ versaoRegras, leituras });
}
