import { describe, expect, it } from "vitest";
import { normalizar } from "./normalizar";

describe("normalizar", () => {
  it("põe em maiúsculas e tira o acento", () => {
    expect(normalizar("Rolamento rígido de esferas, vedação NBR")).toBe("ROLAMENTO RIGIDO DE ESFERAS, VEDACAO NBR");
  });

  it("troca travessão, espaço duro e sinal de vezes pelos caracteres simples", () => {
    expect(normalizar("2RS1 \u2013 SKF\u00a060\u00d7130")).toBe("2RS1 - SKF 60X130");
  });

  it("mantém uma unidade para cada unidade do original, para os trechos valerem nos dois textos", () => {
    const original = "ROL. rígido ÀÉÎÕÜ ç ñ ß 6205-2RS1 \ud83d\ude00";
    expect(normalizar(original)).toHaveLength(original.length);
  });

  it("não depende de localidade: o i sem ponto fica como está", () => {
    expect(normalizar("rolamento ı")).toBe("ROLAMENTO I");
  });

  it("não depende de localidade: o i minúsculo vira I, e o İ e o ß ficam como estão", () => {
    expect(normalizar("inox İ ß")).toBe("INOX İ ß");
  });
});
