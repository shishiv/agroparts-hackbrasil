import { describe, expect, it } from "vitest";
import { escreverAmostra, hashDe, lerAmostra, lerItemDaApi, semRepeticao, sortearItens, type ItemPublico } from "./amostra";

function item(codigoItem: number, descricao: string, codigoClasse = "3030"): ItemPublico {
  return { codigoItem, codigoClasse, nomePdm: "CORREIA", descricao };
}

describe("hashDe", () => {
  it("dá os valores conhecidos do FNV-1a de 32 bits", () => {
    expect(hashDe("")).toBe(0x811c9dc5);
    expect(hashDe("a")).toBe(0xe40c292c);
    expect(hashDe("foobar")).toBe(0xbf9cf968);
  });
});

describe("lerItemDaApi", () => {
  const registro = { codigoItem: 150333, codigoClasse: 3030, nomePdm: "CORREIA  TRANSMISSÃO", descricaoItem: " CORREIA TRANSMISSÃO, NOME: X ", statusItem: true };

  it("lê o item, com a classe como texto e o nome do PDM sem espaço duplo", () => {
    expect(lerItemDaApi(registro)).toEqual({
      codigoItem: 150333,
      codigoClasse: "3030",
      nomePdm: "CORREIA TRANSMISSÃO",
      descricao: "CORREIA TRANSMISSÃO, NOME: X",
    });
  });

  it("ignora item inativo, sem descrição ou com campo de outro tipo", () => {
    expect(lerItemDaApi({ ...registro, statusItem: false })).toBeNull();
    expect(lerItemDaApi({ ...registro, descricaoItem: "  " })).toBeNull();
    expect(lerItemDaApi({ ...registro, codigoClasse: "3030" })).toBeNull();
    expect(lerItemDaApi("texto")).toBeNull();
  });
});

describe("sortearItens", () => {
  const candidatos = Array.from({ length: 40 }, (_, i) => item(1000 + i, `PARAFUSO ${i}`));

  it("pega a quantidade pedida, sem repetir descrição, na ordem do código", () => {
    const repetidos = [...candidatos, item(5, "parafuso 3"), item(6, "PARAFUSO   3")];
    const sorteados = sortearItens(repetidos, 10, "s");
    expect(sorteados).toHaveLength(10);
    expect(new Set(sorteados.map((i) => i.descricao.toUpperCase().replace(/\s+/g, " "))).size).toBe(10);
    expect(sorteados.map((i) => i.codigoItem)).toEqual([...sorteados.map((i) => i.codigoItem)].sort((a, b) => a - b));
  });

  it("dá o mesmo sorteio qualquer que seja a ordem da entrada e outro sorteio com outra semente", () => {
    const a = sortearItens(candidatos, 10, "semente-1").map((i) => i.codigoItem);
    const embaralhado = [...candidatos].reverse();
    expect(sortearItens(embaralhado, 10, "semente-1").map((i) => i.codigoItem)).toEqual(a);
    expect(sortearItens(candidatos, 10, "semente-2").map((i) => i.codigoItem)).not.toEqual(a);
  });

  it("devolve menos itens quando a classe tem menos candidatos", () => {
    expect(sortearItens([item(1, "A"), item(2, "B")], 10, "s")).toHaveLength(2);
  });
});

describe("semRepeticao", () => {
  it("fica com o item de menor código de cada texto, sem olhar maiúscula nem espaço", () => {
    expect(semRepeticao([item(9, "x  y"), item(3, "X Y"), item(4, "Z")]).map((i) => i.codigoItem)).toEqual([3, 4]);
  });
});

describe("lerAmostra", () => {
  const amostra = {
    fonte: "teste",
    consultadoEm: "2026-11-17",
    protocolo: "p",
    semente: "s",
    classes: [{ codigo: "3030", nome: "CORREIAS", grupo: "TRANSMISSÃO", dentro: true, candidatos: 3 }],
    itens: [item(1, "um")],
  };

  it("escreve e lê de volta a mesma amostra", () => {
    expect(lerAmostra(escreverAmostra(amostra))).toEqual({ ok: true, valor: amostra });
  });

  it("recusa item de uma classe que a amostra não lista, item repetido e texto que não é JSON", () => {
    const problemas = (texto: string) => {
      const lida = lerAmostra(texto);
      return lida.ok ? [] : lida.erros.map((e) => e.problema);
    };
    expect(problemas(JSON.stringify({ ...amostra, itens: [item(1, "um", "0000")] }))).toEqual(['classe 0000 não está em "classes"']);
    expect(problemas(JSON.stringify({ ...amostra, itens: [item(1, "um"), item(1, "dois")] }))).toEqual(["item repetido: 1"]);
    expect(problemas("{")).toEqual(["JSON inválido"]);
  });
});
