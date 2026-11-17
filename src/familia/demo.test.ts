import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lerMateriais } from "../exportacao";
import { lerParticaoEsperada } from "../exportacao";
import { alvosDoJev } from "./alvos";
import { lerArquivoDeFamilias } from "./arquivo";
import { lerClassesDaArvore } from "./classes";
import { decidir } from "./decidir";
import { familiaSugeridaDe, nomeDaClasse } from "./demo";
import { classe, cod } from "./teste-de-apoio";

const DEMO = new URL("../../dados/demo/", import.meta.url);
const ler = (nome: string) => readFileSync(new URL(nome, DEMO), "utf8");

function materiais() {
  const lidos = lerMateriais(ler("materiais.csv"));
  if (!lidos.ok) throw new Error("materiais.csv ilegível");
  return lidos.valor;
}

function particao() {
  const lida = lerParticaoEsperada(ler("esperado-particao.json"));
  if (!lida.ok) throw new Error("esperado-particao.json ilegível");
  return lida.valor;
}

function arquivo() {
  const lido = lerArquivoDeFamilias(ler("familias-jev.json"));
  if (!lido.ok) throw new Error("familias-jev.json ilegível");
  return lido.valor;
}

describe("familiaSugeridaDe, sobre a demo", () => {
  const naoResolvidos = particao().decisoes.filter((d) => d.decisao !== "resolve");
  const descricaoDe = new Map(materiais().map((m) => [m.codigo, m.descricao]));

  it("sugere uma família para cada código que o gabarito da demo não resolve e que tem descrição", () => {
    const comTexto = naoResolvidos.filter((d) => descricaoDe.get(d.codigo)?.trim() !== "");
    expect(comTexto.length).toBeGreaterThan(20);
    for (const { codigo } of comTexto) expect(familiaSugeridaDe(codigo)?.codigo).toBe(codigo);
  });

  it("não sugere nada para um código que o motor resolve, nem para um sem descrição, nem para um desconhecido", () => {
    for (const { codigo } of particao().decisoes.filter((d) => d.decisao === "resolve")) {
      expect(familiaSugeridaDe(codigo)).toBeNull();
    }
    const semDescricao = naoResolvidos.filter((d) => descricaoDe.get(d.codigo)?.trim() === "");
    expect(semDescricao.length).toBeGreaterThan(0);
    for (const { codigo } of semDescricao) expect(familiaSugeridaDe(codigo)).toBeNull();
    expect(familiaSugeridaDe(cod("99999"))).toBeNull();
  });

  it("escolhe os mesmos códigos que o motor deixa sem grupo", () => {
    const { comTexto, semTexto } = alvosDoJev(materiais());
    expect(new Set([...comTexto.map((m) => m.codigo), ...semTexto])).toEqual(new Set(naoResolvidos.map((d) => d.codigo)));
    expect(new Set(arquivo().sugestoes.keys())).toEqual(new Set(comTexto.map((m) => m.codigo)));
    expect(arquivo().semTexto).toEqual(semTexto);
  });

  it("entrega só o que o contrato FamiliaSugerida descreve", () => {
    const sugestao = familiaSugeridaDe(cod("10032"));
    expect(Object.keys(sugestao ?? {}).sort()).toEqual(["codigo", "confianca", "modelo", "probabilidade", "resposta"]);
  });
});

describe("o arquivo familias-jev.json", () => {
  it("guarda sugestões que a regra de hoje reproduz a partir da resposta crua do Jev", () => {
    const { sugestoes, regra } = arquivo();
    for (const s of sugestoes.values()) {
      const decisao = decidir({ ...s.jev, escolha: s.jev.escolha, confiancaDaEscolha: s.confianca, modelo: s.modelo }, regra);
      expect({ resposta: s.resposta, probabilidade: s.probabilidade }).toEqual({
        resposta: decisao.resposta,
        probabilidade: decisao.probabilidade,
      });
    }
  });

  it("só usa classes que existem na árvore pública do CATMAT, com o nome e o grupo dela", () => {
    const lidas = lerClassesDaArvore(readFileSync(new URL("../../dados/catmat/arvore.json", import.meta.url), "utf8"));
    if (!lidas.ok) throw new Error("árvore ilegível");
    for (const [codigo, { nome, grupo }] of arquivo().classes) {
      const daArvore = lidas.valor.find((c) => c.codigo === codigo);
      expect({ nome, grupo }).toEqual({ nome: daArvore?.nome, grupo: daArvore?.nomeGrupo });
    }
  });

  it("dá o nome da classe sugerida e nada para uma classe que ninguém usou", () => {
    const sugestao = familiaSugeridaDe(cod("10032"));
    if (sugestao?.resposta.tipo !== "classe") throw new Error("a correia devia ter classe");
    expect(nomeDaClasse(sugestao.resposta.classe)).toEqual({
      nome: "CORREAME, CORREIAS DE TRANSMISSÃO, CORREIAS DOS VENTILADORESE ACESSÓRIOS",
      grupo: "EQUIPAMENTOS DE TRANSMISSÃO DE FORÇA MECÂNICA",
    });
    expect(nomeDaClasse(classe("9999", "x").codigo)).toBeNull();
  });
});
