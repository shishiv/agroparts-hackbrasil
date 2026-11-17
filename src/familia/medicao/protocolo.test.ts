import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lerMateriais } from "../../exportacao";
import { alvosDoJev } from "../alvos";
import { classesOferecidas, lerClassesDaArvore } from "../classes";
import { escreverAmostra, itensJaVistos, lerAmostra } from "./amostra";
import { avaliar } from "./avaliar";
import { PROTOCOLO } from "./protocolo";
import { formatarRelatorio } from "./relatorio";
import { lerResultados } from "./resultados";

const RAIZ = new URL("../../../", import.meta.url);
const lerTexto = (caminho: string) => readFileSync(new URL(caminho, RAIZ), "utf8");

function amostraDoRepositorio() {
  const lida = lerAmostra(lerTexto("docs/medicao/familia-amostra.json"));
  if (!lida.ok) throw new Error(JSON.stringify(lida.erros));
  return lida.valor;
}

function oferecidas() {
  const arvore = lerClassesDaArvore(lerTexto("dados/catmat/arvore.json"));
  if (!arvore.ok) throw new Error("árvore ilegível");
  return classesOferecidas(arvore.valor);
}

describe("a amostra do repositório", () => {
  it("escreve de volta o mesmo texto", () => {
    expect(escreverAmostra(amostraDoRepositorio())).toBe(lerTexto("docs/medicao/familia-amostra.json"));
  });

  it("segue o protocolo: as classes combinadas, dez itens em cada uma e `dentro` igual ao que o Jev recebe", () => {
    const { classes, itens } = amostraDoRepositorio();
    const codigosOferecidos = new Set(oferecidas().map((c) => c.codigo as string));

    expect(classes.map((c) => c.codigo)).toEqual([...PROTOCOLO.classesDentro, ...PROTOCOLO.classesFora]);
    for (const classe of classes) {
      expect(classe.dentro).toBe(codigosOferecidos.has(classe.codigo));
      expect(itens.filter((i) => i.codigoClasse === classe.codigo)).toHaveLength(PROTOCOLO.itensPorClasse);
    }
  });
});

describe("docs/medicao/familia.md", () => {
  it("é o que o gerador escreve hoje com a amostra e as respostas do repositório", () => {
    const amostra = amostraDoRepositorio();
    const resultados = existsSync(new URL("docs/medicao/familia-respostas.json", RAIZ))
      ? lerResultados(lerTexto("docs/medicao/familia-respostas.json"))
      : null;
    if (resultados && !resultados.ok) throw new Error("familia-respostas.json ilegível");
    const medicao = resultados?.ok ? { resultados: resultados.valor, avaliacao: avaliar(amostra, resultados.valor, PROTOCOLO) } : null;
    const materiais = lerMateriais(lerTexto("dados/demo/materiais.csv"));
    if (!materiais.ok) throw new Error("materiais.csv ilegível");
    const jaVistos = itensJaVistos(amostra, alvosDoJev(materiais.valor).comTexto.map((m) => m.descricao));
    const esperado = formatarRelatorio({ protocolo: PROTOCOLO, amostra, classesOferecidas: oferecidas(), itensJaVistos: jaVistos, medicao });
    expect(lerTexto("docs/medicao/familia.md")).toBe(esperado);
  });
});
