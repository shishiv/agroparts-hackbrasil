import { describe, expect, it } from "vitest";
import { indiceDeGrupos, paginaDoEquipamento } from "../../src/historico";
import { usinaDeTeste } from "../../src/historico/usina-de-teste";
import { lerPatrimonio } from "../../src/exportacao/valores";
import { carregarIndice, carregarPagina, patrimonioDoCaminho, type Buscar } from "./carregar";

const { exportacao, unificacao } = usinaDeTeste({
  equipamentos: ["000001;T-1;Bomba;Caldo"],
  materiais: ["A1;rolamento a1;UN", "A2;rolamento a2;UN"],
  trocas: [{ ordem: "1", data: "10/01/2026", patrimonio: "000001", codigo: "A1", quantidade: "2" }],
  estoque: ["A2;4;UN;P-01"],
  resolve: { A1: "rol", A2: "rol" },
});

function servidor(respostas: Record<string, { status: number; corpo: string }>) {
  const pedidos: string[] = [];
  const buscar: Buscar = async (endereco) => {
    pedidos.push(endereco);
    const { status, corpo } = respostas[endereco] ?? { status: 404, corpo: "" };
    return { ok: status >= 200 && status < 300, status, text: async () => corpo };
  };
  return { buscar, pedidos };
}

const patrimonio = (texto: string) => {
  const lido = lerPatrimonio(texto);
  if (!lido.ok) throw new Error(lido.problema);
  return lido.valor;
};

const jsonDaMaquina = () => JSON.stringify(paginaDoEquipamento(exportacao, unificacao, patrimonio("000001")));

describe("patrimonioDoCaminho", () => {
  it("lê o número de /e/<patrimônio>, com ou sem barra no fim", () => {
    expect(patrimonioDoCaminho("/e/004512")).toBe("004512");
    expect(patrimonioDoCaminho("/e/004512/")).toBe("004512");
  });

  it("desfaz o que o campo da página inicial codificou", () => {
    expect(patrimonioDoCaminho("/e/B-77")).toBe("B-77");
    expect(patrimonioDoCaminho("/e/a%20b")).toBe("a b");
  });

  it("devolve vazio para um caminho que não é de uma máquina", () => {
    expect(patrimonioDoCaminho("/equipamento/")).toBe("");
    expect(patrimonioDoCaminho("/e/")).toBe("");
    expect(patrimonioDoCaminho("/e/1/2")).toBe("");
  });

  it("não quebra com uma codificação inválida", () => {
    expect(patrimonioDoCaminho("/e/%E0%A4%A")).toBe("%E0%A4%A");
  });
});

describe("carregarPagina", () => {
  it("baixa o JSON da máquina e devolve o histórico com os textos", async () => {
    const { buscar, pedidos } = servidor({ "/maquinas/000001.json": { status: 200, corpo: jsonDaMaquina() } });
    const pagina = await carregarPagina("000001", buscar);
    expect(pagina.tipo).toBe("achado");
    if (pagina.tipo !== "achado") return;
    expect(pagina.historico.equipamento.tag).toBe("T-1");
    expect(pagina.textos.map((t) => t.codigo)).toEqual(["A1", "A2"]);
    expect(pedidos).toEqual(["/maquinas/000001.json"]);
  });

  it("um número que o servidor não tem é patrimônio desconhecido", async () => {
    const { buscar } = servidor({});
    expect(await carregarPagina("999999", buscar)).toEqual({ tipo: "patrimonio-desconhecido", digitado: "999999" });
  });

  it("um texto que não pode ser patrimônio é desconhecido sem pedir nada", async () => {
    const { buscar, pedidos } = servidor({});
    for (const digitado of ["", "a/b", "../x", "004512?x=1", "um dois"]) {
      expect(await carregarPagina(digitado, buscar)).toEqual({ tipo: "patrimonio-desconhecido", digitado });
    }
    expect(pedidos).toEqual([]);
  });

  it("falha do servidor não vira patrimônio desconhecido", async () => {
    const { buscar } = servidor({ "/maquinas/000001.json": { status: 503, corpo: "" } });
    await expect(carregarPagina("000001", buscar)).rejects.toThrow(/503/);
  });

  it("uma página HTML no lugar do JSON não vira histórico", async () => {
    const { buscar } = servidor({ "/maquinas/000001.json": { status: 200, corpo: "<!doctype html><title>x</title>" } });
    await expect(carregarPagina("000001", buscar)).rejects.toThrow(/JSON/);
  });
});

describe("carregarIndice", () => {
  it("baixa e lê o índice de grupos", async () => {
    const indice = indiceDeGrupos(exportacao, unificacao);
    const { buscar } = servidor({ "/grupos.json": { status: 200, corpo: JSON.stringify(indice) } });
    expect(await carregarIndice(buscar)).toEqual(indice);
  });

  it("falha quando o servidor falha", async () => {
    const { buscar } = servidor({ "/grupos.json": { status: 500, corpo: "" } });
    await expect(carregarIndice(buscar)).rejects.toThrow(/500/);
  });
});
