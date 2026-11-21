import { campoDeNumero, type Ir } from "./casca";
import { h } from "./dom";
import { montarToque, type Tempos } from "./toque";

export function montarInicio(raiz: HTMLElement, ir: Ir, tempos?: Tempos): void {
  raiz.replaceChildren(h("h1", {}, h("span", {}, "Agro"), h("span", {}, "Parts")), campoDeNumero(ir), montarToque(ir, tempos));
}
