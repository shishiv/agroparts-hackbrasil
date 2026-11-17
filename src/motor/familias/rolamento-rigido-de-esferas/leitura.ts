import type { Atributo, Leitura, Trecho } from "../../../contrato";
import { familiaId, montarChave } from "../../marcas";
import { dividirEmCampos, type Campo } from "./campos";
import { ehDesignacaoDaFamilia, furoDaDesignacao, numerosDeReferencia, type Numero } from "./designacao";
import { semExplicacao } from "./explicacao";
import { lerPalavras, type Palavras } from "./palavras";
import { codigosSoltos, lerCadeia, type Cadeia, type Folga, type Vedacao } from "./sufixos";

export const ID_DA_FAMILIA = familiaId("rolamento-rigido-de-esferas");
export const ATRIBUTOS_DA_CHAVE = ["serie", "vedacao", "folga"] as const;

/** Uma designação do texto com os sufixos que vêm colados nela. */
interface Ocorrencia {
  designacao: Numero;
  cadeia: Cadeia;
}

/** O que uma ocorrência diz, depois de somar o que as palavras do texto dizem. */
interface Visao {
  ocorrencia: Ocorrencia;
  vedacoes: ReadonlySet<Vedacao>;
  folgas: ReadonlySet<Folga>;
  /** Há no texto algo que muda a peça e que o motor não sabe dizer o que é. */
  desconhecido: boolean;
}

const atributo = (nome: string, valor: string, trecho: Trecho): Atributo => ({ nome, valor, trecho });

function visao(ocorrencia: Ocorrencia, palavras: Palavras, desconhecido: boolean): Visao {
  const vedacoes = new Set<Vedacao>(ocorrencia.cadeia.vedacoes.map((v) => v.valor));
  if (palavras.abertos.length > 0) vedacoes.add("ABERTO");
  const folgas = new Set<Folga>([...ocorrencia.cadeia.folgas, ...palavras.folgas].map((f) => f.valor));
  return { ocorrencia, vedacoes, folgas, desconhecido: desconhecido || ocorrencia.cadeia.desconhecidos.length > 0 };
}

const vazia = (o: Ocorrencia): boolean =>
  o.cadeia.vedacoes.length === 0 && o.cadeia.folgas.length === 0 && o.cadeia.desconhecidos.length === 0;

function identidade(v: Visao): string {
  return [v.ocorrencia.designacao.digitos, [...v.vedacoes].sort().join("+"), [...v.folgas].sort().join("+"), v.desconhecido].join("|");
}

/**
 * Reduz as ocorrências às leituras distintas do texto: a mesma designação
 * escrita de novo sem sufixo nenhum repete a primeira, e leituras idênticas viram uma.
 */
function leiturasDistintas(visoes: readonly Visao[]): Visao[] {
  const distintas = new Map<string, Visao>();
  for (const v of visoes) {
    const repeteOutraComSufixo = visoes.some(
      (o) => o !== v && vazia(v.ocorrencia) && !vazia(o.ocorrencia) && o.ocorrencia.designacao.digitos === v.ocorrencia.designacao.digitos,
    );
    if (repeteOutraComSufixo) continue;
    const id = identidade(v);
    if (!distintas.has(id)) distintas.set(id, v);
  }
  return [...distintas.values()];
}

/**
 * "6232RS" é 6232 com uma vedação RS, ou 623 com 2RS? Quando o último dígito da designação é 2,
 * a vedação vem colada (ou por hífen, no caso do RS) e sem o 2, e o que sobra também é uma designação,
 * o texto tem duas leituras.
 */
function colaOUltimoDigitoDaVedacao(n: string, { designacao, cadeia }: Ocorrencia): boolean {
  const [primeira] = cadeia.vedacoes;
  if (!primeira) return false;
  const { fim } = designacao.trecho;
  const colada = primeira.trecho.inicio === fim;
  const porHifen = n.charAt(fim) === "-" && primeira.trecho.inicio === fim + 1 && primeira.valor === "RS";
  const semOZ = (colada && (primeira.valor === "Z" || primeira.valor === "RS")) || porHifen;
  return semOZ && designacao.digitos.endsWith("2") && ehDesignacaoDaFamilia(designacao.digitos.slice(0, -1));
}

