import { campoDeNumero, type Ir } from "./casca";
import { h } from "./dom";

export function montarInicio(raiz: HTMLElement, ir: Ir): void {
  raiz.replaceChildren(h("h1", {}, "AgroParts"), campoDeNumero(ir));
}
