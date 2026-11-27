import { campoDeNumero, type Ir } from "./casca";
import { h } from "./dom";
import { montarToque, type Tempos } from "./toque";
import { usinaDaDemo } from "./usina";
import { grafico, indicadores, mapa, paraRevisar } from "./visao";

/**
 * A visão geral da usina: o título e o campo do número da placa, a faixa de indicadores,
 * o mapa com as máquinas e o painel "Para revisar", as trocas por mês e as placas para tocar.
 */
export function montarInicio(raiz: HTMLElement, ir: Ir, tempos?: Tempos): void {
  const usina = usinaDaDemo();
  const toque = montarToque(ir, tempos);
  toque.id = "placas";
  toque.classList.add("cartao-painel");
  toque.dataset.visitaPasso = "4";
  raiz.replaceChildren(
    h(
      "div",
      { class: "cabecalho" },
      h(
        "div",
        { class: "titulo" },
        h("p", { class: "sobre" }, "Usina de demonstração, dados fictícios"),
        h("h1", {}, "Visão geral"),
        h("p", { class: "explica" }, `Peças, trocas e estoque das ${usina.maquinas.length} máquinas, com os códigos do cadastro juntados pelo motor.`),
      ),
      campoDeNumero(ir),
    ),
    indicadores(usina),
    h("div", { class: "grade-painel" }, mapa(usina), paraRevisar(usina)),
    h("div", { class: "grade-painel" }, grafico(usina.porMes), toque),
  );
}