function atributosLidos(v: Visao): Atributo[] {
  const { designacao, cadeia } = v.ocorrencia;
  return [
    atributo("serie", designacao.digitos, designacao.trecho),
    ...cadeia.vedacoes.map((c) => atributo("vedacao", c.valor, c.trecho)),
    ...cadeia.folgas.map((c) => atributo("folga", c.valor, c.trecho)),
  ];
}

function contradicoes(v: Visao, palavras: Palavras, umaSerieSo: boolean): string[] {
  const { designacao } = v.ocorrencia;
  const motivos: string[] = [];
  const [primeira, segunda] = [...v.vedacoes];
  if (primeira && segunda) motivos.push(`duas vedações no mesmo texto (${primeira} e ${segunda})`);
  const [folgaA, folgaB] = [...v.folgas];
  if (folgaA && folgaB) motivos.push(`duas folgas no mesmo texto (${folgaA} e ${folgaB})`);
  if (v.vedacoes.has("ABERTO")) {
    const dizAlgoDeVedacao = [palavras.metalicos, palavras.borrachas, palavras.duplas, palavras.simples, palavras.vedacoesEscritas];
    if (dizAlgoDeVedacao.some((trechos) => trechos.length > 0)) motivos.push("rolamento aberto, e o texto fala de vedação ou blindagem");
  }
  if (v.vedacoes.size === 1) {
    const [vedacao] = [...v.vedacoes];
    const deBorracha = vedacao === "RS" || vedacao === "2RS";
    const metalica = vedacao === "Z" || vedacao === "ZZ";
    const deUma = vedacao === "Z" || vedacao === "RS";
    const deDuas = vedacao === "ZZ" || vedacao === "2RS";
    if (deBorracha && palavras.metalicos.length > 0) motivos.push(`vedação ${vedacao} de borracha, e o texto diz metálica`);
    if (metalica && palavras.borrachas.length > 0) motivos.push(`vedação ${vedacao} metálica, e o texto diz borracha`);
    if (deUma && palavras.duplas.length > 0) motivos.push(`vedação ${vedacao} de um lado, e o texto diz dupla`);
    if (deDuas && palavras.simples.length > 0) motivos.push(`vedação ${vedacao} dos dois lados, e o texto diz uma só`);
  }
  if (umaSerieSo) {
    const furo = furoDaDesignacao(designacao.digitos);
    const diferente = palavras.furos.find((f) => f !== furo);
    if (diferente !== undefined) {
      motivos.push(`furo escrito de ${diferente} mm, mas a designação ${designacao.digitos} tem ${furo} mm`);
    }
  }
  if (palavras.outrosTipos.length > 0) motivos.push("designação da série 6 junto de palavra de outro tipo de rolamento");
  return motivos;
}

export function rotuloDaPeca(serie: string, vedacao: Vedacao, folga: Folga): string {
  const sufixoDeVedacao = vedacao === "ABERTO" ? "aberto" : vedacao;
  return `Rolamento ${serie} ${sufixoDeVedacao}${folga === "CN" ? "" : ` ${folga}`}`;
}

function semDesignacao(palavras: Palavras): Leitura {
  if (palavras.abertura !== "rolamento") {
    return { decisao: "recusa", motivo: "fora-das-familias", detalhe: "o texto não é de rolamento", atributos: [] };
  }
  if (palavras.outrosTipos.length > 0 || palavras.referenciaEscrita) {
    return {
      decisao: "recusa",
      motivo: "fora-das-familias",
      detalhe: "rolamento de outro tipo, ou com referência que não é da série 6",
      atributos: [],
    };
  }
  return { decisao: "revisa", familia: null, pendencias: ["designacao-ausente"], atributos: [] };
}

/** Os trechos que a leitura entendeu: o que sobra nos campos estritos é o que o motor não conhece. */
function entendidos(designacoes: readonly Numero[], ocorrencias: readonly Ocorrencia[], palavras: Palavras, campos: readonly Campo[]): Trecho[] {
  return [
    ...designacoes.map((d) => d.trecho),
    ...ocorrencias.flatMap(({ cadeia }) => [
      ...cadeia.vedacoes.map((v) => v.trecho),
      ...cadeia.folgas.map((f) => f.trecho),
      ...cadeia.desconhecidos,
    ]),
    ...palavras.expressoesDeFolga,
    ...palavras.abertos,
    ...palavras.medidas,
    ...campos.flatMap((c) => (c.rotulo ? [c.rotulo] : [])),
  ];
}

