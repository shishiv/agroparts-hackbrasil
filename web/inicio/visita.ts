import { h } from "./dom";
import type { Usina } from "./usina";

export interface PassoDaVisita {
  titulo: string;
  texto: string;
}

const minuscula = (texto: string): string => texto.charAt(0).toLowerCase() + texto.slice(1);

/** Os passos da visita, com os números da própria demo. O passo N destaca o elemento com `data-visita-passo="N"`. */
export function passosDaVisita(usina: Usina): readonly PassoDaVisita[] {
  const { codigos, pecas } = usina.indicadores;
  const caso = usina.escondidas.find((e) => e.equipamento.patrimonio === "004512") ?? usina.escondidas[0];
  const achado = caso?.achados[0];
  return [
    {
      titulo: "O cadastro",
      texto: `A usina tem ${codigos} códigos de material. A mesma peça costuma ter mais de um código. O motor lê o texto de cada código e junta os que são a mesma peça: viram ${pecas} peças.`,
    },
    {
      titulo: "As máquinas",
      texto: "Cada máquina tem uma placa de patrimônio com uma tag NFC. Tocar a placa com o celular abre a página da máquina, com as trocas de cada peça somadas.",
    },
    caso && achado
      ? {
          titulo: "A peça que ninguém achava",
          texto: `O almoxarifado diz que não tem, mas a peça está lá com outro código. Na ${minuscula(caso.equipamento.nome)} ${caso.equipamento.tag}: ${achado.quantidade} unidades do ${minuscula(caso.peca.grupo.rotulo)} ${achado.endereco === null ? "no almoxarifado" : `no endereço ${achado.endereco}`}, com o código ${achado.codigo}.`,
        }
      : { titulo: "Para revisar", texto: "Aqui ficam os casos que esperam uma pessoa." },
    {
      titulo: "Toque na placa",
      texto: "Experimente: toque na placa 004512. A tela simula a leitura da tag e abre a página da bomba de caldo, como o celular abriria.",
    },
  ];
}

/**
 * A visita guiada: um cartão que leva por cada parte da tela, com o alvo em destaque.
 * Esc fecha, as setas andam. Sem animação quando a pessoa pede menos movimento.
 */
export function iniciarVisita(passos: readonly PassoDaVisita[]): void {
  document.querySelector(".visita")?.remove();
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let atual = 0;
  const titulo = h("h2", { id: "visita-titulo" });
  const texto = h("p", {});
  const contador = h("span", { class: "contador-visita" });
  const voltar = h("button", { type: "button", class: "secundario" }, "Voltar");
  const seguir = h("button", { type: "button" }, "Próximo");
  const fechar = h("button", { type: "button", class: "fechar", "aria-label": "Fechar a visita" }, "×");
  const cartao = h(
    "div",
    { class: "visita", role: "dialog", "aria-labelledby": "visita-titulo", "aria-live": "polite" },
    h("div", { class: "visita-cabeca" }, contador, fechar),
    titulo,
    texto,
    h("div", { class: "visita-acoes" }, voltar, seguir),
  );
  const alvo = () => document.querySelector<HTMLElement>(`[data-visita-passo="${atual + 1}"]`);
  const limpar = () => document.querySelectorAll("[data-visita-alvo]").forEach((e) => e.removeAttribute("data-visita-alvo"));
  const sair = () => {
    limpar();
    cartao.remove();
    document.removeEventListener("keydown", teclas);
  };
  const mostrar = () => {
    limpar();
    const passo = passos[atual];
    if (!passo) return;
    titulo.textContent = passo.titulo;
    texto.textContent = passo.texto;
    contador.textContent = `${atual + 1} de ${passos.length}`;
    voltar.disabled = atual === 0;
    seguir.textContent = atual === passos.length - 1 ? "Concluir" : "Próximo";
    const el = alvo();
    if (el) {
      el.setAttribute("data-visita-alvo", "");
      el.scrollIntoView({ block: "start", behavior: calmo ? "auto" : "smooth" });
    }
  };
  function teclas(evento: KeyboardEvent): void {
    if (evento.key === "Escape") sair();
    else if (evento.key === "ArrowRight" && atual < passos.length - 1) {
      atual += 1;
      mostrar();
    } else if (evento.key === "ArrowLeft" && atual > 0) {
      atual -= 1;
      mostrar();
    }
  }
  voltar.addEventListener("click", () => {
    atual = Math.max(0, atual - 1);
    mostrar();
  });
  seguir.addEventListener("click", () => {
    if (atual === passos.length - 1) return sair();
    atual += 1;
    mostrar();
  });
  fechar.addEventListener("click", sair);
  document.addEventListener("keydown", teclas);
  document.body.append(cartao);
  mostrar();
  seguir.focus();
}
