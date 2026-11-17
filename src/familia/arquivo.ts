import type { ClasseCatmat, CodigoLegado, ErroDeLinha, Lido } from "../contrato";
import { lerCodigo } from "../exportacao/valores";
import { marcarClasse } from "./classes";
import type { Regra } from "./decidir";
import { NENHUMA } from "./pergunta";
import type { Sugestao } from "./sugerir";

export const NOME_DO_ARQUIVO = "familias-jev.json";
export const VERSAO_DO_ARQUIVO = "familias-jev-1";

export interface ClasseDoArquivo {
  nome: string;
  grupo: string;
}

/** O que `dados/demo/familias-jev.json` guarda, já lido na fronteira. */
export interface ArquivoDeFamilias {
  versao: string;
  modelo: string;
  geradoEm: string;
  regra: Regra;
  /** Só as classes que alguma sugestão usa, com o nome, para a página não baixar a árvore inteira. */
  classes: ReadonlyMap<ClasseCatmat, ClasseDoArquivo>;
  /** Códigos que o motor não resolve e que não têm descrição: o Jev não é chamado para eles. */
  semTexto: readonly CodigoLegado[];
  sugestoes: ReadonlyMap<CodigoLegado, Sugestao>;
}

type Objeto = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);
const ehProbabilidade = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

class Coletor {
  private readonly erros: ErroDeLinha[] = [];

  erro(coluna: string, problema: string): undefined {
    this.erros.push({ arquivo: NOME_DO_ARQUIVO, linha: 0, coluna, problema });
    return undefined;
  }

  texto(v: unknown, coluna: string): string | undefined {
    return typeof v === "string" && v !== "" ? v : this.erro(coluna, "esperava um texto");
  }

  probabilidade(v: unknown, coluna: string): number | undefined {
    return ehProbabilidade(v) ? v : this.erro(coluna, "esperava um número de 0 a 1");
  }

  resultado<T>(valor: T | undefined): Lido<T> {
    const [primeiro, ...resto] = this.erros;
    if (primeiro) return { ok: false, erros: [primeiro, ...resto] };
    if (valor === undefined) return falhar("", "arquivo incompleto");
    return { ok: true, valor };
  }
}

function falhar(coluna: string, problema: string): Lido<never> {
  return { ok: false, erros: [{ arquivo: NOME_DO_ARQUIVO, linha: 0, coluna, problema }] };
}

function lerClasses(bruto: unknown, coletor: Coletor): Map<ClasseCatmat, ClasseDoArquivo> {
  const classes = new Map<ClasseCatmat, ClasseDoArquivo>();
  if (!ehObjeto(bruto)) {
    coletor.erro("classes", "esperava um objeto");
    return classes;
  }
  for (const [chave, valor] of Object.entries(bruto)) {
    const classe = marcarClasse(chave);
    if (!classe.ok) {
      coletor.erro(`classes.${chave}`, classe.problema);
      continue;
    }
    const nome = ehObjeto(valor) ? coletor.texto(valor.nome, `classes.${chave}.nome`) : coletor.erro(`classes.${chave}`, "esperava um objeto");
    const grupo = ehObjeto(valor) ? coletor.texto(valor.grupo, `classes.${chave}.grupo`) : undefined;
    if (nome !== undefined && grupo !== undefined) classes.set(classe.valor, { nome, grupo });
  }
  return classes;
}

function lerSugestao(
  bruto: unknown,
  caminho: string,
  classes: ReadonlyMap<ClasseCatmat, ClasseDoArquivo>,
  coletor: Coletor,
): Sugestao | undefined {
  if (!ehObjeto(bruto)) return coletor.erro(caminho, "esperava um objeto");
  const codigo = lerCodigo(String(bruto.codigo ?? ""));
  if (!codigo.ok) return coletor.erro(`${caminho}.codigo`, codigo.problema);

  const classeDoArquivo = (texto: unknown, onde: string): ClasseCatmat | undefined => {
    const classe = marcarClasse(String(texto ?? ""));
    if (!classe.ok) return coletor.erro(onde, classe.problema);
    return classes.has(classe.valor) ? classe.valor : coletor.erro(onde, `classe ${classe.valor} não está em "classes"`);
  };

  const resposta = bruto.resposta;
  let lida: Sugestao["resposta"] | undefined;
  if (ehObjeto(resposta) && resposta.tipo === "nenhuma") lida = { tipo: "nenhuma" };
  else if (ehObjeto(resposta) && resposta.tipo === "classe") {
    const classe = classeDoArquivo(resposta.classe, `${caminho}.resposta.classe`);
    if (classe) lida = { tipo: "classe", classe };
  } else coletor.erro(`${caminho}.resposta`, "esperava tipo classe ou nenhuma");

  const jev = bruto.jev;
  if (!ehObjeto(jev)) return coletor.erro(`${caminho}.jev`, "esperava um objeto");
  const escolha = jev.escolha === NENHUMA ? NENHUMA : classeDoArquivo(jev.escolha, `${caminho}.jev.escolha`);
  if (lida?.tipo === "classe" && escolha !== lida.classe) {
    coletor.erro(`${caminho}.jev.escolha`, "a sugestão de classe tem de ser a classe que o Jev escolheu");
  }

  const probabilidade = coletor.probabilidade(bruto.probabilidade, `${caminho}.probabilidade`);
  const confianca = coletor.probabilidade(bruto.confianca, `${caminho}.confianca`);
  const probabilidadeDaEscolha = coletor.probabilidade(jev.probabilidadeDaEscolha, `${caminho}.jev.probabilidadeDaEscolha`);
  const noul = coletor.probabilidade(jev.noul, `${caminho}.jev.noul`);
  const modelo = coletor.texto(bruto.modelo, `${caminho}.modelo`);

  if (
    lida === undefined ||
    escolha === undefined ||
    probabilidade === undefined ||
    confianca === undefined ||
    probabilidadeDaEscolha === undefined ||
    noul === undefined ||
    modelo === undefined
  ) {
    return undefined;
  }
  return { codigo: codigo.valor, resposta: lida, probabilidade, confianca, modelo, jev: { escolha, probabilidadeDaEscolha, noul } };
}

