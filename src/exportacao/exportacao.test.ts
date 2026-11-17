import { describe, expect, it } from "vitest";
import { agrupar } from "../unificacao/agrupar";
import {
  lerConsumo,
  lerEquipamentos,
  lerEstoque,
  lerExportacao,
  lerLeiturasDeExemplo,
  lerMateriais,
  lerParticaoEsperada,
} from "./index";

const EQUIPAMENTOS = "patrimonio;tag;nome;area\n004512;B-104;Bomba de caldo;Caldo\n004520;E-201;Exaustor;Caldeira\n";
const MATERIAIS =
  "codigo;descricao;unidade;sku\n10001;ROLAMENTO 6312 ZZ C3;UN;ROL-6312\n10002;ROL 6312 2Z C3 SKF;UN;ROL-6312\n10003;;UN;\n";
const CONSUMO =
  "ordem;data;patrimonio;tipo_ordem;descricao_ordem;codigo_material;descricao_material;quantidade;unidade;posicao\n" +
  "100;05/03/2025;004512;Preventiva;Troca de rolamentos;10001;ROLAMENTO 6312 ZZ C3;2;UN;mancal lado acoplamento\n" +
  "101;29/02/2028;004520;corretiva;Ruído;10002;ROL 6312 2Z C3 SKF;1,5;UN;\n";
const ESTOQUE = "codigo;quantidade;unidade;endereco\n10002;4;UN;A-03-2\n10001;0;UN;\n";

describe("lerEquipamentos", () => {
  it("lê patrimônio com zeros à esquerda e deixa a tag como texto", () => {
    expect(lerEquipamentos(EQUIPAMENTOS)).toEqual({
      ok: true,
      valor: [
        { patrimonio: "004512", tag: "B-104", nome: "Bomba de caldo", area: "Caldo" },
        { patrimonio: "004520", tag: "E-201", nome: "Exaustor", area: "Caldeira" },
      ],
    });
  });

  it("aceita colunas em outra ordem e colunas a mais", () => {
    const lido = lerEquipamentos("area;extra;nome;patrimonio;tag\nCaldo;x;Bomba;004512;B-104\n");
    expect(lido).toEqual({
      ok: true,
      valor: [{ patrimonio: "004512", tag: "B-104", nome: "Bomba", area: "Caldo" }],
    });
  });

  it("aponta a coluna que falta no cabeçalho", () => {
    const lido = lerEquipamentos("patrimonio;nome;area\n004512;Bomba;Caldo\n");
    expect(lido).toEqual({
      ok: false,
      erros: [{ arquivo: "equipamentos.csv", linha: 1, coluna: "tag", problema: "coluna ausente no cabeçalho" }],
    });
  });

  it("recusa patrimônio repetido na linha da repetição", () => {
    const lido = lerEquipamentos("patrimonio;tag;nome;area\n1;a;A;x\n2;b;B;x\n1;c;C;x\n");
    expect(lido.ok).toBe(false);
    if (!lido.ok) {
      expect(lido.erros).toEqual([
        { arquivo: "equipamentos.csv", linha: 4, coluna: "patrimonio", problema: "patrimônio repetido: 1" },
      ]);
    }
  });
});

describe("lerMateriais", () => {
  it("lê SKU vazio como null e descrição vazia como texto vazio", () => {
    const lido = lerMateriais(MATERIAIS);
    expect(lido).toEqual({
      ok: true,
      valor: [
        { codigo: "10001", descricao: "ROLAMENTO 6312 ZZ C3", unidade: "UN", sku: "ROL-6312" },
        { codigo: "10002", descricao: "ROL 6312 2Z C3 SKF", unidade: "UN", sku: "ROL-6312" },
        { codigo: "10003", descricao: "", unidade: "UN", sku: null },
      ],
    });
  });

  it("recusa código repetido e código com espaço", () => {
    const lido = lerMateriais("codigo;descricao;unidade;sku\n1;a;UN;\n1;b;UN;\n2 3;c;UN;\n");
    expect(lido.ok).toBe(false);
    if (!lido.ok) expect(lido.erros.map((e) => [e.linha, e.coluna])).toEqual([[3, "codigo"], [4, "codigo"]]);
  });
});

