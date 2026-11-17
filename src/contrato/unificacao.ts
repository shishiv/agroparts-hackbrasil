import type { Entrada } from "./entrada";
import type { FamiliaId, Leitura } from "./leitura";
import type { ChaveIdentidade, CodigoLegado, NaoVazia, SkuUsina } from "./marcas";

export interface CadastroMaterial {
  codigo: CodigoLegado;
  descricao: string;
  unidade: string;
  sku: SkuUsina | null;
}

export interface Grupo {
  chave: ChaveIdentidade;
  familia: FamiliaId;
  rotulo: string;
  codigos: NaoVazia<CodigoLegado>;
}

declare const montadaPorAgrupar: unique symbol;

export interface Unificacao {
  readonly [montadaPorAgrupar]: true;
  readonly versaoRegras: string;
  readonly leituras: ReadonlyMap<CodigoLegado, Leitura>;
  readonly grupos: ReadonlyMap<ChaveIdentidade, Grupo>;
  grupoDe(codigo: CodigoLegado): Grupo | null;
}

export interface Motor {
  ler(entrada: Entrada): Leitura;
  unificar(cadastro: readonly CadastroMaterial[]): Unificacao;
}