/**
 * Lê o texto de um item como rolamento rígido de esferas. `n` é o texto normalizado.
 *
 * O texto tem de abrir como rolamento, com uma marca ou com a própria designação. Uma polia
 * "com rolamento 6205 ZZ" cita a designação sem ser o rolamento, e entraria no grupo dele.
 * Sobre o que sobra: no texto livre, na referência e no material, palavra que o motor não
 * conhece manda o texto para revisão, porque pode ser o que muda a peça.
 */
export function lerRolamento(n: string): Leitura {
  const campos = dividirEmCampos(n);
  const palavras = lerPalavras(n, campos);
  const numeros = numerosDeReferencia(n);
  const designacoes = numeros.filter((x) => ehDesignacaoDaFamilia(x.digitos));
  if (designacoes.length === 0) {
    const miniaturaComVedacaoColada =
      palavras.abertura !== "outra" &&
      palavras.outrosTipos.length === 0 &&
      numeros.some(
        (designacao) => designacao.digitos.length === 4 && colaOUltimoDigitoDaVedacao(n, { designacao, cadeia: lerCadeia(n, designacao.trecho.fim) }),
      );
    if (miniaturaComVedacaoColada) return { decisao: "revisa", familia: ID_DA_FAMILIA, pendencias: ["duas-leituras"], atributos: [] };
    return semDesignacao(palavras);
  }
  if (palavras.abertura === "outra") {
    return { decisao: "recusa", motivo: "fora-das-familias", detalhe: "o texto é de outra peça que cita um rolamento", atributos: [] };
  }

  const ocorrencias = designacoes.map((designacao) => ({ designacao, cadeia: lerCadeia(n, designacao.trecho.fim) }));
  const cobertos = entendidos(designacoes, ocorrencias, palavras, campos);
  const haSoltos = codigosSoltos(n, cobertos).length > 0;
  const folgaDeOutraLeitura = ocorrencias.length > 1 && palavras.folgas.length > 0;
  const desconhecido =
    haSoltos || folgaDeOutraLeitura || palavras.variantes.length > 0 || semExplicacao(n, campos, cobertos).length > 0;
  const distintas = leiturasDistintas(ocorrencias.map((o) => visao(o, palavras, desconhecido)));
  const umaSerieSo = new Set(distintas.map((v) => v.ocorrencia.designacao.digitos)).size === 1;

  for (const v of distintas) {
    const motivos = contradicoes(v, palavras, umaSerieSo);
    if (motivos.length > 0) {
      return { decisao: "recusa", motivo: "contradicao", detalhe: motivos.join("; "), atributos: atributosLidos(v) };
    }
  }

  const [unica, ...outras] = distintas;
  if (!unica) throw new Error("há designação e nenhuma leitura: erro do motor");
  if (outras.length > 0 || ocorrencias.some((o) => colaOUltimoDigitoDaVedacao(n, o))) {
    return {
      decisao: "revisa",
      familia: ID_DA_FAMILIA,
      pendencias: ["duas-leituras"],
      atributos: distintas.flatMap((v) => atributosLidos(v)),
    };
  }

  const { designacao, cadeia } = unica.ocorrencia;
  const [vedacao] = [...unica.vedacoes];
  if (vedacao === undefined || unica.desconhecido) {
    return {
      decisao: "revisa",
      familia: ID_DA_FAMILIA,
      pendencias: ["sufixo-desconhecido"],
      atributos: atributosLidos(unica),
    };
  }

  const trechoDaVedacao = cadeia.vedacoes[0]?.trecho ?? palavras.abertos[0] ?? designacao.trecho;
  const folgaEscrita = cadeia.folgas[0] ?? palavras.folgas[0];
  const folga: Folga = folgaEscrita?.valor ?? "CN";
  const aposVedacao = Math.max(designacao.trecho.fim, trechoDaVedacao.fim);
  const atributos = [
    atributo("serie", designacao.digitos, designacao.trecho),
    atributo("vedacao", vedacao, trechoDaVedacao),
    atributo("folga", folga, folgaEscrita?.trecho ?? { inicio: aposVedacao, fim: aposVedacao }),
  ];
  return {
    decisao: "resolve",
    familia: ID_DA_FAMILIA,
    chave: montarChave(ID_DA_FAMILIA, ATRIBUTOS_DA_CHAVE, atributos),
    rotulo: rotuloDaPeca(designacao.digitos, vedacao, folga),
    atributos,
  };
}
