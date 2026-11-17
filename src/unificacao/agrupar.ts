import type {
  ChaveIdentidade,
  CodigoLegado,
  FamiliaId,
  Grupo,
  Leitura,
  Unificacao,
} from "../contrato";

type Resolve = Extract<Leitura, { decisao: "resolve" }>;

function menor(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Única porta de entrada para `Unificacao`. Junta num grupo os códigos cuja
 * leitura resolve traz a mesma chave. Revisa e recusa ficam só em `leituras`.
 * O resultado não depende da ordem do mapa recebido.
 */
export function agrupar(
  versaoRegras: string,
  leituras: ReadonlyMap<CodigoLegado, Leitura>,
): Unificacao {
  const porChave = new Map<ChaveIdentidade, { codigo: CodigoLegado; leitura: Resolve }[]>();
  for (const [codigo, leitura] of leituras) {
    if (leitura.decisao !== "resolve") continue;
    const membros = porChave.get(leitura.chave);
    if (membros) membros.push({ codigo, leitura });
    else porChave.set(leitura.chave, [{ codigo, leitura }]);
  }

  const grupos: Grupo[] = [];
  for (const [chave, membros] of porChave) {
    membros.sort((a, b) => menor(a.codigo, b.codigo));
    const [primeiro, ...resto] = membros;
    if (!primeiro) continue;
    const familias = new Set<FamiliaId>(membros.map((m) => m.leitura.familia));
    if (familias.size > 1) {
      throw new Error(`A chave ${chave} aparece em mais de uma família: ${[...familias].join(", ")}`);
    }
    grupos.push({
      chave,
      familia: primeiro.leitura.familia,
      rotulo: primeiro.leitura.rotulo,
      codigos: [primeiro.codigo, ...resto.map((m) => m.codigo)],
    });
  }
  grupos.sort((a, b) => menor(a.codigos[0], b.codigos[0]));

  const gruposPorChave = new Map<ChaveIdentidade, Grupo>(grupos.map((g) => [g.chave, g]));
  const grupoPorCodigo = new Map<CodigoLegado, Grupo>();
  for (const grupo of grupos) {
    for (const codigo of grupo.codigos) grupoPorCodigo.set(codigo, grupo);
  }

  const leiturasOrdenadas = new Map<CodigoLegado, Leitura>(
    [...leituras].sort(([a], [b]) => menor(a, b)),
  );

  const montada: Pick<Unificacao, "versaoRegras" | "leituras" | "grupos" | "grupoDe"> = {
    versaoRegras,
    leituras: leiturasOrdenadas,
    grupos: gruposPorChave,
    grupoDe: (codigo: CodigoLegado) => grupoPorCodigo.get(codigo) ?? null,
  };
  return montada as Unificacao;
}
