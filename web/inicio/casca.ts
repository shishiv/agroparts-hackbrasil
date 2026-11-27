import type { Equipamento } from "../../src/contrato";
import equipamentosDaDemo from "../../dados/demo/equipamentos.csv?raw";
import { lerEquipamentos } from "../../src/exportacao/exportacao";
import { h } from "./dom";

export const TEXTO_DO_RODAPE = "Dados de demonstração: usina fictícia, com descrições de peças do catálogo público CATMAT";

export type Ir = (endereco: string) => void;

export const rodape = (): HTMLElement => h("footer", { class: "rodape" }, h("p", {}, TEXTO_DO_RODAPE));

export const enderecoDoEquipamento = (patrimonio: string): string => `/e/${encodeURIComponent(patrimonio)}`;

/** O endereço que abre a página inicial já com a visita guiada. */
export const ENDERECO_DA_VISITA = "/?visita=1";

/** As máquinas da demo na ordem da exportação; o número de cada uma (01, 02…) é o mesmo no mapa e na barra lateral. */
export function maquinasDaDemo(): readonly Equipamento[] {
  const lido = lerEquipamentos(equipamentosDaDemo);
  if (!lido.ok) throw new Error("equipamentos da demo ilegíveis");
  return lido.valor;
}

export const numeroDaMaquina = (indice: number): string => String(indice + 1).padStart(2, "0");

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

export type Lugar = { tipo: "visao" } | { tipo: "cadastro" } | { tipo: "maquina"; patrimonio: string };

const ICONES = {
  visao: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  cadastro: "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4",
  placas: "M3 7h18v10H3zM7 11h4M16 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  visita: "M8 5v14l11-7z",
  menu: "M4 7h16M4 12h16M4 17h16",
} as const;

function icone(nome: keyof typeof ICONES): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "icone");
  const caminho = document.createElementNS("http://www.w3.org/2000/svg", "path");
  caminho.setAttribute("d", ICONES[nome]);
  svg.append(caminho);
  return svg;
}

function link(href: string, ativo: boolean, ...filhos: (Node | string)[]): HTMLAnchorElement {
  return h("a", { href, ...(ativo ? { "aria-current": "page" } : {}) }, ...filhos);
}

function lateral(lugar: Lugar): HTMLElement {
  const maquinas = maquinasDaDemo();
  return h(
    "aside",
    { class: "lateral", id: "navegacao", "aria-label": "Navegação" },
    h("a", { class: "marca", href: "/" }, "AgroParts"),
    h(
      "div",
      { class: "usina" },
      h("span", { class: "usina-sigla", "aria-hidden": "true" }, "UM"),
      h("span", {}, h("strong", {}, "Usina Modelo"), h("span", {}, "fictícia, para demonstração")),
    ),
    h(
      "nav",
      { "aria-label": "Páginas" },
      h("p", { class: "grupo" }, "Na usina"),
      h(
        "ul",
        {},
        h("li", {}, link("/", lugar.tipo === "visao", icone("visao"), "Visão geral")),
        h("li", {}, link("/diagnostico/", lugar.tipo === "cadastro", icone("cadastro"), "Cadastro de peças")),
      ),
      h("p", { class: "grupo" }, "Máquinas"),
      h(
        "ul",
        { class: "maquinas" },
        ...maquinas.map((m, i) =>
          h(
            "li",
            {},
            link(
              enderecoDoEquipamento(m.patrimonio),
              lugar.tipo === "maquina" && lugar.patrimonio === m.patrimonio,
              h("span", { class: "num" }, numeroDaMaquina(i)),
              h("span", { class: "nome-maquina" }, m.nome),
              h("span", { class: "tag-maquina" }, m.tag),
            ),
          ),
        ),
      ),
    ),
    h("p", { class: "nota-lateral" }, "Usina fictícia. Nenhum equipamento real conectado; a leitura da placa é simulada."),
  );
}

function barra(lugar: Lugar, trilha: readonly string[]): HTMLElement {
  const menu = h("button", { type: "button", class: "abrir-menu", "aria-controls": "navegacao", "aria-expanded": "false" }, icone("menu"), h("span", { class: "so-leitor" }, "Menu"));
  menu.addEventListener("click", () => {
    const aberto = document.body.toggleAttribute("data-menu");
    menu.setAttribute("aria-expanded", String(aberto));
  });
  const visita =
    lugar.tipo === "visao"
      ? h("button", { type: "button", class: "acao-visita", "data-visita": "" }, icone("visita"), h("span", {}, "Visita guiada"))
      : h("a", { class: "acao-visita", href: ENDERECO_DA_VISITA }, icone("visita"), h("span", {}, "Visita guiada"));
  return h(
    "header",
    { class: "barra" },
    menu,
    h(
      "nav",
      { class: "trilha", "aria-label": "Você está em" },
      h("ol", {}, ...trilha.map((parte, i) => h("li", i === trilha.length - 1 ? { "aria-current": "page" } : {}, parte))),
    ),
    h("span", { class: "demonstracao", title: "Demonstração" }, h("span", {}, "Demonstração")),
    visita,
  );
}

function abas(lugar: Lugar): HTMLElement {
  return h(
    "nav",
    { class: "abas", "aria-label": "Atalhos" },
    link("/", lugar.tipo === "visao", icone("visao"), "Visão geral"),
    link("/#placas", false, icone("placas"), "Placas"),
    link("/diagnostico/", lugar.tipo === "cadastro", icone("cadastro"), "Cadastro"),
    link(ENDERECO_DA_VISITA, false, icone("visita"), "Visita"),
  );
}

/**
 * A casca de aplicativo, a mesma nas três páginas: barra lateral com a usina, as páginas e as
 * máquinas; barra de cima com a trilha e a visita guiada; no celular, abas embaixo.
 * Monta tudo em volta de `principal`, sem mexer no que está dentro dele.
 */
export function montarCasca(principal: HTMLElement, lugar: Lugar, trilha: readonly string[]): void {
  document.body.classList.add("casca");
  principal.before(lateral(lugar), barra(lugar, trilha));
  principal.after(rodape(), abas(lugar));
  document.querySelector(".lateral")?.addEventListener("click", (evento) => {
    if (evento.target instanceof Element && evento.target.closest("a")) document.body.removeAttribute("data-menu");
  });
}
