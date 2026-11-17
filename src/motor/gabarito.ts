import type { CodigoLegado, ErroDeLinha, Leitura, Lido, MotivoRecusa, NaoVazia, Pendencia } from "../contrato";
import { lerCodigo } from "../exportacao/valores";

export const ARQUIVO_DO_GABARITO = "rotulos.json";

const PENDENCIAS: readonly Pendencia[] = ["sufixo-desconhecido", "designacao-ausente", "duas-leituras"];
const MOTIVOS: readonly MotivoRecusa[] = ["contradicao", "fora-das-familias", "sem-texto"];

export type Esperado =
  | { decisao: "resolve"; peca: string }
  | { decisao: "revisa"; motivo: Pendencia }
  | { decisao: "recusa"; motivo: MotivoRecusa };

export interface ItemDoGabarito {
  codigo: CodigoLegado;
  texto: string;
  esperado: Esperado;
}

export interface Gabarito {
  versao: string;
  itens: NaoVazia<ItemDoGabarito>;
}

export const decisaoDe = (esperado: Esperado): Leitura["decisao"] => esperado.decisao;

type Objeto = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);

class Erros {
  readonly lista: ErroDeLinha[] = [];
  /** Registra o erro e devolve `undefined`, para servir de `return` de quem desiste. */
  add(coluna: string, problema: string): undefined {
    this.lista.push({ arquivo: ARQUIVO_DO_GABARITO, linha: 0, coluna, problema });
    return undefined;
  }
}

function lerEsperado(item: Objeto, onde: string, erros: Erros): Esperado | undefined {
  if (item.decisao === "resolve") {
    const { serie, vedacao, folga } = item;
    if (typeof serie !== "string" || typeof vedacao !== "string" || typeof folga !== "string") {
      return erros.add(onde, "resolve sem série, vedação ou folga");
    }
    const peca = `${serie} ${vedacao} ${folga}`;
    if (item.peca !== peca) return erros.add(`${onde}.peca`, `a peça "${String(item.peca)}" não é "${peca}"`);
    return { decisao: "resolve", peca };
  }
  if (item.decisao === "revisa") {
    const motivo = PENDENCIAS.find((p) => p === item.motivo);
    return motivo ? { decisao: "revisa", motivo } : erros.add(`${onde}.motivo`, "pendência desconhecida");
  }
  if (item.decisao === "recusa") {
    const motivo = MOTIVOS.find((m) => m === item.motivo);
    return motivo ? { decisao: "recusa", motivo } : erros.add(`${onde}.motivo`, "motivo de recusa desconhecido");
  }
  return erros.add(`${onde}.decisao`, "esperava resolve, revisa ou recusa");
}

function lerItens(lista: readonly unknown[], erros: Erros): ItemDoGabarito[] {
  const itens: ItemDoGabarito[] = [];
  const vistos = new Set<CodigoLegado>();
  lista.forEach((item, i) => {
    const onde = `itens[${i}]`;
    if (!ehObjeto(item)) return erros.add(onde, "esperava um objeto");
    const codigo = lerCodigo(String(item.codigoItem ?? ""));
    if (!codigo.ok) return erros.add(`${onde}.codigoItem`, codigo.problema);
    if (vistos.has(codigo.valor)) return erros.add(`${onde}.codigoItem`, `item repetido: ${codigo.valor}`);
    vistos.add(codigo.valor);
    if (typeof item.texto !== "string") return erros.add(`${onde}.texto`, "esperava um texto");
    const esperado = lerEsperado(item, onde, erros);
    if (esperado) itens.push({ codigo: codigo.valor, texto: item.texto, esperado });
  });
  return itens;
}

const doGrupo = (peca: string, codigos: readonly unknown[]): string => `${peca}=${codigos.map(String).sort().join(",")}`;

/** Os grupos escritos no arquivo têm de ser os que as peças dos itens formam. */
function gruposConferem(itens: readonly ItemDoGabarito[], gruposDoArquivo: readonly unknown[]): boolean {
  const escritos = gruposDoArquivo.map((g) =>
    ehObjeto(g) && typeof g.peca === "string" && Array.isArray(g.itens) ? doGrupo(g.peca, g.itens) : "?",
  );
  const porPeca = new Map<string, CodigoLegado[]>();
  for (const { codigo, esperado } of itens) {
    if (esperado.decisao === "resolve") porPeca.set(esperado.peca, [...(porPeca.get(esperado.peca) ?? []), codigo]);
  }
  const derivados = [...porPeca].map(([peca, codigos]) => doGrupo(peca, codigos));
  return escritos.sort().join("\n") === derivados.sort().join("\n");
}

/** Lê `dados/gabarito/rotulos.json`. */
export function lerGabarito(json: string): Lido<Gabarito> {
  let bruto: unknown;
  try {
    bruto = JSON.parse(json);
  } catch {
    bruto = undefined;
  }
  if (!ehObjeto(bruto)) {
    return { ok: false, erros: [{ arquivo: ARQUIVO_DO_GABARITO, linha: 0, coluna: "", problema: "esperava um objeto JSON na raiz" }] };
  }

  const erros = new Erros();
  const versao = typeof bruto.versao === "string" ? bruto.versao : "";
  if (versao === "") erros.add("versao", "esperava um texto");
  const itens = lerItens(Array.isArray(bruto.itens) ? bruto.itens : [], erros);
  const [primeiro, ...resto] = itens;
  if (!primeiro) erros.add("itens", "esperava uma lista com pelo menos um item");
  if (!gruposConferem(itens, Array.isArray(bruto.grupos) ? bruto.grupos : [])) {
    erros.add("grupos", "os grupos do arquivo não são os que as peças dos itens formam");
  }

  const [primeiroErro, ...restoDosErros] = erros.lista;
  if (primeiroErro) return { ok: false, erros: [primeiroErro, ...restoDosErros] };
  return primeiro ? { ok: true, valor: { versao, itens: [primeiro, ...resto] } } : { ok: false, erros: [{ arquivo: ARQUIVO_DO_GABARITO, linha: 0, coluna: "itens", problema: "sem itens" }] };
}
