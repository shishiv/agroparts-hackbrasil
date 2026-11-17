import type { Entrada, Leitura } from "../contrato";
import { FAMILIAS } from "./familias";
import { normalizar } from "./normalizar";

const FORA_DAS_FAMILIAS: Leitura = {
  decisao: "recusa",
  motivo: "fora-das-familias",
  detalhe: "nenhuma família conhecida reconhece o texto",
  atributos: [],
};

/** O que o motor conclui de um texto: a primeira família que não o recusa decide. */
export function ler(entrada: Entrada): Leitura {
  if (entrada.texto.trim() === "") {
    return { decisao: "recusa", motivo: "sem-texto", detalhe: "descrição vazia", atributos: [] };
  }
  const normalizado = normalizar(entrada.texto);
  for (const familia of FAMILIAS) {
    const leitura = familia.ler(normalizado, entrada.texto);
    if (leitura.decisao !== "recusa" || leitura.motivo !== "fora-das-familias") return leitura;
  }
  return FORA_DAS_FAMILIAS;
}
