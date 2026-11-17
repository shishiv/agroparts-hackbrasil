import type { Trecho } from "../../../contrato";
import { emAplicacao, type Campo } from "./campos";
import { numerosDeReferencia } from "./designacao";
import { FABRICANTES, comoFolga, type Escrito, type Folga } from "./sufixos";

/** Como o texto abre: a primeira palavra diz de que peça o texto fala. */
export type Abertura = "rolamento" | "marca" | "numero" | "outra";

/**
 * O que as palavras do texto dizem, fora da cadeia de sufixos da designação.
 * As palavras nunca determinam a vedação: só a confirmam, a contradizem, ou
 * dizem que o rolamento é aberto. `n` já está normalizado.
 */
export interface Palavras {
  abertura: Abertura;
  referenciaEscrita: boolean;
  /** A folga que o texto escreve com a palavra "FOLGA". */
  folgas: Escrito<Folga>[];
  /** A expressão inteira, "FOLGA C3". */
  expressoesDeFolga: Trecho[];
  abertos: Trecho[];
  /** "BLINDAGEM", "BLINDADO", "VEDAÇÃO", "VEDADO" sem ser a expressão de rolamento aberto. */
  vedacoesEscritas: Trecho[];
  metalicos: Trecho[];
  borrachas: Trecho[];
  duplas: Trecho[];
  simples: Trecho[];
  outrosTipos: Trecho[];
  variantes: Trecho[];
  /** Furos escritos no texto, em milímetros. */
  furos: number[];
  /** As medidas que o motor entendeu, para não contarem como palavra desconhecida. */
  medidas: Trecho[];
}

const PALAVRAS_DE_ROLAMENTO = /^(?:ROL(?:AM(?:EN(?:TOS?)?|TO)?)?|RIGIDO|RIG|ESFERAS?|ESF)$/;

const BORDA = "(?:^|[^A-Z0-9])";
const FIM = "(?![A-Z0-9])";
const regex = (corpo: string): RegExp => new RegExp(corpo, "gd");

const FOLGA_ESCRITA = regex(`(FOLGA:? *(C[1-5]|CN))${FIM}`);
const ABERTO = regex(`${BORDA}(ABERTOS?|(?:S/ ?|SEM )(?:BLINDAGEM|VEDACAO|VEDACOES))${FIM}`);
const METALICO = regex(`${BORDA}(METALIC[OA]S?)${FIM}`);
const BORRACHA = regex(`${BORDA}(BORRACHA|NBR(?! *\\d)|NITRILIC[OA])${FIM}`);
const VEDACAO_ESCRITA = regex(`${BORDA}(BLINDAGEM|BLINDADO|VEDACAO|VEDADO)${FIM}`);
const DUPLA = regex(`${BORDA}(DUPLA|DUPLO|AMBOS|AMB|DOIS +LADOS|2 +LADOS|2 +PLACAS|DUAS +PLACAS)${FIM}`);
const SIMPLES = regex(`${BORDA}(SIMPLES|UM +LADO|UM +DOS +LADOS?|UMA +BLINDAGEM|UMA +VEDACAO|1 +PLACA|UMA +PLACA)${FIM}`);
const OUTRO_TIPO = regex(
  `${BORDA}(AUTO ?COMPENS[A-Z]*|AUTOCOMP[A-Z]*|CONTATO ANGULAR|CONT ANGULAR|AGULHAS?|CONIC[OA]|CONICIDADE|[2-9] +CARREIRAS?|DUAS +CARREIRAS?|DOIS +CARREIRAS?|CARREIRAS? +DUP(?:LA|LO)|DUP(?:LA|LO) +CARREIRAS?|ROLOS?)${FIM}`,
);
const VARIANTE = regex(
  `${BORDA}(INOX[A-Z]*|STAINLESS|AISI|CERAMIC[A-Z]*|ZIRCON[A-Z]*|NITRETO|PLASTIC[A-Z]*|NYLON|POLIAMIDA|PEEK|HIBRID[A-Z]*|ISOLA[A-Z]*|INSOCOAT|FLANGE[A-Z]*|ALTAS? TEMP[A-Z]*|HIGH TEMP|TEMPERATURAS?|TRAVA|RANHURA|BUCHA|GRAXA|LUBRIFIC[A-Z]*)${FIM}`,
);
const REFERENCIA_ESTRUTURADA = /REFERENCIA FABRICANTE *\d*: *[A-Z0-9]|PART NUMBER *[A-Z0-9]/;

