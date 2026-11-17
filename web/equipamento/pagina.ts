import { PECA_IDENTIFICADA, type PecaIdentificada } from "../../src/contrato";
import type { IndiceDeGrupos, PaginaCarregada } from "../../src/historico";
import { campoDeNumero, type Ir } from "../inicio/casca";
import { h, type Filho } from "../inicio/dom";
import { carregarIndice, carregarPagina, type Buscar } from "./carregar";
import { blocoDeSaldo, desenharHistorico } from "./desenhar";

export interface Ambiente {
  buscar: Buscar;
  ir: Ir;
  /** Onde o evento `agroparts:peca-identificada` chega: a janela, na página de verdade. */
  escutar: EventTarget;
}

const estado = (nome: string, ...filhos: Filho[]): HTMLElement => h("section", { class: "estado", "data-estado": nome }, ...filhos);

const carregando = (): HTMLElement => estado("carregando", h("p", { "aria-busy": "true" }, "Carregando…"));

const desconhecido = (digitado: string, ir: Ir): HTMLElement =>
  estado(
    "desconhecido",
    h("h1", {}, "Patrimônio desconhecido"),
    h("p", {}, digitado === "" ? "Nenhuma máquina nesta página." : `Não há máquina com o número ${digitado}.`),
    campoDeNumero(ir),
  );

const falhou = (tentarDeNovo: () => void): HTMLElement => {
  const botao = h("button", { type: "button" }, "Tentar de novo");
  botao.addEventListener("click", tentarDeNovo);
  return estado("erro", h("p", {}, "Não consegui carregar o histórico desta máquina."), botao);
};

function aviso(tipo: string, ...filhos: Filho[]): HTMLElement {
  return h("div", { class: "aviso", "data-aviso": tipo }, ...filhos);
}

function destacar(raiz: HTMLElement, chave: string): HTMLElement | null {
  let achada: HTMLElement | null = null;
  for (const peca of raiz.querySelectorAll<HTMLElement>("[data-peca]")) {
    const ela = peca.dataset.peca === chave;
    peca.classList.toggle("destaque", ela);
    if (ela) achada = peca;
  }
  return achada;
}

/** Desenha a página de `/e/<patrimônio>` em `raiz` e devolve quando o primeiro desenho terminou. */
export async function montarEquipamento(raiz: HTMLElement, digitado: string, ambiente: Ambiente): Promise<void> {
  let indice: Promise<IndiceDeGrupos> | undefined;
  let pronta = false;

  const avisos = (): HTMLElement | null => raiz.querySelector<HTMLElement>("#avisos");

  async function identificar({ leitura }: PecaIdentificada): Promise<void> {
    const painel = avisos();
    if (!pronta || !painel) return;
    if (leitura.decisao !== "resolve") {
      painel.replaceChildren(aviso("sem-chave", "Não deu para identificar a peça."));
      return;
    }
    const naMaquina = destacar(raiz, leitura.chave);
    if (naMaquina) {
      naMaquina.querySelector("details")?.setAttribute("open", "");
      naMaquina.scrollIntoView({ block: "center" });
      painel.replaceChildren(aviso("nesta-maquina", `Peça desta máquina: ${leitura.rotulo}`));
      return;
    }
    try {
      indice ??= carregarIndice(ambiente.buscar);
      const entrada = (await indice).grupos.find((g) => g.chave === leitura.chave);
      painel.replaceChildren(
        entrada
          ? aviso(
              "outra-maquina",
              h("p", {}, `Esta máquina nunca trocou ${entrada.rotulo}.`),
              blocoDeSaldo(
                "outro",
                "No almoxarifado",
                entrada.saldo.filter((s) => s.quantidade > 0),
              ),
            )
          : aviso("desconhecida", "Esta peça não está no cadastro."),
      );
    } catch {
      indice = undefined;
      painel.replaceChildren(aviso("erro", "Não consegui consultar o almoxarifado."));
    }
  }

  ambiente.escutar.addEventListener(
    PECA_IDENTIFICADA,
    (evento) => {
      if (evento instanceof CustomEvent) void identificar(evento.detail);
    },
    { capture: true },
  );

  async function carregar(): Promise<void> {
    raiz.replaceChildren(carregando());
    let pagina: PaginaCarregada;
    try {
      pagina = await carregarPagina(digitado, ambiente.buscar);
    } catch {
      raiz.replaceChildren(falhou(() => void carregar()));
      return;
    }
    if (pagina.tipo === "patrimonio-desconhecido") {
      raiz.replaceChildren(desconhecido(pagina.digitado, ambiente.ir));
      return;
    }
    pronta = true;
    const { equipamento } = pagina.historico;
    raiz.ownerDocument.title = `${equipamento.nome} ${equipamento.tag} · AgroParts`;
    raiz.replaceChildren(...desenharHistorico(pagina).filter((f): f is Node | string => Boolean(f)));
  }

  await carregar();
}
