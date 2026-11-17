import type { Leitura } from "./leitura";
import type { Origem } from "./entrada";

export const PECA_IDENTIFICADA = "agroparts:peca-identificada";

export interface PecaIdentificada {
  leitura: Leitura;
  origem: Origem;
}
