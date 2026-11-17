import { describe, expect, it } from "vitest";
import { lerCsv } from "./csv";

describe("lerCsv", () => {
  it("separa por ponto e vírgula e numera as linhas a partir do cabeçalho", () => {
    expect(lerCsv("a;b;c\n1;2;3\n4;5;6\n")).toEqual({
      ok: true,
      registros: [
        { numero: 1, campos: ["a", "b", "c"] },
        { numero: 2, campos: ["1", "2", "3"] },
        { numero: 3, campos: ["4", "5", "6"] },
      ],
    });
  });

  it("aceita BOM, CRLF, última linha sem quebra e ignora linhas em branco", () => {
    const lido = lerCsv("\uFEFFa;b\r\n1;2\r\n\r\n3;4");
    expect(lido).toEqual({
      ok: true,
      registros: [
        { numero: 1, campos: ["a", "b"] },
        { numero: 2, campos: ["1", "2"] },
        { numero: 4, campos: ["3", "4"] },
      ],
    });
  });

  it("lê campo entre aspas com ponto e vírgula, aspas duplas e quebra de linha", () => {
    const lido = lerCsv('a;b\n"x;y";"ele disse ""oi""\nlinha 2"\nz;w\n');
    expect(lido).toEqual({
      ok: true,
      registros: [
        { numero: 1, campos: ["a", "b"] },
        { numero: 2, campos: ["x;y", 'ele disse "oi"\nlinha 2'] },
        { numero: 4, campos: ["z", "w"] },
      ],
    });
  });

  it("apara espaços de campo sem aspas e guarda os de campo entre aspas", () => {
    const lido = lerCsv('a;b\n  x  ;" y "\n');
    expect(lido).toEqual({
      ok: true,
      registros: [
        { numero: 1, campos: ["a", "b"] },
        { numero: 2, campos: ["x", " y "] },
      ],
    });
  });

  it("mantém campos vazios", () => {
    expect(lerCsv("a;b;c\n;;\n")).toEqual({
      ok: true,
      registros: [
        { numero: 1, campos: ["a", "b", "c"] },
        { numero: 2, campos: ["", "", ""] },
      ],
    });
  });

  it("recusa aspas abertas e nunca fechadas, dizendo onde o registro começou", () => {
    expect(lerCsv('a;b\n1;"sem fim\n2;3\n')).toEqual({
      ok: false,
      linha: 2,
      problema: "aspas abertas e nunca fechadas",
    });
  });

  it("recusa texto colado depois das aspas que fecham", () => {
    const lido = lerCsv('a;b\n"x"y;2\n');
    expect(lido.ok).toBe(false);
  });
});
