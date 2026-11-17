import type { CadastroMaterial, CodigoLegado, Leitura } from "../contrato";
import { SERIES_EM_ORDEM, serieDaDesignacao } from "./familias/rolamento-rigido-de-esferas";
import type { Esperado, Gabarito } from "./gabarito";
import { unificar } from "./unificar";

type Decisao = Leitura["decisao"];
const DECISOES: readonly Decisao[] = ["resolve", "revisa", "recusa"];

export interface LinhaDeSerie {
  serie: string;
  textos: number;
  resolve: number;
  revisa: number;
  recusa: number;
}

export interface Divergencia {
  codigo: CodigoLegado;
  esperado: string;
  obtido: string;
}

export interface Placar {
  versaoRegras: string;
  versaoGabarito: string;
  textos: number;
  /** Pares de códigos que o motor juntou e o gabarito não junta. O objetivo é zero. */
  paresFalsos: readonly (readonly [CodigoLegado, CodigoLegado])[];
  paresVerdadeiros: number;
  paresVerdadeirosJuntados: number;
  /** `matriz[esperada][obtida]`: quantos textos o gabarito rotulou com a primeira decisão e o motor com a segunda. */
  matriz: Readonly<Record<Decisao, Readonly<Record<Decisao, number>>>>;
  /** Os textos em que o motor não deu o que o gabarito diz: outra decisão, outro motivo ou outra peça. */
  divergencias: readonly Divergencia[];
  /** Textos que o motor resolve e o gabarito não resolve, ou resolve como outra peça. O objetivo é zero. */
  resolvidosErrado: number;
  /** Textos que o gabarito resolve e o motor manda para uma pessoa. É o preço de não juntar peças diferentes. */
  mandadosParaRevisao: number;
  porMotivo: readonly { motivo: string; gabarito: number; motor: number }[];
  porSerie: readonly LinhaDeSerie[];
  /** Resumo de todas as leituras, atributos e trechos inclusive. Igual no Bun e no navegador. */
  impressao: string;
}

const motivoDoEsperado = (e: Esperado): string => (e.decisao === "resolve" ? "resolve" : `${e.decisao}/${e.motivo}`);

const motivoDaLeitura = (l: Leitura): string => {
  if (l.decisao === "resolve") return "resolve";
  if (l.decisao === "revisa") return `revisa/${l.pendencias.join("+")}`;
  return `recusa/${l.motivo}`;
};

/** A peça que a leitura resolve, escrita como o gabarito escreve: `6312 ZZ C3`. */
function pecaDaLeitura(l: Extract<Leitura, { decisao: "resolve" }>): string {
  const valor = (nome: string) => l.atributos.find((a) => a.nome === nome)?.valor ?? "?";
  return `${valor("serie")} ${valor("vedacao")} ${valor("folga")}`;
}

function resumoDaLeitura(codigo: string, l: Leitura): string {
  const atributos = l.atributos.map((a) => `${a.nome}=${a.valor}[${a.trecho.inicio},${a.trecho.fim}]`).join(";");
  const detalhe = l.decisao === "resolve" ? `${l.familia}|${l.chave}|${l.rotulo}` : l.decisao === "revisa" ? `${l.familia}` : l.detalhe;
  return `${codigo}\t${motivoDaLeitura(l)}\t${detalhe}\t${atributos}`;
}

/** Hash de 53 bits (cyrb53). Serve para ver que duas execuções leram igual, não para segurança. */
function resumir(texto: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i++) {
    const unidade = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ unidade, 2654435761);
    h2 = Math.imul(h2 ^ unidade, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}

function paresDe<T>(lista: readonly T[]): (readonly [T, T])[] {
  return lista.flatMap((a, i) => lista.slice(i + 1).map((b) => [a, b] as const));
}

