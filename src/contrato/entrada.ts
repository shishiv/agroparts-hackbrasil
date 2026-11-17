export type Origem =
  | { tipo: "cadastro" }
  | { tipo: "digitado" }
  | { tipo: "foto"; modelo: string; textoLido: string; confirmadoPelaPessoa: boolean }
  | { tipo: "audio"; modelo: string; textoOuvido: string; confirmadoPelaPessoa: boolean };

export interface Entrada {
  texto: string;
  origem: Origem;
}
