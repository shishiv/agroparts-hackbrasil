import type { Trecho } from "../../../contrato";
import type { Campo } from "./campos";
import { FABRICANTES } from "./sufixos";

/**
 * As palavras que não mudam a peça e que o motor deixa passar. Qualquer outra palavra pode esconder
 * uma variante (inox, isolado, com anel de trava, de outra peça), e o texto vai para revisão.
 */
const PALAVRAS_CONHECIDAS: ReadonlySet<string> = new Set([
  // o rolamento
  "ROLAMENTO", "ROLAMENTOS", "ROL", "ROLAM", "ROLAMEN", "ROLAMTO", "RIGIDO", "RIG", "ESFERA", "ESFERAS", "ESF", "CARREIRA", "FIXO",
  "UMA", "UM", "DE", "DA", "DO", "DAS", "DOS", "E", "EM",
  // o que as regras de vedação lêem
  "BLINDAGEM", "BLINDADO", "VEDACAO", "VEDADO", "DUPLA", "DUPLO", "SIMPLES", "METALICO", "METALICA", "BORRACHA", "NBR", "AMB", "AMBOS", "LADO", "LADOS", "DOIS",
  // o CATMAT diz "2 PLACAS DE VEDAÇÃO" para a blindagem dos dois lados
  "PLACAS",
  // medidas e material
  "DIAMETRO", "INTERNO", "EXTERNO", "FURO", "LARGURA", "ALTURA", "MM",
  // rótulos de campo e quantidade
  "REF", "REFERENCIA", "FABRICANTE", "NOME", "TIPO", "USO", "MATERIAL", "UN", "UND", "UNID", "PC", "PCS", "PECA", "PECAS",
  // o que a marcação de fábrica no rolamento costuma trazer
  "MADE", "IN", "GERMANY", "SWEDEN", "JAPAN", "ITALY", "FRANCE", "CHINA", "INDIA", "USA", "BRASIL",
  ...FABRICANTES,
]);

/** O campo de material só diz "AÇO". Em outro lugar, "blindagem de aço" não quer dizer o que os códigos de vedação dizem. */
const PALAVRAS_DO_MATERIAL: ReadonlySet<string> = new Set(["ACO"]);

/** Um "E" que fecha o texto ou o campo, ou que vem antes de uma marca, não é conjunção: é o sufixo E da SKF, ou um texto cortado. */
const FECHA_O_CAMPO = new RegExp(`^ *(?:[,;)]|$|(?:${[...FABRICANTES].join("|")})(?![A-Z0-9]))`);

/** Número pequeno que conta uma quantidade, as carreiras ou as placas, como em "1 CARREIRA", "2 PLACAS" e "2 UN". */
const CONTADOR = /^ *(?:UN|UND|UNID|PC|PCS|PECAS?|PLACAS)(?![A-Z0-9])/;
const UMA_CARREIRA = /^ *CARREIRA(?![A-Z0-9])/;

/** O que o campo de aplicação do CATMAT diz do equipamento. Não muda a peça, mas o motor só deixa passar o que conhece. */
const PALAVRAS_DE_APLICACAO: ReadonlySet<string> = new Set([
  "OU", "MAQUINAS", "GERAL", "MOTOR", "MOTORES", "ELETRICOS", "WEG", "BRASIL", "SIMILAR", "SIMILARES", "AR", "CONDICIONADO", "CENTRAL",
  "SISTEMA", "REFRIGERACAO", "EXAUSTOR", "EXAUSTORES", "MANCAL", "EIXO", "CENTRIFUGA", "LAVANDERIA", "COMPENSADORES", "SINCRONOS", "TRANSMISSAO",
]);

/** Letra de outro alfabeto, símbolo ou sinal que o motor não sabe ler. Pontuação comum passa. */
const NAO_LATINO = /[^A-Z0-9\s,;:.\-/()+*=%&'"_[\]]+/g;

/**
 * As palavras e os números do texto que o motor não sabe o que são, nos campos que têm de ser
 * conhecidos por inteiro. `cobertos` traz o que a leitura já entendeu: designação, sufixos, folga, medidas.
 */
export function semExplicacao(n: string, campos: readonly Campo[], cobertos: readonly Trecho[]): Trecho[] {
  const entendido = new Uint8Array(n.length);
  for (const { inicio, fim } of cobertos) entendido.fill(1, inicio, fim);
  const sem: Trecho[] = [];
  for (const campo of campos) {
    const valor = n.slice(campo.inicio, campo.fim);
    for (const m of valor.matchAll(NAO_LATINO)) {
      sem.push({ inicio: campo.inicio + m.index, fim: campo.inicio + m.index + m[0].length });
    }
    for (const m of valor.matchAll(/[A-Z0-9]+/g)) {
      const inicio = campo.inicio + m.index;
      const fim = inicio + m[0].length;
      const token = m[0];
      if (entendido.subarray(inicio, fim).every((x) => x === 1)) continue;
      const depois = n.slice(fim);
      if (token === "E" && FECHA_O_CAMPO.test(depois)) {
        sem.push({ inicio, fim });
        continue;
      }
      if (PALAVRAS_CONHECIDAS.has(token)) continue;
      if (campo.papel === "material" && PALAVRAS_DO_MATERIAL.has(token)) continue;
      if (campo.papel === "aplicacao" && PALAVRAS_DE_APLICACAO.has(token)) continue;
      if (/^\d{1,2}$/.test(token) && CONTADOR.test(depois)) continue;
      if (token === "1" && UMA_CARREIRA.test(depois)) continue;
      sem.push({ inicio, fim });
    }
  }
  return sem;
}
