import { entradaDeAudio } from "./audio";
import { entradaDeFoto } from "./foto";

export interface ModuloDeEntrada {
  id: string;
  /** Põe o botão da entrada (foto, áudio) dentro de `destino`. */
  montar(destino: HTMLElement): void;
}

export const entradasRegistradas: readonly ModuloDeEntrada[] = [
  entradaDeAudio,
  entradaDeFoto,
];
