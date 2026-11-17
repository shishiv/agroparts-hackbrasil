import { describe, expect, it } from "vitest";
import arquivoDaDemo from "../../dados/demo/familias-jev.json?raw";
import { lerArquivoDeFamilias } from "./arquivo";
import { familiaSugeridaDe, nomeDaClasse } from "./demo";

describe("a família sugerida num navegador de verdade", () => {
  it("roda num navegador, não no Bun", () => {
    expect(navigator.userAgent).toContain("Chrome");
    expect("Bun" in globalThis).toBe(false);
  });

  it("entrega, para cada código do arquivo, a sugestão que está nele, com o nome da classe", () => {
    const lido = lerArquivoDeFamilias(arquivoDaDemo);
    expect(lido.ok).toBe(true);
    if (!lido.ok) return;
    expect(lido.valor.sugestoes.size).toBeGreaterThan(20);
    for (const { jev: _jev, ...esperada } of lido.valor.sugestoes.values()) {
      const sugerida = familiaSugeridaDe(esperada.codigo);
      expect(sugerida).toEqual(esperada);
      if (sugerida?.resposta.tipo === "classe") expect(nomeDaClasse(sugerida.resposta.classe)).not.toBeNull();
    }
  });
});