describe("lerConsumo", () => {
  it("converte data dd/mm/aaaa, vírgula decimal, tipo e posição vazia", () => {
    const lido = lerConsumo(CONSUMO);
    expect(lido).toEqual({
      ok: true,
      valor: [
        {
          ordem: "100",
          data: "2025-03-05",
          patrimonio: "004512",
          tipo: "preventiva",
          descricaoOrdem: "Troca de rolamentos",
          codigo: "10001",
          descricaoMaterial: "ROLAMENTO 6312 ZZ C3",
          quantidade: 2,
          unidade: "UN",
          posicao: "mancal lado acoplamento",
        },
        {
          ordem: "101",
          data: "2028-02-29",
          patrimonio: "004520",
          tipo: "corretiva",
          descricaoOrdem: "Ruído",
          codigo: "10002",
          descricaoMaterial: "ROL 6312 2Z C3 SKF",
          quantidade: 1.5,
          unidade: "UN",
          posicao: null,
        },
      ],
    });
  });

  it("junta os erros de todas as linhas, cada um com arquivo, linha e coluna", () => {
    const cabecalho = CONSUMO.split("\n")[0];
    const texto =
      `${cabecalho}\n` +
      "1;31/02/2026;1;preventiva;x;10001;y;1;UN;\n" +
      "2;01/03/2026;1;urgente;x;10001;y;1;UN;\n" +
      "3;01/03/2026;1;corretiva;x;10001;y;1.5;UN;\n" +
      "4;01/03/2026;1;corretiva;x;10001;y;0;UN;\n" +
      "5;01/03/2026;1;corretiva;x;10001;y;1;UN\n" +
      "6;01/03/2026;1;corretiva;x;10001;y;1;UN;\n";
    const lido = lerConsumo(texto);
    expect(lido.ok).toBe(false);
    if (!lido.ok) {
      expect(lido.erros.map((e) => [e.arquivo, e.linha, e.coluna])).toEqual([
        ["consumo.csv", 2, "data"],
        ["consumo.csv", 3, "tipo_ordem"],
        ["consumo.csv", 4, "quantidade"],
        ["consumo.csv", 5, "quantidade"],
        ["consumo.csv", 6, ""],
      ]);
      expect(lido.erros[0]?.problema).toBe('data que não existe: "31/02/2026"');
    }
  });

  it("aceita milhar com ponto", () => {
    const cabecalho = CONSUMO.split("\n")[0];
    const lido = lerConsumo(`${cabecalho}\n1;01/03/2026;1;outra;x;10001;y;1.250,5;KG;\n`);
    expect(lido.ok && lido.valor[0]?.quantidade).toBe(1250.5);
  });
});

describe("lerEstoque", () => {
  it("lê saldo zero e endereço vazio como null", () => {
    expect(lerEstoque(ESTOQUE)).toEqual({
      ok: true,
      valor: [
        { codigo: "10002", quantidade: 4, unidade: "UN", endereco: "A-03-2" },
        { codigo: "10001", quantidade: 0, unidade: "UN", endereco: null },
      ],
    });
  });
});

describe("lerExportacao", () => {
  const textos = { equipamentos: EQUIPAMENTOS, materiais: MATERIAIS, consumo: CONSUMO, estoque: ESTOQUE };

  it("devolve os quatro cadastros tipados", () => {
    const lido = lerExportacao(textos);
    expect(lido.ok).toBe(true);
    if (lido.ok) {
      expect(lido.valor.equipamentos).toHaveLength(2);
      expect(lido.valor.materiais).toHaveLength(3);
      expect(lido.valor.trocas.map((t) => t.codigo)).toEqual(["10001", "10002"]);
      expect(lido.valor.estoque).toHaveLength(2);
    }
  });

  it("recusa consumo e estoque que citam patrimônio ou código fora dos cadastros", () => {
    const lido = lerExportacao({
      ...textos,
      consumo: CONSUMO.replace("004520", "009999"),
      estoque: ESTOQUE.replace("10002", "77777"),
    });
    expect(lido.ok).toBe(false);
    if (!lido.ok) {
      expect(lido.erros.map((e) => [e.arquivo, e.linha, e.coluna])).toEqual([
        ["consumo.csv", 3, "patrimonio"],
        ["estoque.csv", 2, "codigo"],
      ]);
    }
  });

  it("junta erros de arquivos diferentes", () => {
    const lido = lerExportacao({
      ...textos,
      equipamentos: "patrimonio;nome;area\n1;a;b\n",
      materiais: "codigo;descricao;unidade;sku\nx y;a;UN;\n",
    });
    expect(lido.ok).toBe(false);
    if (!lido.ok) expect(lido.erros.map((e) => e.arquivo)).toEqual(["equipamentos.csv", "materiais.csv"]);
  });
});

