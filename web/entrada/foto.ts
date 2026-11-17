import { PECA_IDENTIFICADA, type PecaIdentificada } from "../../src/contrato";
import {
  FotoNaoLida,
  identificarPeca,
  ladosReduzidos,
  lerFoto,
  QUALIDADE_DO_JPEG,
  type Buscar,
  type FalhaDaFoto,
  type TextoDaFoto,
} from "../../src/entrada/foto";
import { h } from "../inicio/dom";
import "./foto.css";
import type { ModuloDeEntrada } from "./index";

const MENSAGEM: Readonly<Record<FalhaDaFoto | "foto-ilegivel", string>> = {
  "foto-ilegivel": "Não consegui abrir esta foto.",
  limite: "Limite da demo atingido. Tente em um minuto.",
  indisponivel: "A leitura de foto está indisponível agora.",
};

export interface Ambiente {
  buscar: Buscar;
  reduzir: (foto: Blob) => Promise<Blob>;
  publicar: (detalhe: PecaIdentificada) => void;
}

/** A foto do celular, no máximo 1600 px no lado maior, em JPEG, com a rotação do EXIF já aplicada. */
export async function reduzirParaJpeg(foto: Blob): Promise<Blob> {
  const imagem = await createImageBitmap(foto, { imageOrientation: "from-image" });
  const { largura, altura } = ladosReduzidos(imagem.width, imagem.height);
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const contexto = tela.getContext("2d");
  if (!contexto) throw new Error("o navegador não desenha em canvas");
  contexto.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();
  return new Promise((resolver, recusar) =>
    tela.toBlob((jpeg) => (jpeg ? resolver(jpeg) : recusar(new Error("o navegador não gerou o JPEG"))), "image/jpeg", QUALIDADE_DO_JPEG),
  );
}

export const publicarNaJanela = (detalhe: PecaIdentificada): void => {
  window.dispatchEvent(new CustomEvent(PECA_IDENTIFICADA, { detail: detalhe }));
};

const ambienteDaPagina = (): Ambiente => ({
  buscar: (endereco, pedido) => fetch(endereco, pedido),
  reduzir: reduzirParaJpeg,
  publicar: publicarNaJanela,
});

export function criarEntradaDeFoto(ambiente: () => Ambiente): ModuloDeEntrada {
  return {
    id: "foto",
    montar(destino) {
      const { buscar, reduzir, publicar } = ambiente();
      const secao = h("section", { class: "entrada-foto" });
      const arquivo = h("input", { type: "file", accept: "image/*", capture: "environment", hidden: true });
      const botao = h("button", { type: "button" }, "Achar peça por foto");

      const pronta = (aviso?: string): void => {
        secao.dataset.estado = aviso ? "erro" : "pronta";
        secao.replaceChildren(botao, arquivo, ...(aviso ? [h("p", { role: "alert" }, aviso)] : []));
      };

      const conferir = (lido: TextoDaFoto): void => {
        const campo = h("textarea", { id: "foto-lida", name: "texto-lido", rows: "4", spellcheck: "false" });
        campo.value = lido.texto;
        const formulario = h(
          "form",
          {},
          h("label", { for: "foto-lida" }, "O que li na foto"),
          campo,
          h("div", { class: "entrada-acoes" }, h("button", { type: "submit" }, "Confirmar"), descartar()),
        );
        formulario.addEventListener("submit", (evento) => {
          evento.preventDefault();
          publicar(identificarPeca(campo.value, lido));
          pronta();
        });
        secao.dataset.estado = "conferindo";
        secao.replaceChildren(formulario);
        campo.focus();
      };

      const descartar = (): HTMLButtonElement => {
        const sair = h("button", { type: "button", class: "secundario" }, "Descartar");
        sair.addEventListener("click", () => pronta());
        return sair;
      };

      async function ler(foto: File): Promise<void> {
        secao.dataset.estado = "lendo";
        secao.replaceChildren(h("p", { "aria-busy": "true", role: "status" }, "Lendo…"));
        let jpeg: Blob;
        try {
          jpeg = await reduzir(foto);
        } catch {
          return pronta(MENSAGEM["foto-ilegivel"]);
        }
        try {
          conferir(await lerFoto(jpeg, buscar));
        } catch (erro) {
          pronta(MENSAGEM[erro instanceof FotoNaoLida ? erro.falha : "indisponivel"]);
        }
      }

      botao.addEventListener("click", () => arquivo.click());
      arquivo.addEventListener("change", () => {
        const foto = arquivo.files?.[0];
        arquivo.value = "";
        if (foto) void ler(foto);
      });

      pronta();
      destino.append(secao);
    },
  };
}

export const entradaDeFoto = criarEntradaDeFoto(ambienteDaPagina);
