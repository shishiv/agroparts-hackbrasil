import { PECA_IDENTIFICADA, type PecaIdentificada } from "../../src/contrato";
import type { IndiceDeGrupos, PaginaCarregada } from "../../src/historico";
import type { ModuloDeEntrada } from "../entrada";
import { campoDeNumero, type Ir } from "../inicio/casca";
import { h, type Filho } from "../inicio/dom";
import { carregarIndice, carregarPagina, type Buscar } from "./carregar";
import { blocoDeSaldo, desenharHistorico, naoIdentificada } from "./desenhar";

export interface Ambiente {
  buscar: Buscar;
  ir: Ir;
  /** Onde o evento `agroparts:peca-identificada` chega: a janela, na página de verdade. */
  escutar: EventTarget;
  /** Os botões que viram texto a peça (foto, áudio). A página os monta quando a máquina existe. */
  entradas: readonly ModuloDeEntrada[];
}

const estado = (nome: string, ...filhos: Filho[]): HTMLElement => h("section", { class: "estado", "data-estado": nome }, ...filhos);

const carregando = (): HTMLElement => estado("carregando", h("p", { "aria-busy": "true" }, "Carregando…"));

const desconhecido = (digitado: string, ir: Ir): HTMLElement =>
  estado(
    "desconhecido",
    h("h1", {}, "Máquina não encontrada"),
    h("p", {}, digitado === "" ? "Nenhuma máquina nesta página." : `Não encontramos a máquina ${digitado}. Confira o número da placa e tente de novo.`),
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

  async function identificar(peca: PecaIdentificada): Promise<void> {
    const { leitura } = peca;
    const painel = avisos();
    if (!pronta || !painel) return;
    if (leitura.decisao !== "resolve") {
      painel.replaceChildren(aviso("sem-chave", ...naoIdentificada(peca)));
      return;
    }
    const naMaquina = destacar(raiz, leitura.chave);
    if (naMaquina) {
      naMaquina.querySelector("details")?.setAttribute("open", "");
      naMaquina.scrollIntoView({ block: "start" });
      painel.replaceChildren(aviso("nesta-maquina", `Peça identificada: ${leitura.rotulo}`));
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
    const destino = raiz.querySelector<HTMLElement>("#entradas");
    if (destino) for (const entrada of ambiente.entradas) entrada.montar(destino);
  }

  await carregar();
}
