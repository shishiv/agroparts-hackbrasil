import type { CadastroMaterial, CodigoLegado, Leitura, Unificacao } from "../contrato";
import { agrupar } from "../unificacao/agrupar";
import { ler } from "./ler";

/** Muda quando uma regra de leitura muda. O placar e as páginas citam esta versão. */
export const VERSAO_REGRAS = "motor-1";

export function unificar(cadastro: readonly CadastroMaterial[]): Unificacao {
  const leituras = new Map<CodigoLegado, Leitura>(
    cadastro.map((material) => [material.codigo, ler({ texto: material.descricao, origem: { tipo: "cadastro" } })]),
  );
  return agrupar(VERSAO_REGRAS, leituras);
}
