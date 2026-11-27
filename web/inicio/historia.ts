import type { CodigoLegado, ItemDoHistorico, Saldo } from "../../src/contrato";
import { caminhoDoEquipamento, lerPaginaDoEquipamento } from "../../src/historico";
import { lerPatrimonio } from "../../src/exportacao/valores";
import { enderecoDoEquipamento } from "./casca";
import { h } from "./dom";

type Peca = Extract<ItemDoHistorico, { tipo: "peca" }>;

/** A máquina da demo cuja peça está guardada com outro código: a mesma das placas e do README. */
export const MAQUINA_DA_HISTORIA = "004512";

const juntarComE = (itens: readonly string[]): string =>
  itens.length < 2 ? itens.join("") : `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;

const minuscula = (texto: string): string => texto.charAt(0).toLowerCase() + texto.slice(1);

const unidades = (n: number, unidade: string): string =>
  unidade === "UN" ? `${n} ${n === 1 ? "unidade" : "unidades"}` : `${n} ${unidade}`;

const chip = (codigo: CodigoLegado, quantidade: number | null, classe: string): HTMLElement =>
  h(
    "span",
    { class: `chip ${classe}` },
    h("span", { class: "chip-codigo" }, codigo),
    quantidade === null ? null : h("span", { class: "chip-saldo" }, String(quantidade)),
  );

/** A primeira peça da máquina que os códigos dela não acham no estoque e outro código da mesma peça acha. */
function pecaEscondida(itens: readonly ItemDoHistorico[]): { peca: Peca; achado: Saldo } | null {
  for (const item of itens) {
    if (item.tipo !== "peca" || item.saldoAqui.some((s) => s.quantidade > 0)) continue;
    const achado = item.saldoSobOutroCodigo.find((s) => s.quantidade > 0);
    if (achado) return { peca: item, achado };
  }
  return null;
}

function passo(titulo: string, frase: string, desenho: HTMLElement, ...depois: HTMLElement[]): HTMLElement {
  return h("li", { class: "passo" }, h("div", { class: "passo-desenho", "aria-hidden": "true" }, desenho), h("h3", {}, titulo), h("p", {}, frase), ...depois);
}

/**
 * A faixa da página inicial que conta o problema em três passos, com os dados da própria demo:
 * a máquina pede a peça, os códigos dela não estão no estoque, e a AgroParts acha a peça com outro código.
 * Os passos aparecem conforme a rolagem chega neles; a rolagem continua da pessoa.
 */
export async function montarHistoria(secao: HTMLElement, buscar: (endereco: string) => Promise<Pick<Response, "ok" | "text">>): Promise<void> {
  const patrimonio = lerPatrimonio(MAQUINA_DA_HISTORIA);
  if (!patrimonio.ok) return;
  let texto: string;
  try {
    const resposta = await buscar(caminhoDoEquipamento(patrimonio.valor));
    if (!resposta.ok) return;
    texto = await resposta.text();
  } catch {
    return;
  }
  const lida = lerPaginaDoEquipamento(texto);
  if (!lida.ok) return;
  const { equipamento, itens } = lida.valor.historico;
  const escondida = pecaEscondida(itens);
  if (!escondida) return;
  const { peca, achado } = escondida;
  const usados = peca.codigosUsadosAqui;
  const guardado = achado.endereco === null ? "no almoxarifado" : `no endereço ${achado.endereco}`;

  const passos = h(
    "ol",
    { class: "passos" },
    passo(
      "A máquina pede a peça",
      `A máquina ${equipamento.tag}, ${equipamento.nome.toLowerCase()}, já trocou o ${minuscula(peca.grupo.rotulo)} ${peca.trocas.length} vezes, com ${usados.length === 1 ? `o código ${usados[0]}` : `os códigos ${juntarComE(usados)}`}.`,
      h("span", { class: "trilha-de" }, ...usados.map((c) => chip(c, null, "neutro"))),
    ),
    passo(
      "O estoque diz que não tem",
      `O almoxarifado não tem ${usados.length === 1 ? "esse código" : `nenhum dos ${usados.length} códigos`}.`,
      h("span", { class: "trilha-de" }, ...usados.map((c) => chip(c, 0, "sem"))),
    ),
    passo(
      "A AgroParts acha a peça",
      `A mesma peça está guardada com o código ${achado.codigo}: ${unidades(achado.quantidade, achado.unidade)} ${guardado}.`,
      h("span", { class: "trilha-para" }, chip(achado.codigo, achado.quantidade, "achado")),
      h("a", { class: "seguir", href: enderecoDoEquipamento(equipamento.patrimonio) }, `Abrir a máquina ${equipamento.patrimonio}`),
    ),
  );
  secao.replaceChildren(h("h2", {}, "A peça que estava guardada com outro código"), passos);
  secao.hidden = false;

  const itensDaLista = [...passos.children];
  if (typeof IntersectionObserver === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  secao.dataset.rolagem = "";
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        entrada.target.setAttribute("data-visto", "");
        observador.unobserve(entrada.target);
      }
    },
    { rootMargin: "0px 0px -15% 0px", threshold: 0.4 },
  );
  for (const item of itensDaLista) observador.observe(item);
}
