import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classesOferecidas, GRUPOS_OFERECIDOS, inverter, lerClassesDaArvore, marcarClasse, MAXIMO_DE_OPCOES } from "./classes";

const ARVORE = readFileSync(new URL("../../dados/catmat/arvore.json", import.meta.url), "utf8");

function classesDaArvore() {
  const lidas = lerClassesDaArvore(ARVORE);
  if (!lidas.ok) throw new Error(JSON.stringify(lidas.erros));
  return lidas.valor;
}

describe("lerClassesDaArvore", () => {
  it("lê o nome e o grupo de cada classe ativa, na ordem do código", () => {
    const lidas = lerClassesDaArvore(
      JSON.stringify({
        grupos: [
          {
            codigoGrupo: 53,
            nomeGrupo: "FERRAGENS  E ABRASIVOS",
            statusGrupo: true,
            classes: [
              { codigoClasse: 5330, nomeClasse: "GAXETAS E OUTROS  MATERIAIS", statusClasse: true },
              { codigoClasse: 5305, nomeClasse: "PARAFUSOS SEM PORCA", statusClasse: true },
              { codigoClasse: 5342, nomeClasse: "FERRAGENS DE SISTEMAS DE ARMAS", statusClasse: false },
            ],
          },
          { codigoGrupo: 64, nomeGrupo: "MEDICAMENTOS", statusGrupo: false, classes: [{ codigoClasse: 6405, nomeClasse: "X", statusClasse: true }] },
        ],
      }),
    );
    expect(lidas).toEqual({
      ok: true,
      valor: [
        { codigo: "5305", nome: "PARAFUSOS SEM PORCA", codigoGrupo: 53, nomeGrupo: "FERRAGENS E ABRASIVOS" },
        { codigo: "5330", nome: "GAXETAS E OUTROS MATERIAIS", codigoGrupo: 53, nomeGrupo: "FERRAGENS E ABRASIVOS" },
      ],
    });
  });

  it("recusa JSON quebrado, classe repetida e classe sem nome", () => {
    expect(lerClassesDaArvore("{")).toMatchObject({ ok: false });
    const repetida = {
      grupos: [
        {
          codigoGrupo: 53,
          nomeGrupo: "G",
          statusGrupo: true,
          classes: [
            { codigoClasse: 5330, nomeClasse: "A", statusClasse: true },
            { codigoClasse: 5330, nomeClasse: "B", statusClasse: true },
            { codigoClasse: 5331, statusClasse: true },
          ],
        },
      ],
    };
    const lidas = lerClassesDaArvore(JSON.stringify(repetida));
    expect(lidas.ok).toBe(false);
    if (!lidas.ok) expect(lidas.erros.map((e) => e.problema)).toEqual(["classe repetida: 5330", "esperava codigoClasse e nomeClasse"]);
  });

  it("lê a árvore pública baixada sem erro e sem classe inativa", () => {
    const classes = classesDaArvore();
    expect(classes.find((c) => c.codigo === "3110")).toEqual({
      codigo: "3110",
      nome: "ROLAMENTOS ANTIFRICÇÃO NÃO MONTADOS",
      codigoGrupo: 31,
      nomeGrupo: "ROLAMENTOS E MANCAIS",
    });
    expect(classes.some((c) => c.codigo === "1295")).toBe(false);
  });
});

describe("classesOferecidas", () => {
  it("oferece as classes dos grupos de manutenção e cabe numa pergunta Choice com a opção nenhuma", () => {
    const oferecidas = classesOferecidas(classesDaArvore());
    const codigos = oferecidas.map((c) => c.codigo as string);
    expect(oferecidas.length + 1).toBeLessThanOrEqual(MAXIMO_DE_OPCOES);
    expect(oferecidas.every((c) => GRUPOS_OFERECIDOS.includes(c.codigoGrupo))).toBe(true);
    expect(codigos).toContain("3110");
    expect(codigos).toContain("5330");
    expect(codigos).not.toContain("7510");
    expect(codigos).toEqual([...codigos].sort());
  });

  it("recusa um conjunto que não cabe na pergunta", () => {
    const muitas = Array.from({ length: MAXIMO_DE_OPCOES }, (_, i) => ({
      codigo: marcarClasseOuFalha(String(2800 + i)),
      nome: `CLASSE ${i}`,
      codigoGrupo: 28,
      nomeGrupo: "MOTORES",
    }));
    expect(() => classesOferecidas(muitas)).toThrow(/passam de 255 opções/);
  });
});

function marcarClasseOuFalha(texto: string) {
  const classe = marcarClasse(texto);
  if (!classe.ok) throw new Error(classe.problema);
  return classe.valor;
}

describe("marcarClasse", () => {
  it("aceita quatro dígitos e recusa o resto", () => {
    expect(marcarClasse("3110")).toEqual({ ok: true, valor: "3110" });
    expect(marcarClasse("311")).toMatchObject({ ok: false });
    expect(marcarClasse("31x0")).toMatchObject({ ok: false });
    expect(marcarClasse("nenhuma")).toMatchObject({ ok: false });
  });
});

describe("inverter", () => {
  it("devolve as mesmas classes na ordem contrária", () => {
    const [a, b, c] = ["3020", "3030", "3040"].map((codigo) => ({
      codigo: marcarClasseOuFalha(codigo),
      nome: codigo,
      codigoGrupo: 30,
      nomeGrupo: "G",
    }));
    if (!a || !b || !c) throw new Error("fixture");
    expect(inverter([a, b, c]).map((x) => x.codigo)).toEqual(["3040", "3030", "3020"]);
  });
});
