import type { ChaveIdentidade, Marca, NaoVazia } from "./marcas";

export type FamiliaId = Marca<string, "FamiliaId">;

/** Posição no texto original, em unidades UTF-16: `inicio` inclusive, `fim` exclusive. */
export interface Trecho {
  inicio: number;
  fim: number;
}

export interface Atributo {
  nome: string;
  valor: string;
  trecho: Trecho;
}

export type Pendencia = "sufixo-desconhecido" | "designacao-ausente" | "duas-leituras";
export type MotivoRecusa = "contradicao" | "fora-das-familias" | "sem-texto";

export type Leitura =
  | {
      decisao: "resolve";
      familia: FamiliaId;
      chave: ChaveIdentidade;
      rotulo: string;
      atributos: readonly Atributo[];
    }
  | {
      decisao: "revisa";
      familia: FamiliaId | null;
      pendencias: NaoVazia<Pendencia>;
      atributos: readonly Atributo[];
    }
  | {
      decisao: "recusa";
      motivo: MotivoRecusa;
      detalhe: string;
      atributos: readonly Atributo[];
    };
