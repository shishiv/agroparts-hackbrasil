import type { ChaveIdentidade, CodigoLegado, NaoVazia, SkuUsina } from "./marcas";
import type { Grupo } from "./unificacao";

export type VeredictoDoSku =
  | { tipo: "coerente"; sku: SkuUsina; chave: ChaveIdentidade }
  | {
      tipo: "mistura";
      sku: SkuUsina;
      chaves: readonly [ChaveIdentidade, ChaveIdentidade, ...ChaveIdentidade[]];
      atributosQueDiferem: NaoVazia<string>;
    }
  | { tipo: "inconclusivo"; sku: SkuUsina; semChave: NaoVazia<CodigoLegado> };

export interface Fragmentacao {
  grupo: Grupo;
  skus: readonly [SkuUsina, SkuUsina, ...SkuUsina[]];
}
