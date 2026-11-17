import { h } from "./dom";

export const TEXTO_DO_RODAPE = "Dados de demonstração: CATMAT público e usina fictícia";

export type Ir = (endereco: string) => void;

export const rodape = (): HTMLElement => h("footer", { class: "rodape" }, h("p", {}, TEXTO_DO_RODAPE));

export const topo = (): HTMLElement => h("header", { class: "topo" }, h("a", { href: "/" }, "AgroParts"));

export const enderecoDoEquipamento = (patrimonio: string): string => `/e/${encodeURIComponent(patrimonio)}`;

/** O campo de número de patrimônio: o que a placa abre sozinha, a pessoa digita aqui. */
export function campoDeNumero(ir: Ir, digitado = ""): HTMLFormElement {
  const campo = h("input", {
    id: "patrimonio",
    name: "patrimonio",
    type: "text",
    inputmode: "text",
    enterkeyhint: "go",
    autocomplete: "off",
    autocapitalize: "off",
    spellcheck: "false",
    required: true,
    maxlength: "20",
  });
  campo.value = digitado;
  const formulario = h(
    "form",
    { class: "numero" },
    h("label", { for: "patrimonio" }, "Número da placa de patrimônio"),
    h("div", { class: "numero-linha" }, campo, h("button", { type: "submit" }, "Abrir")),
  );
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const numero = campo.value.trim();
    if (numero !== "") ir(enderecoDoEquipamento(numero));
  });
  return formulario;
}
