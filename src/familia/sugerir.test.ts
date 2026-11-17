import { describe, expect, it } from "vitest";
import { sugerirFamilia, sugerirVarias, emParalelo, type Jev } from "./sugerir";
import { classesDaGravacao, cod, lerGravacao } from "./teste-de-apoio";

const GRAVADOS = ["10032", "10002", "10241"] as const;

/** Responde com a gravação da mesma descrição e recusa qualquer outra: nada vai à rede. */
function jevGravado(): Jev {
  const gravacoes = new Map(GRAVADOS.map((codigo) => [lerGravacao(codigo).descricao, lerGravacao(codigo).resposta]));
  return async (pedido) => {
    const resposta = gravacoes.get(pedido.state.descricao);
    if (!resposta) throw new Error(`sem gravação para "${pedido.state.descricao}"`);
    return resposta;
  };
}

describe("sugerirFamilia", () => {
  const classes = classesDaGravacao();

  it("sugere a classe da correia, com a probabilidade do Jev", async () => {
    const sugestao = await sugerirFamilia(jevGravado(), classes, { codigo: cod("10032"), descricao: lerGravacao("10032").descricao });
    expect(sugestao).toEqual({
      codigo: "10032",
      resposta: { tipo: "classe", classe: "3030" },
      probabilidade: 0.96,
      confianca: 0.96,
      modelo: "jev-1.14.0",
      jev: { escolha: "3030", probabilidadeDaEscolha: 0.96, noul: 0.98 },
    });
  });

  it("não sugere classe quando o Choice escolhe uma com menos de metade da probabilidade", async () => {
    const sugestao = await sugerirFamilia(jevGravado(), classes, { codigo: cod("10002"), descricao: lerGravacao("10002").descricao });
    expect(sugestao.resposta).toEqual({ tipo: "nenhuma" });
    expect(sugestao.jev).toEqual({ escolha: "5330", probabilidadeDaEscolha: 0.4, noul: 0.95 });
  });

  it("não sugere classe quando o Noul fica abaixo de 0,7", async () => {
    const sugestao = await sugerirFamilia(jevGravado(), classes, { codigo: cod("10241"), descricao: lerGravacao("10241").descricao });
    expect(sugestao.resposta).toEqual({ tipo: "nenhuma" });
    expect(sugestao.jev.noul).toBe(0.69);
  });

  it("não vai à rede para uma descrição sem gravação", async () => {
    await expect(sugerirFamilia(jevGravado(), classes, { codigo: cod("1"), descricao: "ROLAMENTO" })).rejects.toThrow(/sem gravação/);
  });
});

describe("sugerirVarias", () => {
  it("devolve na ordem dos materiais e nunca passa de `simultaneas` chamadas ao mesmo tempo", async () => {
    const classes = classesDaGravacao();
    const gravado = jevGravado();
    let emAndamento = 0;
    let maximo = 0;
    const devagar: Jev = async (pedido) => {
      emAndamento++;
      maximo = Math.max(maximo, emAndamento);
      await new Promise((r) => setTimeout(r, 5));
      emAndamento--;
      return gravado(pedido);
    };
    const materiais = GRAVADOS.flatMap((codigo) => [0, 1].map((i) => ({ codigo: cod(`${codigo}${i}`), descricao: lerGravacao(codigo).descricao })));
    const sugestoes = await sugerirVarias(devagar, classes, materiais, 2);
    expect(sugestoes.map((s) => s.codigo)).toEqual(["100320", "100321", "100020", "100021", "102410", "102411"]);
    expect(maximo).toBe(2);
  });
});

describe("emParalelo", () => {
  it("não faz nada com uma lista vazia", async () => {
    expect(await emParalelo([], 4, async (n: number) => n)).toEqual([]);
  });
});
