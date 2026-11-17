import { marcarClasse } from "../classes";
import { classeSugerida, type RespostaDoJevParaARegra } from "../decidir";
import { NENHUMA } from "../pergunta";
import type { Amostra, ClasseDaAmostra, ItemPublico } from "./amostra";
import type { Protocolo } from "./protocolo";

export type Ordem = "crescente" | "invertida";

/** O que o Jev respondeu a um item da amostra, antes da regra. */
export interface RespostaMedida {
  codigoItem: number;
  ordem: Ordem;
  escolha: string;
  probabilidadeDaEscolha: number;
  noul: number;
}

export interface Resultados {
  modelo: string;
  /** Pedidos distintos da medição, um por item e por ordem. O SDK pode ter repetido um deles por erro de rede, e isso não entra. */
  chamadas: number;
  tokensDeEntrada: number;
  respostas: readonly RespostaMedida[];
}

export interface Fracao {
  k: number;
  n: number;
}

/** Intervalo de Wilson de 95% para k acertos em n itens. */
export function intervaloDeWilson({ k, n }: Fracao): readonly [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96;
  const p = k / n;
  const centro = (p + (z * z) / (2 * n)) / (1 + (z * z) / n);
  const folga = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n);
  return [Math.max(0, centro - folga), Math.min(1, centro + folga)];
}

export interface Veredito extends Fracao {
  nome: string;
  minimo: number;
  passou: boolean;
}

export interface ResumoDaClasse {
  classe: ClasseDaAmostra;
  itens: number;
  escolhaCerta: number;
  sugestoes: number;
  sugestoesCertas: number;
  emNenhuma: number;
}

export interface Confusao {
  esperada: string;
  escolhida: string;
  vezes: number;
}

/** Uma classe que a regra sugeriu para itens que deviam terminar em "nenhuma". */
export interface DesvioDeControle {
  classe: string;
  vezes: number;
}

export interface FaixaDeProbabilidade {
  de: number;
  ate: number;
  itens: number;
  escolhaCerta: number;
}

export interface Avaliacao {
  porClasse: readonly ResumoDaClasse[];
  dentro: { itens: number; escolhaCerta: number; sugestoes: number; sugestoesCertas: number };
  fora: { itens: number; emNenhuma: number };
  inversao: { itens: number; mesmaEscolha: number; mesmaDecisao: number; escolhaCertaInvertida: number; escolhaCertaNaOrdemNormal: number };
  confusoes: readonly Confusao[];
  desviosDosControles: readonly DesvioDeControle[];
  faixas: readonly FaixaDeProbabilidade[];
  vereditos: { precisao: Veredito; cobertura: Veredito; controles: Veredito; inversao: Veredito };
  classesFracas: readonly ResumoDaClasse[];
  seloEntra: boolean;
}

/** Limites inferiores das faixas de probabilidade da escolha: de 0 a 0,5, de 0,5 a 0,8 e de 0,8 a 1. */
const CORTES_DAS_FAIXAS: readonly number[] = [0.5, 0.8];

function paraARegra(resposta: RespostaMedida): RespostaDoJevParaARegra {
  if (resposta.escolha === NENHUMA) {
    return { escolha: NENHUMA, probabilidadeDaEscolha: resposta.probabilidadeDaEscolha, noul: resposta.noul };
  }
  const classe = marcarClasse(resposta.escolha);
  if (!classe.ok) throw new Error(classe.problema);
  return { escolha: classe.valor, probabilidadeDaEscolha: resposta.probabilidadeDaEscolha, noul: resposta.noul };
}

function veredito(nome: string, { k, n }: Fracao, minimo: number): Veredito {
  return { nome, k, n, minimo, passou: n > 0 && k / n >= minimo };
}

