import type { ClasseCatmat, ErroDeLinha, Lido, NaoVazia } from "../contrato";
import type { Tentativa } from "../exportacao/valores";

export interface Classe {
  codigo: ClasseCatmat;
  nome: string;
  codigoGrupo: number;
  nomeGrupo: string;
}

/**
 * Grupos do CATMAT cujas classes o Jev pode sugerir: o que um almoxarifado de
 * manutenção industrial compra. Uma pergunta Choice aceita 255 opções e a árvore
 * tem 711 classes, então o conjunto oferecido é este recorte, não a árvore toda.
 * Item de outro grupo (papelaria, alimento, móvel) deve terminar em "nenhuma".
 */
export const GRUPOS_OFERECIDOS: readonly number[] = [
  28, 29, 30, 31, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 56, 59, 61, 62, 68, 80, 91, 93, 95,
];

/** A pergunta Choice do Jev aceita até 255 opções, contando a opção "nenhuma". */
export const MAXIMO_DE_OPCOES = 255;

const FORMATO_DA_CLASSE = /^\d{4}$/;

/** Única função que cria `ClasseCatmat`. Quem a chama confere antes que o código existe na árvore. */
export function marcarClasse(texto: string): Tentativa<ClasseCatmat> {
  if (!FORMATO_DA_CLASSE.test(texto)) return { ok: false, problema: `classe do CATMAT inválida: "${texto}"` };
  return { ok: true, valor: texto as ClasseCatmat };
}

export const limparNome = (nome: string): string => nome.replace(/\s+/g, " ").trim();

type Objeto = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);

/** Lê `dados/catmat/arvore.json` e devolve as classes ativas dos grupos ativos, por código de classe. */
export function lerClassesDaArvore(texto: string): Lido<readonly Classe[]> {
  const erros: ErroDeLinha[] = [];
  const erro = (coluna: string, problema: string) => erros.push({ arquivo: "arvore.json", linha: 0, coluna, problema });
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { ok: false, erros: [{ arquivo: "arvore.json", linha: 0, coluna: "", problema: "JSON inválido" }] };
  }
  const grupos: unknown[] | null = ehObjeto(bruto) && Array.isArray(bruto.grupos) ? bruto.grupos : null;
  if (!grupos) {
    return { ok: false, erros: [{ arquivo: "arvore.json", linha: 0, coluna: "grupos", problema: "esperava uma lista" }] };
  }

  const classes: Classe[] = [];
  const vistas = new Set<string>();
  grupos.forEach((grupo, g) => {
    const caminho = `grupos[${g}]`;
    if (!ehObjeto(grupo) || typeof grupo.codigoGrupo !== "number" || typeof grupo.nomeGrupo !== "string") {
      erro(caminho, "esperava codigoGrupo e nomeGrupo");
      return;
    }
    if (grupo.statusGrupo !== true || !Array.isArray(grupo.classes)) return;
    const listaDeClasses: unknown[] = grupo.classes;
    for (const [c, classe] of listaDeClasses.entries()) {
      const onde = `${caminho}.classes[${c}]`;
      if (!ehObjeto(classe) || typeof classe.codigoClasse !== "number" || typeof classe.nomeClasse !== "string") {
        erro(onde, "esperava codigoClasse e nomeClasse");
        continue;
      }
      if (classe.statusClasse !== true) continue;
      const codigo = marcarClasse(String(classe.codigoClasse));
      if (!codigo.ok) {
        erro(onde, codigo.problema);
        continue;
      }
      if (vistas.has(codigo.valor)) {
        erro(onde, `classe repetida: ${codigo.valor}`);
        continue;
      }
      vistas.add(codigo.valor);
      classes.push({
        codigo: codigo.valor,
        nome: limparNome(classe.nomeClasse),
        codigoGrupo: grupo.codigoGrupo,
        nomeGrupo: limparNome(grupo.nomeGrupo),
      });
    }
  });

  const [primeiro, ...resto] = erros;
  if (primeiro) return { ok: false, erros: [primeiro, ...resto] };
  return { ok: true, valor: classes.sort((a, b) => Number(a.codigo) - Number(b.codigo)) };
}

/** As classes que o Jev pode sugerir, em ordem de código. */
export function classesOferecidas(classes: readonly Classe[]): NaoVazia<Classe> {
  const oferecidas = classes.filter((c) => GRUPOS_OFERECIDOS.includes(c.codigoGrupo));
  const [primeira, ...resto] = oferecidas;
  if (!primeira) throw new Error("nenhuma classe da árvore pertence aos grupos oferecidos");
  if (oferecidas.length + 1 > MAXIMO_DE_OPCOES) {
    throw new Error(`${oferecidas.length} classes mais "nenhuma" passam de ${MAXIMO_DE_OPCOES} opções`);
  }
  return [primeira, ...resto];
}

/** As mesmas classes na ordem contrária, para conferir se a ordem das opções muda a resposta. */
export function inverter(classes: NaoVazia<Classe>): NaoVazia<Classe> {
  const [primeira, ...resto] = classes.toReversed();
  if (!primeira) throw new Error("lista vazia");
  return [primeira, ...resto];
}
