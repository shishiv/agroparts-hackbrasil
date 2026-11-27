import consumo from "../../dados/demo/consumo.csv?raw";
import equipamentos from "../../dados/demo/equipamentos.csv?raw";
import estoque from "../../dados/demo/estoque.csv?raw";
import materiais from "../../dados/demo/materiais.csv?raw";
import { diagnosticar, resumir, type Resumo } from "../../src/agrupamento";
import type { Equipamento, ExportacaoDaUsina, ItemDoHistorico, Saldo, Unificacao } from "../../src/contrato";
import { lerExportacao } from "../../src/exportacao";
import { historicoDoEquipamento } from "../../src/historico";
import { unificar } from "../../src/motor";

type Peca = Extract<ItemDoHistorico, { tipo: "peca" }>;

/** Uma peça que os códigos da própria máquina não acham no estoque e outro código da mesma peça acha. */
export interface PecaEscondida {
  equipamento: Equipamento;
  peca: Peca;
  achados: readonly [Saldo, ...Saldo[]];
}

export interface MaquinaDaUsina {
  equipamento: Equipamento;
  trocas: number;
  pecas: number;
  escondidas: readonly PecaEscondida[];
}

export interface TrocasDoMes {
  /** AAAA-MM */
  mes: string;
  trocas: number;
}

/** O retrato da usina de demonstração, calculado no navegador com o mesmo motor e a mesma exportação do site. */
export interface Usina {
  exportacao: ExportacaoDaUsina;
  unificacao: Unificacao;
  maquinas: readonly MaquinaDaUsina[];
  escondidas: readonly PecaEscondida[];
  resumoDoCadastro: Resumo;
  indicadores: {
    codigos: number;
    pecas: number;
    trocas: number;
    unidadesComOutroCodigo: number;
    paraRevisar: number;
  };
  porMes: readonly TrocasDoMes[];
}

function escondidasDa(equipamento: Equipamento, itens: readonly ItemDoHistorico[]): PecaEscondida[] {
  return itens.flatMap((item) => {
    if (item.tipo !== "peca" || item.saldoAqui.some((s) => s.quantidade > 0)) return [];
    const [primeiro, ...resto] = item.saldoSobOutroCodigo.filter((s) => s.quantidade > 0);
    return primeiro ? [{ equipamento, peca: item, achados: [primeiro, ...resto] }] : [];
  });
}

function calcular(): Usina {
  const lido = lerExportacao({ equipamentos, materiais, consumo, estoque });
  if (!lido.ok) throw new Error(`a exportação da demo não abre: ${lido.erros[0].problema}`);
  const exportacao = lido.valor;
  const unificacao = unificar(exportacao.materiais);
  const maquinas = exportacao.equipamentos.map((equipamento): MaquinaDaUsina => {
    const { itens } = historicoDoEquipamento(exportacao, unificacao, equipamento);
    return {
      equipamento,
      trocas: exportacao.trocas.filter((t) => t.patrimonio === equipamento.patrimonio).length,
      pecas: itens.filter((i) => i.tipo === "peca").length,
      escondidas: escondidasDa(equipamento, itens),
    };
  });
  const escondidas = maquinas.flatMap((m) => m.escondidas);
  // A mesma unidade guardada pode aparecer para duas máquinas; conta cada código uma vez só.
  const guardados = new Map(escondidas.flatMap((e) => e.achados).map((s) => [s.codigo, s.quantidade]));
  const meses = new Map<string, number>();
  for (const troca of exportacao.trocas) meses.set(troca.data.slice(0, 7), (meses.get(troca.data.slice(0, 7)) ?? 0) + 1);
  return {
    exportacao,
    unificacao,
    maquinas,
    escondidas,
    resumoDoCadastro: resumir(diagnosticar(exportacao.materiais, unificacao)),
    indicadores: {
      codigos: exportacao.materiais.length,
      pecas: unificacao.grupos.size,
      trocas: exportacao.trocas.length,
      unidadesComOutroCodigo: [...guardados.values()].reduce((a, b) => a + b, 0),
      paraRevisar: [...unificacao.leituras.values()].filter((l) => l.decisao === "revisa").length,
    },
    porMes: [...meses].map(([mes, trocas]) => ({ mes, trocas })).toSorted((a, b) => (a.mes < b.mes ? -1 : 1)),
  };
}

let calculada: Usina | undefined;

export const usinaDaDemo = (): Usina => (calculada ??= calcular());