describe("lerParticaoEsperada", () => {
  const valida = JSON.stringify({
    decisoes: [
      { codigo: "1", decisao: "resolve" },
      { codigo: "2", decisao: "resolve" },
      { codigo: "3", decisao: "revisa" },
      { codigo: "4", decisao: "recusa" },
    ],
    grupos: [["1", "2"]],
  });

  it("lê decisões e grupos", () => {
    const lido = lerParticaoEsperada(valida);
    expect(lido).toEqual({
      ok: true,
      valor: {
        decisoes: [
          { codigo: "1", decisao: "resolve" },
          { codigo: "2", decisao: "resolve" },
          { codigo: "3", decisao: "revisa" },
          { codigo: "4", decisao: "recusa" },
        ],
        grupos: [["1", "2"]],
      },
    });
  });

  it("recusa código revisa dentro de grupo, código resolve fora de grupo e código em dois grupos", () => {
    const estragada = JSON.stringify({
      decisoes: [
        { codigo: "1", decisao: "resolve" },
        { codigo: "2", decisao: "resolve" },
        { codigo: "3", decisao: "revisa" },
      ],
      grupos: [["1", "3"], ["1"]],
    });
    const lido = lerParticaoEsperada(estragada);
    expect(lido.ok).toBe(false);
    if (!lido.ok) {
      expect(lido.erros.map((e) => e.problema)).toEqual([
        "código 3 está num grupo sem decisão resolve",
        "código 1 em dois grupos",
        "código 2 resolve e não está em nenhum grupo",
      ]);
    }
  });

  it("recusa texto que não é JSON", () => {
    expect(lerParticaoEsperada("{")).toEqual({
      ok: false,
      erros: [{ arquivo: "esperado-particao.json", linha: 0, coluna: "", problema: "JSON inválido" }],
    });
  });
});

describe("lerLeiturasDeExemplo", () => {
  const exemplo = JSON.stringify({
    versaoRegras: "exemplo-1",
    leituras: [
      {
        codigo: "10001",
        leitura: {
          decisao: "resolve",
          familia: "rolamento",
          chave: "6312|zz|c3",
          rotulo: "6312 ZZ C3",
          atributos: [{ nome: "serie", valor: "6312", trecho: { inicio: 12, fim: 16 } }],
        },
      },
      {
        codigo: "10002",
        leitura: {
          decisao: "resolve",
          familia: "rolamento",
          chave: "6312|zz|c3",
          rotulo: "6312 ZZ C3",
          atributos: [],
        },
      },
      {
        codigo: "10003",
        leitura: { decisao: "revisa", familia: "rolamento", pendencias: ["sufixo-desconhecido"], atributos: [] },
      },
      {
        codigo: "10004",
        leitura: { decisao: "recusa", motivo: "sem-texto", detalhe: "descrição vazia", atributos: [] },
      },
    ],
  });

  it("devolve leituras que o agrupar transforma em grupos", () => {
    const lido = lerLeiturasDeExemplo(exemplo);
    expect(lido.ok).toBe(true);
    if (lido.ok) {
      const unificacao = agrupar(lido.valor.versaoRegras, lido.valor.leituras);
      expect([...unificacao.grupos.values()].map((g) => g.codigos)).toEqual([["10001", "10002"]]);
      expect(unificacao.leituras.size).toBe(4);
      expect(unificacao.versaoRegras).toBe("exemplo-1");
    }
  });

  it("recusa trecho invertido e decisão desconhecida, com o caminho do campo", () => {
    const estragado = JSON.stringify({
      versaoRegras: "x",
      leituras: [
        {
          codigo: "1",
          leitura: {
            decisao: "resolve",
            familia: "f",
            chave: "c",
            rotulo: "r",
            atributos: [{ nome: "n", valor: "v", trecho: { inicio: 5, fim: 2 } }],
          },
        },
        { codigo: "2", leitura: { decisao: "talvez", atributos: [] } },
      ],
    });
    const lido = lerLeiturasDeExemplo(estragado);
    expect(lido.ok).toBe(false);
    if (!lido.ok) {
      expect(lido.erros.map((e) => e.coluna)).toEqual([
        "leituras[0].leitura.atributos[0].trecho",
        "leituras[1].leitura.decisao",
      ]);
    }
  });

  it("recusa a mesma chave em duas famílias antes de chegar ao agrupar", () => {
    const duasFamilias = JSON.stringify({
      versaoRegras: "x",
      leituras: ["1", "2"].map((codigo, i) => ({
        codigo,
        leitura: { decisao: "resolve", familia: `f${i}`, chave: "mesma", rotulo: "r", atributos: [] },
      })),
    });
    const lido = lerLeiturasDeExemplo(duasFamilias);
    expect(lido.ok).toBe(false);
    if (!lido.ok) expect(lido.erros[0]?.problema).toBe("a chave mesma está em duas famílias");
  });
});
