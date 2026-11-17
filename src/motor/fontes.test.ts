import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const RAIZ = new URL("./", import.meta.url);

function fontesDoMotor(pasta: URL): URL[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = new URL(entrada.name + (entrada.isDirectory() ? "/" : ""), pasta);
    if (entrada.isDirectory()) return fontesDoMotor(caminho);
    return /\.ts$/.test(entrada.name) && !/\.test\.ts$/.test(entrada.name) ? [caminho] : [];
  });
}

describe("o código do motor", () => {
  const fontes = fontesDoMotor(RAIZ);

  it("acha os arquivos do motor", () => {
    expect(fontes.length).toBeGreaterThan(8);
  });

  it("não usa nada que dependa de localidade, porque a chave tem de sair igual no Bun, no Safari e no Chrome", () => {
    const proibido = /localeCompare|Intl\b|toLocale/;
    const achados = fontes.filter((arquivo) => proibido.test(readFileSync(arquivo, "utf8"))).map((a) => a.pathname);
    expect(achados).toEqual([]);
  });
});
