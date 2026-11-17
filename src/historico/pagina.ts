import type {
  Atributo,
  ChaveIdentidade,
  CodigoLegado,
  ExportacaoDaUsina,
  HistoricoDoEquipamento,
  NumeroPatrimonio,
  ResultadoDaPagina,
  Saldo,
  Unificacao,
} from "../contrato";
import { historicoDoEquipamento } from "./historico";

export const CAMINHO_DO_INDICE = "/grupos.json";

export const caminhoDoEquipamento = (patrimonio: NumeroPatrimonio): string => `/maquinas/${patrimonio}.json`;

/** O texto do cadastro e o que o motor marcou nele, para a página mostrar de onde veio cada atributo. */
export interface TextoDoCodigo {
  codigo: CodigoLegado;
  descricao: string;
  atributos: readonly Atributo[];
}

/** O que `/maquinas/<patrimônio>.json` guarda: o histórico e os textos dos códigos que ele cita. */
export interface PaginaDoEquipamento {
  historico: HistoricoDoEquipamento;
  textos: readonly TextoDoCodigo[];
}

export type PaginaCarregada =
  | (Extract<ResultadoDaPagina, { tipo: "achado" }> & { textos: readonly TextoDoCodigo[] })
  | Extract<ResultadoDaPagina, { tipo: "patrimonio-desconhecido" }>;

export interface EntradaDoIndice {
  chave: ChaveIdentidade;
  rotulo: string;
  /** Todas as linhas de estoque dos códigos do grupo, inclusive as zeradas. */
  saldo: readonly Saldo[];
}

/** O que `/grupos.json` guarda: o saldo de todo grupo, para achar uma peça que a máquina nunca usou. */
export interface IndiceDeGrupos {
  versaoRegras: string;
  grupos: readonly EntradaDoIndice[];
}

export function paginaDoEquipamento(
  exportacao: ExportacaoDaUsina,
  unificacao: Unificacao,
  patrimonio: NumeroPatrimonio,
): PaginaDoEquipamento {
  const equipamento = exportacao.equipamentos.find((e) => e.patrimonio === patrimonio);
  if (equipamento === undefined) throw new Error(`patrimônio ${patrimonio} não está nos equipamentos`);
  const historico = historicoDoEquipamento(exportacao, unificacao, equipamento);

  const citados = new Set<CodigoLegado>();
  for (const item of historico.itens) {
    if (item.tipo === "peca") for (const codigo of item.grupo.codigos) citados.add(codigo);
    else citados.add(item.codigo);
  }
  const textos = exportacao.materiais
    .filter((m) => citados.has(m.codigo))
    .map((m) => ({
      codigo: m.codigo,
      descricao: m.descricao,
      atributos: unificacao.leituras.get(m.codigo)?.atributos ?? [],
    }));
  return { historico, textos };
}

export function indiceDeGrupos(exportacao: ExportacaoDaUsina, unificacao: Unificacao): IndiceDeGrupos {
  const grupos = [...unificacao.grupos.values()].map((grupo) => ({
    chave: grupo.chave,
    rotulo: grupo.rotulo,
    saldo: exportacao.estoque.filter((s) => grupo.codigos.includes(s.codigo)),
  }));
  return { versaoRegras: unificacao.versaoRegras, grupos };
}
