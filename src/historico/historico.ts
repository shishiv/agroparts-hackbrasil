import type {
  ChaveIdentidade,
  CodigoLegado,
  Equipamento,
  ExportacaoDaUsina,
  Grupo,
  HistoricoDoEquipamento,
  ItemDoHistorico,
  NaoVazia,
  Saldo,
  Troca,
  Unificacao,
} from "../contrato";

type Peca = Extract<ItemDoHistorico, { tipo: "peca" }>;
type SemChave = Extract<ItemDoHistorico, { tipo: "codigo-sem-chave" }>;

const comparar = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Da troca mais recente para a mais antiga; o desempate por ordem e código mantém o resultado estável. */
function maisRecenteAntes(a: Troca, b: Troca): number {
  return comparar(b.data, a.data) || comparar(b.ordem, a.ordem) || comparar(a.codigo, b.codigo);
}

function naoVazia<T>(lista: readonly T[], oQue: string): NaoVazia<T> {
  const [primeiro, ...resto] = lista;
  if (primeiro === undefined) throw new Error(`${oQue}: lista vazia`);
  return [primeiro, ...resto];
}

/** Soma em milésimos para que 0,1 + 0,2 dê 0,3 e não 0,30000000000000004. */
export function somarQuantidades(quantidades: readonly number[]): number {
  return quantidades.reduce((total, q) => total + Math.round(q * 1000), 0) / 1000;
}

function quantidadeTotal(trocas: NaoVazia<Troca>): number | null {
  const unidade = trocas[0].unidade;
  return trocas.every((t) => t.unidade === unidade) ? somarQuantidades(trocas.map((t) => t.quantidade)) : null;
}

function pecaDoGrupo(grupo: Grupo, trocas: NaoVazia<Troca>, estoque: readonly Saldo[]): Peca {
  const usados = new Set(trocas.map((t) => t.codigo));
  const doGrupo = estoque.filter((s) => grupo.codigos.includes(s.codigo));
  return {
    tipo: "peca",
    grupo,
    trocas,
    codigosUsadosAqui: naoVazia(
      grupo.codigos.filter((c) => usados.has(c)),
      `grupo ${grupo.codigos[0]}`,
    ),
    quantidadeTotal: quantidadeTotal(trocas),
    ultimaTroca: trocas[0].data,
    saldoAqui: doGrupo.filter((s) => usados.has(s.codigo)),
    saldoSobOutroCodigo: doGrupo.filter((s) => !usados.has(s.codigo)),
  };
}

function semChaveDoCodigo(codigo: CodigoLegado, trocas: NaoVazia<Troca>, unificacao: Unificacao): SemChave {
  const leitura = unificacao.leituras.get(codigo);
  if (leitura === undefined) throw new Error(`código ${codigo} tem troca e não tem leitura na unificação`);
  if (leitura.decisao === "resolve") {
    throw new Error(`código ${codigo} resolve e não está em nenhum grupo da unificação`);
  }
  return { tipo: "codigo-sem-chave", codigo, leitura, trocas };
}

/**
 * Junta as trocas de um equipamento pelos grupos da unificação. A soma só existe
 * por grupo: um código sem chave (revisa ou recusa) vira item à parte, sem soma.
 * Peças primeiro, depois os códigos sem chave; dentro de cada parte, a troca
 * mais recente vem antes. Lança erro se a unificação não cobre um código que
 * a exportação usa, porque isso quer dizer que as duas vieram de cadastros diferentes.
 */
export function historicoDoEquipamento(
  exportacao: ExportacaoDaUsina,
  unificacao: Unificacao,
  equipamento: Equipamento,
): HistoricoDoEquipamento {
  const daMaquina = exportacao.trocas
    .filter((t) => t.patrimonio === equipamento.patrimonio)
    .toSorted(maisRecenteAntes);

  const porGrupo = new Map<ChaveIdentidade, { grupo: Grupo; trocas: NaoVazia<Troca> }>();
  const porCodigoSemChave = new Map<CodigoLegado, NaoVazia<Troca>>();
  for (const troca of daMaquina) {
    const grupo = unificacao.grupoDe(troca.codigo);
    if (grupo === null) {
      const atuais = porCodigoSemChave.get(troca.codigo);
      porCodigoSemChave.set(troca.codigo, atuais ? [...atuais, troca] : [troca]);
    } else {
      const atual = porGrupo.get(grupo.chave);
      porGrupo.set(grupo.chave, { grupo, trocas: atual ? [...atual.trocas, troca] : [troca] });
    }
  }

  const pecas = [...porGrupo.values()].map(({ grupo, trocas }) => pecaDoGrupo(grupo, trocas, exportacao.estoque));
  const semChave = [...porCodigoSemChave].map(([codigo, trocas]) =>
    semChaveDoCodigo(codigo, trocas, unificacao),
  );

  pecas.sort((a, b) => comparar(b.ultimaTroca, a.ultimaTroca) || comparar(a.grupo.codigos[0], b.grupo.codigos[0]));
  semChave.sort(
    (a, b) => comparar(b.trocas[0].data, a.trocas[0].data) || comparar(a.codigo, b.codigo),
  );

  return { equipamento, itens: [...pecas, ...semChave], versaoRegras: unificacao.versaoRegras };
}
