import type { Marca, CodigoLegado } from "./marcas";

export type ClasseCatmat = Marca<string, "ClasseCatmat">;

export interface FamiliaSugerida {
  codigo: CodigoLegado;
  resposta: { tipo: "classe"; classe: ClasseCatmat } | { tipo: "nenhuma" };
  probabilidade: number;
  confianca: number;
  modelo: string;
}
