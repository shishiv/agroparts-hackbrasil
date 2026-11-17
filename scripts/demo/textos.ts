import type { ItemCatmat } from "../baixar-catmat";
import type { AtributoJson } from "../../src/exportacao";
import { MARCAS_DE_VEDACAO, dimensoesDoItem, type Parte } from "./catmat";
import type { Sorteio } from "./sorteio";

export interface TextoDeMaterial {
  texto: string;
  atributos: AtributoJson[];
}

export type Estilo = "catmat" | "curto" | "medidas" | "tecnico";

const PREFIXOS = ["ROLAMENTO", "ROL.", "ROL", "ROLAM.", "ROLAMENTO RIGIDO", "ROL RIG ESF", "ROLAMENTO RIGIDO DE ESFERAS"];
const FABRICANTES = ["", "", "SKF", "FAG", "NSK", "NTN", "KOYO"];

/** Monta um texto e anota onde cada atributo ficou. */
class Montador {
  texto = "";
  readonly atributos: AtributoJson[] = [];

  solto(trecho: string): this {
    this.texto += trecho;
    return this;
  }

  atributo(nome: string, valor: string, escrito: string): this {
    const inicio = this.texto.length;
    this.texto += escrito;
    this.atributos.push({ nome, valor, trecho: { inicio, fim: this.texto.length } });
    return this;
  }
}

function montarCurto(parte: Parte, sorteio: Sorteio, comMedidas: string | null): TextoDeMaterial {
  const m = new Montador();
  m.solto(`${sorteio.escolher(PREFIXOS)} `);
  m.atributo("serie", parte.serie, parte.serie);
  const marca = sorteio.escolher(MARCAS_DE_VEDACAO[parte.vedacao]);
  m.solto(sorteio.escolher(/^\d/.test(marca) ? [" ", "-"] : ["", " ", "-"]));
  m.atributo("vedacao", parte.vedacao, marca);
  if (parte.folga === "C3") {
    m.solto(sorteio.escolher([" ", "/", "-"]));
    m.atributo("folga", "C3", "C3");
  }
  if (comMedidas) m.solto(` ${comMedidas}`);
  const fabricante = sorteio.escolher(FABRICANTES);
  if (fabricante) m.solto(` ${fabricante}`);
  return { texto: m.texto, atributos: m.atributos };
}

function montarTecnico(parte: Parte, sorteio: Sorteio, medidas: string): TextoDeMaterial {
  const m = new Montador();
  m.solto("ROLAMENTO RIGIDO DE ESFERAS ");
  m.atributo("serie", parte.serie, parte.serie);
  m.solto(" ");
  m.atributo("vedacao", parte.vedacao, sorteio.escolher(MARCAS_DE_VEDACAO[parte.vedacao]));
  if (parte.folga === "C3") {
    m.solto(" ");
    m.atributo("folga", "C3", "C3");
  }
  m.solto(` - ${medidas} MM - ${sorteio.escolher(["UMA CARREIRA", "1 CARREIRA", "UMA CARREIRA DE ESFERAS"])}`);
  return { texto: m.texto, atributos: m.atributos };
}

/**
 * Procura, no texto verbatim do CATMAT, onde a série, a vedação e a folga que o
 * cenário afirma aparecem escritas. Falha se não achar: o cenário e o CATMAT
 * discordariam.
 */
function localizarNoCatmat(parte: Parte, item: ItemCatmat): TextoDeMaterial {
  const texto = item.descricaoItem;
  const atributos: AtributoJson[] = [];
  const serie = texto.indexOf(parte.serie);
  if (serie < 0) throw new Error(`peça ${parte.id}: série ${parte.serie} fora do texto do item ${item.codigoItem}`);
  atributos.push({ nome: "serie", valor: parte.serie, trecho: { inicio: serie, fim: serie + parte.serie.length } });
  const aposSerie = serie + parte.serie.length;
  const marca = MARCAS_DE_VEDACAO[parte.vedacao]
    .map((escrita) => ({ escrita, inicio: texto.indexOf(escrita, aposSerie) }))
    .filter((c) => c.inicio >= 0)
    .sort((a, b) => a.inicio - b.inicio || b.escrita.length - a.escrita.length)[0];
  if (!marca) throw new Error(`peça ${parte.id}: vedação ${parte.vedacao} fora do texto do item ${item.codigoItem}`);
  atributos.push({
    nome: "vedacao",
    valor: parte.vedacao,
    trecho: { inicio: marca.inicio, fim: marca.inicio + marca.escrita.length },
  });
  if (parte.folga === "C3") {
    const folga = texto.indexOf("C3", marca.inicio);
    if (folga < 0) throw new Error(`peça ${parte.id}: folga C3 fora do texto do item ${item.codigoItem}`);
    atributos.push({ nome: "folga", valor: "C3", trecho: { inicio: folga, fim: folga + 2 } });
  }
  return { texto, atributos };
}

function minusculas(texto: TextoDeMaterial): TextoDeMaterial {
  return { texto: texto.texto.toLowerCase(), atributos: texto.atributos };
}

export function descreverParte(parte: Parte, item: ItemCatmat, estilo: Estilo, sorteio: Sorteio): TextoDeMaterial {
  const { interno, externo, largura } = dimensoesDoItem(item);
  const medidas = `${interno}X${externo}X${largura}`;
  const base =
    estilo === "catmat"
      ? localizarNoCatmat(parte, item)
      : estilo === "medidas"
        ? montarCurto(parte, sorteio, medidas)
        : estilo === "tecnico"
          ? montarTecnico(parte, sorteio, medidas)
          : montarCurto(parte, sorteio, null);
  const ascii = /^[\x20-\x7e]*$/.test(base.texto);
  return estilo !== "catmat" && ascii && sorteio.chance(0.12) ? minusculas(base) : base;
}

export const ESTILOS_DE_USINA: readonly Estilo[] = ["curto", "curto", "medidas", "tecnico"];