export function calcularPlacar(gabarito: Gabarito): Placar {
  const cadastro: CadastroMaterial[] = gabarito.itens.map((i) => ({ codigo: i.codigo, descricao: i.texto, unidade: "UN", sku: null }));
  const unificacao = unificar(cadastro);
  const esperadoDe = new Map(gabarito.itens.map((i) => [i.codigo, i.esperado]));

  const paresFalsos: (readonly [CodigoLegado, CodigoLegado])[] = [];
  for (const grupo of unificacao.grupos.values()) {
    for (const [a, b] of paresDe(grupo.codigos)) {
      const ea = esperadoDe.get(a);
      const eb = esperadoDe.get(b);
      const mesmaPeca = ea?.decisao === "resolve" && eb?.decisao === "resolve" && ea.peca === eb.peca;
      if (!mesmaPeca) paresFalsos.push([a, b]);
    }
  }

  const porPeca = new Map<string, CodigoLegado[]>();
  for (const { codigo, esperado } of gabarito.itens) {
    if (esperado.decisao === "resolve") porPeca.set(esperado.peca, [...(porPeca.get(esperado.peca) ?? []), codigo]);
  }
  const verdadeiros = [...porPeca.values()].flatMap((codigos) => paresDe(codigos));
  const juntados = verdadeiros.filter(([a, b]) => {
    const grupo = unificacao.grupoDe(a);
    return grupo !== null && grupo === unificacao.grupoDe(b);
  });

  const matriz: Record<Decisao, Record<Decisao, number>> = {
    resolve: { resolve: 0, revisa: 0, recusa: 0 },
    revisa: { resolve: 0, revisa: 0, recusa: 0 },
    recusa: { resolve: 0, revisa: 0, recusa: 0 },
  };
  const divergencias: Divergencia[] = [];
  const motivosDoGabarito = new Map<string, number>();
  const motivosDoMotor = new Map<string, number>();
  const linhasDeSerie = new Map<string, LinhaDeSerie>();
  const resumos: string[] = [];
  let resolvidosErrado = 0;
  let mandadosParaRevisao = 0;
  for (const { codigo, esperado } of gabarito.itens) {
    const leitura = unificacao.leituras.get(codigo);
    if (!leitura) throw new Error(`o motor não leu o item ${codigo}`);
    matriz[esperado.decisao][leitura.decisao] += 1;
    const obtido = motivoDaLeitura(leitura);
    const esperadoTexto = motivoDoEsperado(esperado);
    motivosDoGabarito.set(esperadoTexto, (motivosDoGabarito.get(esperadoTexto) ?? 0) + 1);
    motivosDoMotor.set(obtido, (motivosDoMotor.get(obtido) ?? 0) + 1);
    const pecaEsperada = esperado.decisao === "resolve" ? esperado.peca : null;
    const pecaObtida = leitura.decisao === "resolve" ? pecaDaLeitura(leitura) : null;
    if (obtido !== esperadoTexto || pecaObtida !== pecaEsperada) {
      divergencias.push({
        codigo,
        esperado: pecaEsperada ? `resolve ${pecaEsperada}` : esperadoTexto,
        obtido: pecaObtida ? `resolve ${pecaObtida}` : obtido,
      });
    }
    if (leitura.decisao === "resolve" && pecaObtida !== pecaEsperada) resolvidosErrado += 1;
    if (esperado.decisao === "resolve" && leitura.decisao !== "resolve") mandadosParaRevisao += 1;
    resumos.push(resumoDaLeitura(codigo, leitura));

    const serie = leitura.atributos.find((a) => a.nome === "serie")?.valor;
    if (serie !== undefined) {
      const nome = serieDaDesignacao(serie);
      const linha = linhasDeSerie.get(nome) ?? { serie: nome, textos: 0, resolve: 0, revisa: 0, recusa: 0 };
      linhasDeSerie.set(nome, { ...linha, textos: linha.textos + 1, [leitura.decisao]: linha[leitura.decisao] + 1 });
    }
  }

  const motivos = [...new Set([...motivosDoGabarito.keys(), ...motivosDoMotor.keys()])].sort();
  return {
    versaoRegras: unificacao.versaoRegras,
    versaoGabarito: gabarito.versao,
    textos: gabarito.itens.length,
    paresFalsos,
    paresVerdadeiros: verdadeiros.length,
    paresVerdadeirosJuntados: juntados.length,
    matriz,
    divergencias,
    resolvidosErrado,
    mandadosParaRevisao,
    porMotivo: motivos.map((motivo) => ({ motivo, gabarito: motivosDoGabarito.get(motivo) ?? 0, motor: motivosDoMotor.get(motivo) ?? 0 })),
    porSerie: SERIES_EM_ORDEM.flatMap((s) => linhasDeSerie.get(s) ?? []),
    impressao: resumir(`${unificacao.versaoRegras}\n${resumos.join("\n")}`),
  };
}