/** Compara as respostas do Jev com a classe que o CATMAT dá a cada item da amostra. */
export function avaliar(amostra: Amostra, resultados: Resultados, protocolo: Protocolo): Avaliacao {
  const classes = new Map(amostra.classes.map((c) => [c.codigo, c]));
  const normais = new Map(resultados.respostas.filter((r) => r.ordem === "crescente").map((r) => [r.codigoItem, r]));
  const invertidas = new Map(resultados.respostas.filter((r) => r.ordem === "invertida").map((r) => [r.codigoItem, r]));

  const porClasse = new Map<string, ResumoDaClasse>(
    amostra.classes.map((classe) => [
      classe.codigo,
      { classe, itens: 0, escolhaCerta: 0, sugestoes: 0, sugestoesCertas: 0, emNenhuma: 0 },
    ]),
  );
  const confusoes = new Map<string, Confusao>();
  const desvios = new Map<string, number>();
  const faixas = [0, ...CORTES_DAS_FAIXAS].map((de, i) => ({
    de,
    ate: CORTES_DAS_FAIXAS[i] ?? 1,
    itens: 0,
    escolhaCerta: 0,
  }));
  const inversao = { itens: 0, mesmaEscolha: 0, mesmaDecisao: 0, escolhaCertaInvertida: 0, escolhaCertaNaOrdemNormal: 0 };

  const esperadoDe = (item: ItemPublico): string => (classes.get(item.codigoClasse)?.dentro ? item.codigoClasse : NENHUMA);
  const decisaoDe = (resposta: RespostaMedida): string => classeSugerida(paraARegra(resposta), protocolo.regra);

  for (const item of amostra.itens) {
    const resposta = normais.get(item.codigoItem);
    const resumo = porClasse.get(item.codigoClasse);
    if (!resposta || !resumo) throw new Error(`o item ${item.codigoItem} não tem resposta do Jev`);
    const esperado = esperadoDe(item);
    const decisao = decisaoDe(resposta);
    const escolhaCerta = resposta.escolha === esperado;

    resumo.itens++;
    if (escolhaCerta) resumo.escolhaCerta++;
    if (decisao === NENHUMA) resumo.emNenhuma++;
    else {
      resumo.sugestoes++;
      if (decisao === esperado) resumo.sugestoesCertas++;
    }

    if (!resumo.classe.dentro && decisao !== NENHUMA) desvios.set(decisao, (desvios.get(decisao) ?? 0) + 1);

    if (resumo.classe.dentro) {
      const faixa = faixas[CORTES_DAS_FAIXAS.filter((corte) => resposta.probabilidadeDaEscolha >= corte).length];
      if (faixa) {
        faixa.itens++;
        if (escolhaCerta) faixa.escolhaCerta++;
      }
      if (!escolhaCerta) {
        const chave = `${esperado}>${resposta.escolha}`;
        const antes = confusoes.get(chave);
        confusoes.set(chave, { esperada: esperado, escolhida: resposta.escolha, vezes: (antes?.vezes ?? 0) + 1 });
      }
    }

    const invertida = invertidas.get(item.codigoItem);
    if (invertida) {
      inversao.itens++;
      if (invertida.escolha === resposta.escolha) inversao.mesmaEscolha++;
      if (decisaoDe(invertida) === decisao) inversao.mesmaDecisao++;
      if (invertida.escolha === esperado) inversao.escolhaCertaInvertida++;
      if (escolhaCerta) inversao.escolhaCertaNaOrdemNormal++;
    }
  }

  const resumos = [...porClasse.values()];
  const soma = (lista: readonly ResumoDaClasse[], campo: "itens" | "escolhaCerta" | "sugestoes" | "sugestoesCertas" | "emNenhuma") =>
    lista.reduce((total, r) => total + r[campo], 0);
  const dentroDaOferta = resumos.filter((r) => r.classe.dentro);
  const foraDaOferta = resumos.filter((r) => !r.classe.dentro);
  const dentro = {
    itens: soma(dentroDaOferta, "itens"),
    escolhaCerta: soma(dentroDaOferta, "escolhaCerta"),
    sugestoes: soma(dentroDaOferta, "sugestoes"),
    sugestoesCertas: soma(dentroDaOferta, "sugestoesCertas"),
  };
  const fora = { itens: soma(foraDaOferta, "itens"), emNenhuma: soma(foraDaOferta, "emNenhuma") };

  const { limiares } = protocolo;
  const vereditos = {
    precisao: veredito("precisão das sugestões", { k: dentro.sugestoesCertas, n: dentro.sugestoes }, limiares.precisaoDasSugestoes),
    cobertura: veredito("cobertura", { k: dentro.sugestoes, n: dentro.itens }, limiares.cobertura),
    controles: veredito("controles em \"nenhuma\"", { k: fora.emNenhuma, n: fora.itens }, limiares.controlesEmNenhuma),
    inversao: veredito("concordância ao inverter a ordem", { k: inversao.mesmaDecisao, n: inversao.itens }, limiares.concordanciaAoInverter),
  };

  return {
    porClasse: resumos,
    dentro,
    fora,
    inversao,
    confusoes: [...confusoes.values()].sort((a, b) => b.vezes - a.vezes || (a.esperada < b.esperada ? -1 : a.esperada > b.esperada ? 1 : 0)).slice(0, 8),
    desviosDosControles: [...desvios].map(([classe, vezes]) => ({ classe, vezes })).sort((a, b) => b.vezes - a.vezes || (a.classe < b.classe ? -1 : 1)),
    faixas,
    vereditos,
    classesFracas: dentroDaOferta.filter((r) => r.itens > 0 && r.escolhaCerta / r.itens < limiares.acertoMinimoPorClasse),
    seloEntra: vereditos.precisao.passou && vereditos.controles.passou,
  };
}
