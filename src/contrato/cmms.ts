import type { CadastroMaterial } from "./unificacao";
import type { CodigoLegado, DataISO, NaoVazia, NumeroOrdem, NumeroPatrimonio } from "./marcas";

export type TipoOrdem = "preventiva" | "corretiva" | "preditiva" | "outra";

export interface Equipamento {
  patrimonio: NumeroPatrimonio;
  /** Tag do equipamento na usina (por exemplo B-104). Não é a tag NFC da placa. */
  tag: string;
  nome: string;
  area: string;
}

export interface Troca {
  ordem: NumeroOrdem;
  data: DataISO;
  patrimonio: NumeroPatrimonio;
  tipo: TipoOrdem;
  descricaoOrdem: string;
  codigo: CodigoLegado;
  descricaoMaterial: string;
  quantidade: number;
  unidade: string;
  posicao: string | null;
}

export interface Saldo {
  codigo: CodigoLegado;
  quantidade: number;
  unidade: string;
  endereco: string | null;
}

export interface ExportacaoDaUsina {
  equipamentos: readonly Equipamento[];
  materiais: readonly CadastroMaterial[];
  trocas: readonly Troca[];
  estoque: readonly Saldo[];
}

export interface ErroDeLinha {
  arquivo: string;
  linha: number;
  coluna: string;
  problema: string;
}

export type Lido<T> = { ok: true; valor: T } | { ok: false; erros: NaoVazia<ErroDeLinha> };