const porcento = (parte: number, todo: number): string =>
  todo === 0 ? "sem textos" : `${((100 * parte) / todo).toFixed(1).replace(".", ",")}%`;

export function formatarPlacar(p: Placar): string {
  const iguais = p.textos - p.divergencias.length;
  const linhas: string[] = [
    "# Placar do motor",
    "",
    `Versão das regras: \`${p.versaoRegras}\`. Gabarito: \`${p.versaoGabarito}\`, ${p.textos} textos públicos do CATMAT.`,
    "",
    "## O que estes números valem",
    "",
    "- Os mesmos textos do CATMAT serviram para montar as listas de palavras do motor (`PALAVRAS_DE_APLICACAO` e `FRASE_CONHECIDA`, em `src/motor/familias/rolamento-rigido-de-esferas/`). Os números abaixo são medidos sobre o conjunto usado para ajustar o motor, não sobre textos nunca vistos.",
    "- No cadastro de uma usina real, a taxa de resolve deve ser menor que a deste placar.",
    "- O item 622950 (rolamento inox) foi corrigido de resolve para revisa depois da primeira versão do motor. A correção deixou o rótulo mais difícil para o motor, não mais fácil.",
    "",
    `Impressão das leituras: \`${p.impressao}\`. É a mesma no Bun e no navegador do teste: o resumo inclui chave, atributos e trechos de cada leitura.`,
    "",
    `## Pares falsos juntados: ${p.paresFalsos.length}`,
    "",
    "Um par é falso quando o motor põe dois códigos no mesmo grupo e o gabarito não os põe no mesmo grupo.",
    "",
    `Pares verdadeiros juntados: ${p.paresVerdadeirosJuntados} de ${p.paresVerdadeiros}.`,
    ...p.paresFalsos.map(([a, b]) => `- falso: ${a} com ${b}`),
    "",
    "## Decisão do motor contra o gabarito",
    "",
    "| gabarito \\ motor | resolve | revisa | recusa |",
    "|---|---:|---:|---:|",
    ...DECISOES.map((e) => `| ${e} | ${DECISOES.map((o) => p.matriz[e][o]).join(" | ")} |`),
    "",
    `Mesma decisão, mesmo motivo e mesma peça: ${iguais} de ${p.textos} (${porcento(iguais, p.textos)}).`,
    "",
    `Resolvidos errado (o motor resolve e o gabarito não resolve, ou resolve outra peça): ${p.resolvidosErrado}.`,
    "",
    `Mandados para revisão a mais (o gabarito resolve e o motor manda para uma pessoa): ${p.mandadosParaRevisao}.`,
    ...(p.divergencias.length > 0 ? [""] : []),
    ...p.divergencias.map((d) => `- item ${d.codigo}: o gabarito diz \`${d.esperado}\`, o motor diz \`${d.obtido}\``),
    "",
    "## Por motivo",
    "",
    "| motivo | gabarito | motor |",
    "|---|---:|---:|",
    ...p.porMotivo.map((m) => `| ${m.motivo} | ${m.gabarito} | ${m.motor} |`),
    "",
    "## Taxa de resolve por série",
    "",
    "Conta os textos em que o motor achou uma designação da série. Os que o motor diz que são de outro tipo de rolamento ou de outra peça não entram.",
    "",
    "| série | textos | resolve | revisa | recusa | taxa de resolve |",
    "|---|---:|---:|---:|---:|---:|",
    ...p.porSerie.map((s) => `| ${s.serie} | ${s.textos} | ${s.resolve} | ${s.revisa} | ${s.recusa} | ${porcento(s.resolve, s.textos)} |`),
    "",
  ];
  return linhas.join("\n");
}
