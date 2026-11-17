import type { ExportacaoDaUsina, Unificacao } from "../../src/contrato";
import { lerExportacao } from "../../src/exportacao";
import { CAMINHO_DO_INDICE, caminhoDoEquipamento, indiceDeGrupos, paginaDoEquipamento } from "../../src/historico";
import { unificar } from "../../src/motor";
import consumo from "../../dados/demo/consumo.csv?raw";
import equipamentos from "../../dados/demo/equipamentos.csv?raw";
import estoque from "../../dados/demo/estoque.csv?raw";
import materiais from "../../dados/demo/materiais.csv?raw";
import type { Buscar } from "./carregar";

const lido = lerExportacao({ equipamentos, materiais, consumo, estoque });
if (!lido.ok) throw new Error("demo ilegível");

export const exportacaoDaDemo: ExportacaoDaUsina = lido.valor;
export const unificacaoDaDemo: Unificacao = unificar(exportacaoDaDemo.materiais);

export interface ServidorDeTeste {
  buscar: Buscar;
  /** Os endereços pedidos, na ordem. */
  pedidos: string[];
}

const resposta = (status: number, corpo = ""): Awaited<ReturnType<Buscar>> => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => corpo,
});

/**
 * Serve os mesmos JSON que o build grava, calculados na hora, e registra cada pedido.
 * `falhar` lista os endereços que respondem 500 enquanto o teste não os tira da lista.
 */
export function servidorDaDemo(falhar: Set<string> = new Set()): ServidorDeTeste {
  const pedidos: string[] = [];
  const buscar: Buscar = async (endereco) => {
    pedidos.push(endereco);
    if (falhar.has(endereco)) return resposta(500);
    if (endereco === CAMINHO_DO_INDICE) {
      return resposta(200, JSON.stringify(indiceDeGrupos(exportacaoDaDemo, unificacaoDaDemo)));
    }
    const equipamento = exportacaoDaDemo.equipamentos.find((e) => caminhoDoEquipamento(e.patrimonio) === endereco);
    if (!equipamento) return resposta(404);
    return resposta(200, JSON.stringify(paginaDoEquipamento(exportacaoDaDemo, unificacaoDaDemo, equipamento.patrimonio)));
  };
  return { buscar, pedidos };
}
