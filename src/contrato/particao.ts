import type { Leitura } from "./leitura";
import type { CodigoLegado, NaoVazia } from "./marcas";

export interface ParticaoEsperada {
  decisoes: readonly { codigo: CodigoLegado; decisao: Leitura["decisao"] }[];
  grupos: readonly NaoVazia<CodigoLegado>[];
}