/** Frases do CATMAT sobre carga e velocidade. Descrevem o rolamento sem mudar a peça. */
const FRASE_CONHECIDA = regex(
  `${BORDA}(CARGA +AXIAL +E +RADIAL|CARGA +DIN\\.? +APRO[A-Z]*|VELOCIDADE[- ]LIMITE +(?:MINIMA|MAXIMA)? *:? *\\d+ *RPM)`,
);

const NUMERO = "\\d+(?:,\\d+)?";
const MEDIDAS_EM_X = regex(`(?:^|[^A-Z0-9,.])((${NUMERO})(?: *MM)?(?: *[X*] *${NUMERO}(?: *MM)?){1,2})(?! *[X*])`);
const FURO_ROTULADO = regex(`${BORDA}((?:DIAMETRO INTERNO|DIAM\\.? INTERNO|FURO) *[:=]? *(${NUMERO}) *MM)${FIM}`);
const OUTRA_MEDIDA = regex(
  `${BORDA}((?:DIAMETRO EXTERNO|DIAM\\.? EXTERNO|LARGURA|ALTURA|ESPESSURA) *[:=]? *${NUMERO}(?: *MM)?|${NUMERO} *(?:RPM|KN))${FIM}`,
);

function abertura(n: string): Abertura {
  const primeira = /^[^A-Z0-9]*([A-Z0-9]+)/.exec(n)?.[1] ?? "";
  if (PALAVRAS_DE_ROLAMENTO.test(primeira)) return "rolamento";
  if (FABRICANTES.has(primeira)) return "marca";
  return /^\d/.test(primeira) ? "numero" : "outra";
}

const numero = (texto: string): number => Number(texto.replace(",", "."));

export function lerPalavras(n: string, campos: readonly Campo[]): Palavras {
  const grupos = (re: RegExp, indice = 1): { trecho: Trecho; texto: string }[] =>
    [...n.matchAll(re)].flatMap((m) => {
      const grupo = m.indices?.[indice];
      const texto = m[indice];
      return grupo && texto !== undefined ? [{ trecho: { inicio: grupo[0], fim: grupo[1] }, texto }] : [];
    });
  const trechos = (re: RegExp): Trecho[] => grupos(re).map((g) => g.trecho);

  const folgas = grupos(FOLGA_ESCRITA, 2).flatMap((g): Escrito<Folga>[] => {
    const valor = comoFolga(g.texto);
    return valor ? [{ valor, trecho: g.trecho }] : [];
  });
  /** "ABERTO" no campo de aplicação fala do equipamento ("MOTOR ABERTO"), não da vedação do rolamento. */
  const abertos = trechos(ABERTO).filter((t) => !emAplicacao(campos, t.inicio));
  const foraDosAbertos = (t: Trecho): boolean => !abertos.some((a) => t.inicio >= a.inicio && t.fim <= a.fim);
  const furosEmX = grupos(MEDIDAS_EM_X, 2);
  const furosRotulados = grupos(FURO_ROTULADO, 2);
  return {
    abertura: abertura(n),
    referenciaEscrita: REFERENCIA_ESTRUTURADA.test(n) || numerosDeReferencia(n).some((x) => x.digitos.length >= 3),
    folgas,
    expressoesDeFolga: trechos(FOLGA_ESCRITA),
    abertos,
    vedacoesEscritas: trechos(VEDACAO_ESCRITA).filter(foraDosAbertos),
    metalicos: trechos(METALICO),
    borrachas: trechos(BORRACHA),
    duplas: trechos(DUPLA),
    simples: trechos(SIMPLES),
    outrosTipos: trechos(OUTRO_TIPO),
    variantes: trechos(VARIANTE),
    furos: [...furosEmX, ...furosRotulados].map((g) => numero(g.texto)),
    medidas: [...trechos(MEDIDAS_EM_X), ...trechos(FURO_ROTULADO), ...trechos(OUTRA_MEDIDA), ...trechos(FRASE_CONHECIDA)],
  };
}
