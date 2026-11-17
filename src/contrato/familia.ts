import type { FamiliaId, Leitura } from "./leitura";
import type { NaoVazia } from "./marcas";

export interface DefinicaoDeFamilia<A extends string = string> {
  id: FamiliaId;
  nome: string;
  atributosDaChave: NaoVazia<A>;
  ler(textoNormalizado: string, original: string): Leitura;
}
