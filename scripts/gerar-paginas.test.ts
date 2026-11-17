import { describe, expect, it } from "vitest";
import type { ItemDoHistorico } from "../src/contrato";
import { CAMINHO_DO_INDICE, lerIndiceDeGrupos, lerPaginaDoEquipamento } from "../src/historico";
import { VERSAO_REGRAS } from "../src/motor";
import { gerarPaginas } from "./gerar-paginas";

type Peca = Extract<ItemDoHistorico, { tipo: "peca" }>;

interface PecaContada {
  /** Todos os códigos do grupo, mesmo os que esta máquina nunca usou. */
  grupo: string[];
  usadosAqui: string[];
  trocas: number;
  /** `null` quando as unidades das trocas não batem. */
  total: number | null;
  ultima: string;
}

/**
 * Contado à mão em `dados/demo/consumo.csv`: as linhas do patrimônio, somadas por grupo de
 * `dados/demo/esperado-particao.json`. Nenhum número saiu do motor nem da página.
 */
const CONTA_A_MAO: Readonly<Record<string, { pecas: PecaContada[]; semChave: [codigo: string, trocas: number][] }>> = {
  "004512": {
    pecas: [
      { grupo: ["10059", "10066", "10165"], usadosAqui: ["10066", "10165"], trocas: 12, total: 22, ultima: "2026-07-23" },
      { grupo: ["10071", "10091", "10158", "10261"], usadosAqui: ["10071", "10091", "10261"], trocas: 11, total: 22, ultima: "2026-06-17" },
    ],
    semChave: [["10012", 2], ["10041", 2], ["10203", 1], ["10241", 15]],
  },
  "004504": {
    pecas: [
      { grupo: ["10034", "10186", "10198"], usadosAqui: ["10034", "10186"], trocas: 15, total: null, ultima: "2026-09-06" },
      { grupo: ["10059", "10066", "10165"], usadosAqui: ["10066", "10165"], trocas: 14, total: 26, ultima: "2026-09-06" },
    ],
    semChave: [["10272", 13]],
  },
  "004540": {
    pecas: [
      { grupo: ["10076", "10251"], usadosAqui: ["10076", "10251"], trocas: 18, total: 34, ultima: "2026-10-04" },
      { grupo: ["10131", "10176"], usadosAqui: ["10131", "10176"], trocas: 13, total: 25, ultima: "2026-10-04" },
    ],
    semChave: [["10241", 15], ["10282", 1]],
  },
};

const arquivos = await gerarPaginas();

function paginaDe(patrimonio: string) {
  const arquivo = arquivos.find((a) => a.caminho === `/maquinas/${patrimonio}.json`);
  if (!arquivo) throw new Error(`gerarPaginas não gerou a máquina ${patrimonio}`);
  const lida = lerPaginaDoEquipamento(arquivo.conteudo);
  if (!lida.ok) throw new Error(`a página não lê o JSON de ${patrimonio}: ${JSON.stringify(lida.erros)}`);
  return lida.valor;
}

const porPrimeiroCodigo = (a: { grupo: readonly string[] }, b: { grupo: readonly string[] }) =>
  (a.grupo[0] ?? "") < (b.grupo[0] ?? "") ? -1 : 1;

describe("gerarPaginas com o motor real", () => {
  it("gera um JSON por equipamento da demo e o índice de grupos, e a página lê todos", () => {
    const caminhos = arquivos.map((a) => a.caminho);
    expect(caminhos).toHaveLength(13);
    expect(caminhos).toContain(CAMINHO_DO_INDICE);
    for (const arquivo of arquivos) {
      const lido =
        arquivo.caminho === CAMINHO_DO_INDICE
          ? lerIndiceDeGrupos(arquivo.conteudo)
          : lerPaginaDoEquipamento(arquivo.conteudo);
      expect(lido.ok, arquivo.caminho).toBe(true);
    }
  });

  it("usa as regras do motor, e não as leituras de exemplo do gerador da demo", () => {
    const { historico } = paginaDe("004512");
    expect(historico.versaoRegras).toBe(VERSAO_REGRAS);
    const indice = arquivos.find((a) => a.caminho === CAMINHO_DO_INDICE);
    const lido = indice && lerIndiceDeGrupos(indice.conteudo);
    expect(lido?.ok && lido.valor.versaoRegras).toBe(VERSAO_REGRAS);
  });

  describe.each(Object.entries(CONTA_A_MAO))("equipamento %s", (patrimonio, esperado) => {
    it("soma por grupo o que a conta à mão soma", () => {
      const { itens } = paginaDe(patrimonio).historico;
      const pecas = itens.filter((i): i is Peca => i.tipo === "peca");
      const somado: PecaContada[] = pecas.map((p) => ({
        grupo: [...p.grupo.codigos],
        usadosAqui: [...p.codigosUsadosAqui],
        trocas: p.trocas.length,
        total: p.quantidadeTotal,
        ultima: p.ultimaTroca,
      }));
      expect(somado.toSorted(porPrimeiroCodigo)).toEqual(esperado.pecas.toSorted(porPrimeiroCodigo));
    });

    it("deixa cada código sem chave à parte, sem soma", () => {
      const { itens } = paginaDe(patrimonio).historico;
      const semChave = itens.flatMap((i) => (i.tipo === "codigo-sem-chave" ? [[i.codigo, i.trocas.length] as const] : []));
      expect(semChave.toSorted()).toEqual(esperado.semChave.toSorted());
    });

    it("não perde nem repete nenhuma troca do equipamento", () => {
      const { itens } = paginaDe(patrimonio).historico;
      const nasPecas = esperado.pecas.reduce((n, p) => n + p.trocas, 0);
      const semChave = esperado.semChave.reduce((n, [, trocas]) => n + trocas, 0);
      expect(itens.reduce((n, i) => n + i.trocas.length, 0)).toBe(nasPecas + semChave);
    });
  });

  it("a ordem dos arquivos e o conteúdo são os mesmos em duas execuções", async () => {
    expect(await gerarPaginas()).toEqual(arquivos);
  });
});
