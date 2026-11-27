import type { Equipamento } from "../../src/contrato";
import { enderecoDoEquipamento, type Ir } from "./casca";
import { h } from "./dom";
import { desenharPlaca, placasDaDemo } from "./placa";

export const AVISO_DA_DEMONSTRACAO = "Demonstração: o toque do celular na placa é simulado";

export interface Tempos {
  /** Quanto a tela mostra "lendo", antes de a tag responder. */
  lendoMs: number;
  /** Quanto a tela mostra "tag lida", antes de abrir a página. */
  lidaMs: number;
}

export const TEMPOS_DO_TOQUE: Tempos = { lendoMs: 600, lidaMs: 500 };

type Estado = "parado" | "lendo" | "lida";

/** A legenda da placa: o nome da máquina, a tag dela ao lado e o setor embaixo. */
const legendaDe = (equipamento: Equipamento): Node[] => [
  h("span", { class: "nome" }, equipamento.nome),
  document.createTextNode(" "),
  h("span", { class: "tag" }, equipamento.tag),
  h("br"),
  h("span", { class: "setor" }, `setor ${equipamento.area}`),
];

/**
 * A simulação do toque na tag NFC: cada placa é um botão. Tocar nela mostra a leitura e abre
 * o mesmo endereço que a tag gravaria. Nada aqui lê uma tag de verdade nem usa Web NFC.
 */
export function montarToque(ir: Ir, tempos: Tempos = TEMPOS_DO_TOQUE): HTMLElement {
  const secao = h("section", { class: "toque", "data-estado": "parado" });
  const mudar = (estado: Estado) => secao.setAttribute("data-estado", estado);
  const estado = () => secao.getAttribute("data-estado");

  const placas = placasDaDemo().map((equipamento, ordem) => {
    const legenda = h("span", { class: "legenda", role: "status" }, ...legendaDe(equipamento));
    const botao = h(
      "button",
      { type: "button", class: "placa-toque", "data-patrimonio": equipamento.patrimonio, style: `--ordem: ${ordem}` },
      desenharPlaca(equipamento.patrimonio),
      legenda,
    );
    // O brilho do alumínio acompanha o ponteiro: a placa parece um objeto, não uma figura.
    botao.addEventListener("pointermove", (evento) => {
      const caixa = botao.getBoundingClientRect();
      botao.style.setProperty("--luz-x", `${(((evento.clientX - caixa.left) / caixa.width) * 100).toFixed(1)}%`);
      botao.style.setProperty("--luz-y", `${(((evento.clientY - caixa.top) / caixa.height) * 100).toFixed(1)}%`);
    });
    botao.addEventListener("click", () => {
      if (estado() !== "parado") return;
      const endereco = enderecoDoEquipamento(equipamento.patrimonio);
      botao.setAttribute("data-lendo", "");
      mudar("lendo");
      legenda.textContent = "Lendo a placa (simulada)…";
      setTimeout(() => {
        mudar("lida");
        legenda.textContent = `Placa lida (simulada): abrindo a máquina ${equipamento.patrimonio}`;
        setTimeout(() => ir(endereco), tempos.lidaMs);
      }, tempos.lendoMs);
    });
    const voltar = () => {
      botao.removeAttribute("data-lendo");
      legenda.replaceChildren(...legendaDe(equipamento));
    };
    return { botao, voltar };
  });

  // Voltar pelo histórico do navegador devolve a página como estava; a placa tem de estar pronta de novo.
  window.addEventListener("pageshow", (evento) => {
    if (!evento.persisted) return;
    for (const { voltar } of placas) voltar();
    mudar("parado");
  });

  secao.append(
    h("h2", {}, "Ou toque numa placa"),
    h("p", { class: "aviso-demo" }, AVISO_DA_DEMONSTRACAO),
    ...placas.map(({ botao }) => botao),
  );
  return secao;
}
