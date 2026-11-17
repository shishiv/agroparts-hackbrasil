import type {
  Atributo,
  DataISO,
  Equipamento,
  ErroDeLinha,
  Grupo,
  HistoricoDoEquipamento,
  ItemDoHistorico,
  Leitura,
  Lido,
  MotivoRecusa,
  NaoVazia,
  Pendencia,
  Saldo,
  TipoOrdem,
  Troca,
} from "../contrato";
import {
  lerChave,
  lerCodigo,
  lerData,
  lerFamilia,
  lerOrdem,
  lerPatrimonio,
  type Tentativa,
} from "../exportacao/valores";
import type { EntradaDoIndice, IndiceDeGrupos, PaginaDoEquipamento, TextoDoCodigo } from "./pagina";

export const ARQUIVO_DA_PAGINA = "/maquinas/<patrimônio>.json";
export const ARQUIVO_DO_INDICE = "/grupos.json";

type Objeto = Record<string, unknown>;
type NaoChave = Exclude<Leitura, { decisao: "resolve" }>;

const TIPOS: readonly TipoOrdem[] = ["preventiva", "corretiva", "preditiva", "outra"];
const PENDENCIAS: readonly Pendencia[] = ["sufixo-desconhecido", "designacao-ausente", "duas-leituras"];
const MOTIVOS: readonly MotivoRecusa[] = ["contradicao", "fora-das-familias", "sem-texto"];

class Falha extends Error {
  constructor(
    readonly caminho: string,
    readonly problema: string,
  ) {
    super(`${caminho}: ${problema}`);
  }
}

const falhar = (caminho: string, problema: string): never => {
  throw new Falha(caminho, problema);
};

function objeto(c: string, v: unknown): Objeto {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? { ...v } : falhar(c, "esperava um objeto");
}

function lista<T>(c: string, v: unknown, ler: (c: string, item: unknown) => T): T[] {
  if (!Array.isArray(v)) return falhar(c, "esperava uma lista");
  return v.map((item: unknown, i) => ler(`${c}[${i}]`, item));
}

function listaNaoVazia<T>(c: string, v: unknown, ler: (c: string, item: unknown) => T): NaoVazia<T> {
  const [primeiro, ...resto] = lista(c, v, ler);
  return primeiro === undefined ? falhar(c, "esperava pelo menos um item") : [primeiro, ...resto];
}

const texto = (c: string, v: unknown): string => (typeof v === "string" ? v : falhar(c, "esperava um texto"));

const textoOuNulo = (c: string, v: unknown): string | null => (v === null ? null : texto(c, v));

function numero(c: string, v: unknown, minimo: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return falhar(c, "esperava um número");
  return v >= minimo ? v : falhar(c, `esperava um número a partir de ${minimo}`);
}

function valido<T>(c: string, tentativa: Tentativa<T>): T {
  return tentativa.ok ? tentativa.valor : falhar(c, tentativa.problema);
}

function dataISO(c: string, v: unknown): DataISO {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(c, v));
  return m ? valido(c, lerData(`${m[3]}/${m[2]}/${m[1]}`)) : falhar(c, "esperava AAAA-MM-DD");
}

function dentreOs<T extends string>(c: string, v: unknown, validos: readonly T[]): T {
  return validos.find((x) => x === v) ?? falhar(c, `esperava um de ${validos.join(", ")}`);
}

function equipamento(c: string, v: unknown): Equipamento {
  const o = objeto(c, v);
  return {
    patrimonio: valido(`${c}.patrimonio`, lerPatrimonio(texto(`${c}.patrimonio`, o.patrimonio))),
    tag: texto(`${c}.tag`, o.tag),
    nome: texto(`${c}.nome`, o.nome),
    area: texto(`${c}.area`, o.area),
  };
}

function troca(c: string, v: unknown): Troca {
  const o = objeto(c, v);
  return {
    ordem: valido(`${c}.ordem`, lerOrdem(texto(`${c}.ordem`, o.ordem))),
    data: dataISO(`${c}.data`, o.data),
    patrimonio: valido(`${c}.patrimonio`, lerPatrimonio(texto(`${c}.patrimonio`, o.patrimonio))),
    tipo: dentreOs(`${c}.tipo`, o.tipo, TIPOS),
    descricaoOrdem: texto(`${c}.descricaoOrdem`, o.descricaoOrdem),
    codigo: valido(`${c}.codigo`, lerCodigo(texto(`${c}.codigo`, o.codigo))),
    descricaoMaterial: texto(`${c}.descricaoMaterial`, o.descricaoMaterial),
    quantidade: numero(`${c}.quantidade`, o.quantidade, Number.MIN_VALUE),
    unidade: texto(`${c}.unidade`, o.unidade),
    posicao: textoOuNulo(`${c}.posicao`, o.posicao),
  };
}

function saldo(c: string, v: unknown): Saldo {
  const o = objeto(c, v);
  return {
    codigo: valido(`${c}.codigo`, lerCodigo(texto(`${c}.codigo`, o.codigo))),
    quantidade: numero(`${c}.quantidade`, o.quantidade, 0),
    unidade: texto(`${c}.unidade`, o.unidade),
    endereco: textoOuNulo(`${c}.endereco`, o.endereco),
  };
}

function atributo(c: string, v: unknown): Atributo {
  const o = objeto(c, v);
  const trecho = objeto(`${c}.trecho`, o.trecho);
  const inicio = numero(`${c}.trecho.inicio`, trecho.inicio, 0);
  const fim = numero(`${c}.trecho.fim`, trecho.fim, inicio);
  return { nome: texto(`${c}.nome`, o.nome), valor: texto(`${c}.valor`, o.valor), trecho: { inicio, fim } };
}

