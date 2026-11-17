import { PECA_IDENTIFICADA, type PecaIdentificada } from "../../src/contrato";
import {
  GRAVACAO_MAXIMA_MS,
  escolherFormato,
  identificarPeca,
  textoParaConferir,
  transcrever,
  type Buscar,
  type FalhaDaTranscricao,
  type Transcricao,
} from "../../src/entrada/audio";
import { h } from "../inicio/dom";
import "./audio.css";
import type { ModuloDeEntrada } from "./index";

export interface AmbienteDoAudio {
  microfone(): Promise<MediaStream>;
  buscar: Buscar;
  gravacaoMaximaMs: number;
}

const ambienteDoNavegador: AmbienteDoAudio = {
  microfone: () => navigator.mediaDevices.getUserMedia({ audio: true }),
  buscar: (endereco, requisicao) => fetch(endereco, requisicao),
  gravacaoMaximaMs: GRAVACAO_MAXIMA_MS,
};

type Motivo = FalhaDaTranscricao | "microfone" | "sem-gravacao";

type Estado =
  | { tipo: "parado" }
  | { tipo: "gravando"; parar: () => void }
  | { tipo: "transcrevendo" }
  | { tipo: "conferindo"; transcricao: Transcricao }
  | { tipo: "falhou"; motivo: Motivo; gravacao: Blob | null };

const MENSAGEM: Readonly<Record<Motivo, string>> = {
  microfone: "Não consegui usar o microfone.",
  "sem-gravacao": "Não gravei nada.",
  "sem-fala": "Não ouvi nada.",
  limite: "Limite da demo atingido. Tente em um minuto.",
  formato: "Este navegador grava num formato que a demo não lê.",
  "grande-demais": "A gravação ficou grande demais.",
  indisponivel: "A transcrição de áudio está indisponível agora.",
};

/** Monta o botão de áudio em `destino`. Ao confirmar, dispara `agroparts:peca-identificada` a partir de `destino`. */
export function montarAudio(destino: HTMLElement, ambiente: AmbienteDoAudio): void {
  const secao = h("section", { class: "entrada-audio", "aria-live": "polite" });
  destino.append(secao);

  const botao = (texto: string, aoClicar: () => void, classe?: string): HTMLButtonElement => {
    const b = h("button", { type: "button", class: classe }, texto);
    b.addEventListener("click", aoClicar);
    return b;
  };

  function conferir(transcricao: Transcricao): HTMLElement {
    const campo = h("input", {
      id: "audio-ouvido",
      type: "text",
      enterkeyhint: "done",
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false",
      required: true,
    });
    campo.value = textoParaConferir(transcricao);
    const formulario = h(
      "form",
      { class: "conferir" },
      h("label", { for: "audio-ouvido" }, "O que ouvi"),
      campo,
      h("div", { class: "acoes" }, h("button", { type: "submit" }, "Confirmar"), botao("Falar de novo", () => void gravar(), "secundario")),
    );
    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();
      const texto = campo.value.trim();
      if (texto === "") return;
      destino.dispatchEvent(new CustomEvent<PecaIdentificada>(PECA_IDENTIFICADA, { detail: identificarPeca(transcricao, texto, true), bubbles: true }));
      ir({ tipo: "parado" });
    });
    return formulario;
  }

  function desenhar(estado: Estado): HTMLElement[] {
    switch (estado.tipo) {
      case "parado":
        return [botao("Achar peça por voz", () => void gravar())];
      case "gravando":
        return [botao("Parar", estado.parar, "gravando")];
      case "transcrevendo":
        return [h("p", { "aria-busy": "true" }, "Transcrevendo…")];
      case "conferindo":
        return [conferir(estado.transcricao)];
      case "falhou": {
        const { gravacao, motivo } = estado;
        const reenviar = gravacao !== null && (motivo === "limite" || motivo === "indisponivel");
        return [h("p", {}, MENSAGEM[motivo]), botao("Tentar de novo", () => void (reenviar ? enviar(gravacao) : gravar()))];
      }
    }
  }

  const ir = (estado: Estado): void => secao.replaceChildren(...desenhar(estado));

  async function enviar(gravacao: Blob): Promise<void> {
    if (gravacao.size === 0) return ir({ tipo: "falhou", motivo: "sem-gravacao", gravacao: null });
    ir({ tipo: "transcrevendo" });
    const resultado = await transcrever(gravacao, ambiente.buscar);
    ir(resultado.ok ? { tipo: "conferindo", transcricao: resultado.transcricao } : { tipo: "falhou", motivo: resultado.falha, gravacao });
  }

  async function gravar(): Promise<void> {
    let fluxo: MediaStream;
    let gravador: MediaRecorder;
    try {
      fluxo = await ambiente.microfone();
      const formato = escolherFormato((tipo) => MediaRecorder.isTypeSupported(tipo));
      gravador = new MediaRecorder(fluxo, formato ? { mimeType: formato } : {});
    } catch {
      return ir({ tipo: "falhou", motivo: "microfone", gravacao: null });
    }
    const pedacos: Blob[] = [];
    const limite = setTimeout(() => {
      if (gravador.state === "recording") gravador.stop();
    }, ambiente.gravacaoMaximaMs);
    gravador.addEventListener("dataavailable", (evento) => pedacos.push(evento.data));
    gravador.addEventListener("stop", () => {
      clearTimeout(limite);
      for (const faixa of fluxo.getTracks()) faixa.stop();
      void enviar(new Blob(pedacos, { type: gravador.mimeType }));
    });
    gravador.start();
    ir({ tipo: "gravando", parar: () => gravador.stop() });
  }

  ir({ tipo: "parado" });
}

export const entradaDeAudio: ModuloDeEntrada = {
  id: "audio",
  montar: (destino) => montarAudio(destino, ambienteDoNavegador),
};
