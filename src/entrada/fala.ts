/**
 * Leva o que o modelo de fala escreveu para o texto que o motor lê.
 *
 * A troca é por soletração e não conhece família: dígitos e nomes de letra ditos
 * viram caracteres, e a pausa entre dois códigos deixa de ser vírgula. O que o
 * texto quer dizer fica para o motor, e o que sair errado fica para a pessoa,
 * que confere o campo antes de confirmar.
 */

/** Cada linha é as grafias de uma soletração, separadas por espaço, e os caracteres que ela vale. */
type Tabela = readonly (readonly [string, string])[];

const FIRMES: Tabela = [
  ["zero", "0"],
  ["dois duas", "2"],
  ["três tres", "3"],
  ["quatro", "4"],
  ["cinco", "5"],
  ["seis", "6"],
  ["sete", "7"],
  ["oito", "8"],
  ["nove", "9"],
  ["dez", "10"],
  ["onze", "11"],
  ["doze", "12"],
  ["treze", "13"],
  ["catorze quatorze", "14"],
  ["quinze", "15"],
  ["dezesseis", "16"],
  ["dezessete", "17"],
  ["dezoito", "18"],
  ["dezenove", "19"],
  ["vinte", "20"],
  ["trinta", "30"],
  ["quarenta", "40"],
  ["cinquenta", "50"],
  ["sessenta", "60"],
  ["setenta", "70"],
  ["oitenta", "80"],
  ["noventa", "90"],
  ["bê be", "B"],
  ["cê ce", "C"],
  ["dê", "D"],
  ["efe", "F"],
  ["gê ge", "G"],
  ["agá aga", "H"],
  ["jota", "J"],
  ["eme", "M"],
  ["ene", "N"],
  ["pê", "P"],
  ["erre", "R"],
  ["tê", "T"],
  ["xis", "X"],
  ["ípsilon ipsilon", "Y"],
  ["dábliu dáblio", "W"],
  ["zê ze", "Z"],
];

/** Palavras do dia a dia que também são dígito ou letra: só valem ao lado de uma soletração firme. */
const FRACAS: Tabela = [
  ["um uma", "1"],
  ["meia", "6"],
  ["esse", "S"],
  ["ele", "L"],
  ["vê", "V"],
  ["cá", "K"],
  ["quê", "Q"],
];

const indexar = (tabela: Tabela): ReadonlyMap<string, string> =>
  new Map(tabela.flatMap(([grafias, valor]) => grafias.split(" ").map((grafia) => [grafia, valor] as const)));

const FIRME = indexar(FIRMES);
const FRACA = indexar(FRACAS);
const UNIDADE = indexar([...FIRMES.filter(([, valor]) => /^[2-9]$/.test(valor)), ["um uma", "1"]]);
const DEZENA_REDONDA = /^[2-9]0$/;

interface Palavra {
  texto: string;
  /** O que vem depois dela, até a próxima palavra. */
  depois: string;
  /** Os caracteres que ela vale quando é uma soletração. */
  valor: string | null;
  firme: boolean;
  /** Vale como código: soletração aceita, ou texto que a transcrição já escreveu como código. */
  codigo: boolean;
}

const palavra = (texto: string, depois: string, valor: string | null, firme: boolean): Palavra => ({ texto, depois, valor, firme, codigo: firme });

const soEspaco = (texto: string): boolean => /^\s+$/.test(texto);

const minuscula = (p: Palavra | undefined): string => p?.texto.toLowerCase() ?? "";

function partir(texto: string): { inicio: string; palavras: Palavra[] } {
  const inicio = /^[^\p{L}\p{N}]*/u.exec(texto)?.[0] ?? "";
  const palavras = [...texto.matchAll(/([\p{L}\p{N}]+(?:[.,][\p{N}]+)*)([^\p{L}\p{N}]*)/gu)].map(([, texto = "", depois = ""]) => {
    const firme = FIRME.get(texto.toLowerCase());
    return palavra(texto, depois, firme ?? FRACA.get(texto.toLowerCase()) ?? null, firme !== undefined);
  });
  return { inicio, palavras };
}

/** "sessenta e dois" é "62": a dezena, o "e" e a unidade viram uma palavra só. */
function juntarDezenaEUnidade(palavras: Palavra[]): Palavra[] {
  const saida: Palavra[] = [];
  for (let i = 0; i < palavras.length; i++) {
    const [dezena, e, unidade] = [palavras[i], palavras[i + 1], palavras[i + 2]];
    const digitoDaUnidade = UNIDADE.get(minuscula(unidade));
    if (
      dezena?.valor &&
      DEZENA_REDONDA.test(dezena.valor) &&
      soEspaco(dezena.depois) &&
      e &&
      minuscula(e) === "e" &&
      soEspaco(e.depois) &&
      unidade &&
      digitoDaUnidade
    ) {
      saida.push(palavra(`${dezena.texto} e ${unidade.texto}`, unidade.depois, `${dezena.valor.charAt(0)}${digitoDaUnidade}`, true));
      i += 2;
    } else if (dezena) {
      saida.push(dezena);
    }
  }
  return saida;
}

/** Uma palavra fraca só vale ao lado de uma que vale, com nada além de espaço entre elas. */
function aceitarFracas(palavras: Palavra[]): void {
  const vale = (i: number): boolean => palavras[i]?.codigo === true;
  palavras.forEach((p, i) => {
    if (p.valor !== null && !p.firme && soEspaco(palavras[i - 1]?.depois ?? "") && vale(i - 1)) p.codigo = true;
  });
  for (let i = palavras.length - 1; i >= 0; i--) {
    const p = palavras[i];
    if (p && p.valor !== null && !p.firme && soEspaco(p.depois) && vale(i + 1)) p.codigo = true;
  }
}

/** Soletrações vizinhas viram uma palavra: "seis três um zero" é "6310". */
function juntarSoletracoes(palavras: Palavra[]): Palavra[] {
  const saida: Palavra[] = [];
  for (let i = 0; i < palavras.length; i++) {
    const p = palavras[i];
    if (!p) continue;
    if (!p.codigo || p.valor === null) {
      saida.push(p);
      continue;
    }
    let texto = p.valor;
    let ultima = p;
    while (soEspaco(ultima.depois)) {
      const proxima = palavras[i + 1];
      if (!proxima?.codigo || proxima.valor === null) break;
      texto += proxima.valor;
      ultima = proxima;
      i++;
    }
    saida.push(palavra(texto, ultima.depois, null, true));
  }
  return saida;
}

const pareceCodigo = (p: Palavra | undefined): boolean => p !== undefined && (p.codigo || /\d/.test(p.texto) || /^\p{Lu}{1,3}$/u.test(p.texto));

/** A pausa entre dois códigos vira vírgula na transcrição, e o motor lê a vírgula como fim da designação. */
function tirarPausaEntreCodigos(palavras: Palavra[]): void {
  palavras.forEach((p, i) => {
    const soPausa = /[,;.]/.test(p.depois) && /^[\s,;.]+$/.test(p.depois);
    if (soPausa && pareceCodigo(p) && pareceCodigo(palavras[i + 1])) p.depois = " ";
  });
}

export function falaParaTexto(ouvido: string): string {
  const { inicio, palavras: partidas } = partir(ouvido.normalize("NFC"));
  const palavras = juntarDezenaEUnidade(partidas);
  aceitarFracas(palavras);
  const unidas = juntarSoletracoes(palavras);
  tirarPausaEntreCodigos(unidas);
  return (inicio + unidas.map((p) => p.texto + p.depois).join(""))
    .trim()
    .replace(/[\s,;.!?]+$/, "");
}