function leituraSemChave(c: string, v: unknown): NaoChave {
  const o = objeto(c, v);
  const atributos = lista(`${c}.atributos`, o.atributos, atributo);
  if (o.decisao === "revisa") {
    const familia = o.familia === null ? null : valido(`${c}.familia`, lerFamilia(texto(`${c}.familia`, o.familia)));
    const pendencias = listaNaoVazia(`${c}.pendencias`, o.pendencias, (cc, p) => dentreOs(cc, p, PENDENCIAS));
    return { decisao: "revisa", familia, pendencias, atributos };
  }
  if (o.decisao === "recusa") {
    return {
      decisao: "recusa",
      motivo: dentreOs(`${c}.motivo`, o.motivo, MOTIVOS),
      detalhe: texto(`${c}.detalhe`, o.detalhe),
      atributos,
    };
  }
  return falhar(`${c}.decisao`, "esperava revisa ou recusa: um código com chave pertence a um grupo");
}

function grupo(c: string, v: unknown): Grupo {
  const o = objeto(c, v);
  return {
    chave: valido(`${c}.chave`, lerChave(texto(`${c}.chave`, o.chave))),
    familia: valido(`${c}.familia`, lerFamilia(texto(`${c}.familia`, o.familia))),
    rotulo: texto(`${c}.rotulo`, o.rotulo),
    codigos: listaNaoVazia(`${c}.codigos`, o.codigos, (cc, x) => valido(cc, lerCodigo(texto(cc, x)))),
  };
}

function item(c: string, v: unknown): ItemDoHistorico {
  const o = objeto(c, v);
  const trocas = listaNaoVazia(`${c}.trocas`, o.trocas, troca);
  if (o.tipo === "peca") {
    return {
      tipo: "peca",
      grupo: grupo(`${c}.grupo`, o.grupo),
      trocas,
      codigosUsadosAqui: listaNaoVazia(`${c}.codigosUsadosAqui`, o.codigosUsadosAqui, (cc, x) =>
        valido(cc, lerCodigo(texto(cc, x))),
      ),
      quantidadeTotal: o.quantidadeTotal === null ? null : numero(`${c}.quantidadeTotal`, o.quantidadeTotal, 0),
      ultimaTroca: dataISO(`${c}.ultimaTroca`, o.ultimaTroca),
      saldoAqui: lista(`${c}.saldoAqui`, o.saldoAqui, saldo),
      saldoSobOutroCodigo: lista(`${c}.saldoSobOutroCodigo`, o.saldoSobOutroCodigo, saldo),
    };
  }
  if (o.tipo === "codigo-sem-chave") {
    return {
      tipo: "codigo-sem-chave",
      codigo: valido(`${c}.codigo`, lerCodigo(texto(`${c}.codigo`, o.codigo))),
      leitura: leituraSemChave(`${c}.leitura`, o.leitura),
      trocas,
    };
  }
  return falhar(`${c}.tipo`, "esperava peca ou codigo-sem-chave");
}

function textoDoCodigo(c: string, v: unknown): TextoDoCodigo {
  const o = objeto(c, v);
  return {
    codigo: valido(`${c}.codigo`, lerCodigo(texto(`${c}.codigo`, o.codigo))),
    descricao: texto(`${c}.descricao`, o.descricao),
    atributos: lista(`${c}.atributos`, o.atributos, atributo),
  };
}

function historico(c: string, v: unknown): HistoricoDoEquipamento {
  const o = objeto(c, v);
  return {
    equipamento: equipamento(`${c}.equipamento`, o.equipamento),
    itens: lista(`${c}.itens`, o.itens, item),
    versaoRegras: texto(`${c}.versaoRegras`, o.versaoRegras),
  };
}

function entradaDoIndice(c: string, v: unknown): EntradaDoIndice {
  const o = objeto(c, v);
  return {
    chave: valido(`${c}.chave`, lerChave(texto(`${c}.chave`, o.chave))),
    rotulo: texto(`${c}.rotulo`, o.rotulo),
    saldo: lista(`${c}.saldo`, o.saldo, saldo),
  };
}

function lerJson<T>(arquivo: string, bruto: string, ler: (c: string, v: unknown) => T): Lido<T> {
  const erro = (coluna: string, problema: string): Lido<never> => {
    const linha: ErroDeLinha = { arquivo, linha: 0, coluna, problema };
    return { ok: false, erros: [linha] };
  };
  let analisado: unknown;
  try {
    analisado = JSON.parse(bruto);
  } catch {
    return erro("", "JSON inválido");
  }
  try {
    return { ok: true, valor: ler("", analisado) };
  } catch (e) {
    if (e instanceof Falha) return erro(e.caminho, e.problema);
    throw e;
  }
}

/**
 * O JSON vem da rede, e só aqui nascem os valores marcados do contrato. Devolve só o primeiro
 * campo errado, com o caminho dele, porque o arquivo é gravado no build e um erro quer dizer
 * que o build e a página estão fora de sincronia.
 */
export function lerPaginaDoEquipamento(bruto: string): Lido<PaginaDoEquipamento> {
  return lerJson(ARQUIVO_DA_PAGINA, bruto, (c, v) => {
    const o = objeto(c, v);
    return { historico: historico("historico", o.historico), textos: lista("textos", o.textos, textoDoCodigo) };
  });
}

export function lerIndiceDeGrupos(bruto: string): Lido<IndiceDeGrupos> {
  return lerJson(ARQUIVO_DO_INDICE, bruto, (c, v) => {
    const o = objeto(c, v);
    return {
      versaoRegras: texto("versaoRegras", o.versaoRegras),
      grupos: lista("grupos", o.grupos, entradaDoIndice),
    };
  });
}