/** Fronteira do arquivo: devolve sugestões tipadas ou a lista de problemas, sem lançar. */
export function lerArquivoDeFamilias(texto: string): Lido<ArquivoDeFamilias> {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return falhar("", "JSON inválido");
  }
  return validarArquivoDeFamilias(bruto);
}

/** Mesma fronteira, para quem já tem o JSON lido, como um `import` do arquivo. */
export function validarArquivoDeFamilias(bruto: unknown): Lido<ArquivoDeFamilias> {
  if (!ehObjeto(bruto)) return falhar("", "esperava um objeto na raiz");
  if (bruto.versao !== VERSAO_DO_ARQUIVO) return falhar("versao", `esperava ${VERSAO_DO_ARQUIVO}`);

  const coletor = new Coletor();
  const modelo = coletor.texto(bruto.modelo, "modelo");
  const geradoEm =
    typeof bruto.geradoEm === "string" && DATA.test(bruto.geradoEm) ? bruto.geradoEm : coletor.erro("geradoEm", "esperava AAAA-MM-DD");

  const bruta = bruto.regra;
  const versaoDaRegra = ehObjeto(bruta) ? coletor.texto(bruta.versao, "regra.versao") : coletor.erro("regra", "esperava um objeto");
  const noulMinimo = ehObjeto(bruta) ? coletor.probabilidade(bruta.noulMinimo, "regra.noulMinimo") : undefined;
  const escolhaMinima = ehObjeto(bruta) ? coletor.probabilidade(bruta.escolhaMinima, "regra.escolhaMinima") : undefined;

  const classes = lerClasses(bruto.classes, coletor);

  const semTexto: CodigoLegado[] = [];
  const listaSemTexto: unknown[] = Array.isArray(bruto.semTexto) ? bruto.semTexto : [];
  if (!Array.isArray(bruto.semTexto)) coletor.erro("semTexto", "esperava uma lista");
  listaSemTexto.forEach((item, i) => {
    const codigo = lerCodigo(String(item ?? ""));
    if (codigo.ok) semTexto.push(codigo.valor);
    else coletor.erro(`semTexto[${i}]`, codigo.problema);
  });

  const sugestoes = new Map<CodigoLegado, Sugestao>();
  const listaSugestoes: unknown[] = Array.isArray(bruto.sugestoes) ? bruto.sugestoes : [];
  if (!Array.isArray(bruto.sugestoes)) coletor.erro("sugestoes", "esperava uma lista");
  listaSugestoes.forEach((item, i) => {
    const sugestao = lerSugestao(item, `sugestoes[${i}]`, classes, coletor);
    if (!sugestao) return;
    if (sugestoes.has(sugestao.codigo) || semTexto.includes(sugestao.codigo)) {
      coletor.erro(`sugestoes[${i}].codigo`, `código repetido: ${sugestao.codigo}`);
      return;
    }
    sugestoes.set(sugestao.codigo, sugestao);
  });

  const completo =
    modelo !== undefined &&
    geradoEm !== undefined &&
    versaoDaRegra !== undefined &&
    noulMinimo !== undefined &&
    escolhaMinima !== undefined;
  return coletor.resultado(
    completo
      ? {
          versao: VERSAO_DO_ARQUIVO,
          modelo,
          geradoEm,
          regra: { versao: versaoDaRegra, noulMinimo, escolhaMinima },
          classes,
          semTexto,
          sugestoes,
        }
      : undefined,
  );
}

/** O arquivo em texto: classes e sugestões em ordem de código, uma sugestão por linha. */
export function escreverArquivoDeFamilias(arquivo: ArquivoDeFamilias): string {
  const porCodigo = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const classes = [...arquivo.classes].sort(([a], [b]) => porCodigo(a, b));
  const sugestoes = [...arquivo.sugestoes.values()].sort((a, b) => porCodigo(a.codigo, b.codigo));
  const linhas = [
    "{",
    `  "versao": ${JSON.stringify(arquivo.versao)},`,
    `  "modelo": ${JSON.stringify(arquivo.modelo)},`,
    `  "geradoEm": ${JSON.stringify(arquivo.geradoEm)},`,
    `  "regra": ${JSON.stringify(arquivo.regra)},`,
    '  "classes": {',
    classes.map(([codigo, classe]) => `    ${JSON.stringify(codigo)}: ${JSON.stringify(classe)}`).join(",\n"),
    "  },",
    `  "semTexto": ${JSON.stringify([...arquivo.semTexto].sort(porCodigo))},`,
    '  "sugestoes": [',
    sugestoes.map((s) => `    ${JSON.stringify(s)}`).join(",\n"),
    "  ]",
    "}",
  ];
  return `${linhas.join("\n")}\n`;
}
