import { afterEach, describe, expect, it, vi } from "vitest";
import { patrimonioDoCaminho } from "../equipamento/carregar";
import { montarInicio } from "./inicio";
import { PLACAS_DA_DEMO } from "./placa";
import { AVISO_DA_DEMONSTRACAO, type Tempos } from "./toque";

const montados: HTMLElement[] = [];

afterEach(() => {
  for (const raiz of montados.splice(0)) raiz.remove();
});

const RAPIDO: Tempos = { lendoMs: 40, lidaMs: 40 };

function abrir(tempos: Tempos = RAPIDO) {
  const raiz = document.createElement("main");
  document.body.append(raiz);
  montados.push(raiz);
  const destinos: string[] = [];
  montarInicio(raiz, (endereco) => destinos.push(endereco), tempos);
  const campo = raiz.querySelector<HTMLInputElement>("input");
  const formulario = raiz.querySelector("form");
  if (!campo || !formulario) throw new Error("a página inicial precisa de um campo dentro de um formulário");
  return {
    raiz,
    destinos,
    enviar(digitado: string) {
      campo.value = digitado;
      formulario.requestSubmit();
    },
  };
}

describe("o campo de número de patrimônio da página inicial", () => {
  it("tem um campo com rótulo e um botão que envia", () => {
    const { raiz } = abrir();
    const campo = raiz.querySelector("input");
    expect(raiz.querySelector(`label[for="${campo?.id}"]`)).not.toBeNull();
    expect(raiz.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it("leva ao endereço que a tag da placa grava", () => {
    const { destinos, enviar } = abrir();
    enviar("004512");
    expect(destinos).toEqual(["/e/004512"]);
  });

  it("ignora os espaços de quem digita antes e depois do número", () => {
    const { destinos, enviar } = abrir();
    enviar("  004512 ");
    expect(destinos).toEqual(["/e/004512"]);
  });

  it("não vai a lugar nenhum com o campo vazio ou só com espaços", () => {
    const { destinos, enviar } = abrir();
    enviar("");
    enviar("   ");
    expect(destinos).toEqual([]);
  });

  it("o que a página inicial manda, a página do equipamento lê de volta igual", () => {
    const { destinos, enviar } = abrir();
    for (const digitado of ["004512", "B-77", "a b", "a/b", "x?y#z", "100%"]) enviar(digitado);
    expect(destinos.map(patrimonioDoCaminho)).toEqual(["004512", "B-77", "a b", "a/b", "x?y#z", "100%"]);
  });
});

describe("a placa simulada, só para demonstração", () => {
  const placa = (raiz: HTMLElement, patrimonio: string) => {
    const botao = raiz.querySelector<HTMLButtonElement>(`button[data-patrimonio="${patrimonio}"]`);
    if (!botao) throw new Error(`a página inicial não tem a placa ${patrimonio}`);
    return botao;
  };

  it("desenha a placa de cada máquina da demo, com o número gravado e a marca NFC", () => {
    const { raiz } = abrir();
    const botoes = [...raiz.querySelectorAll<HTMLButtonElement>("button[data-patrimonio]")];
    expect(botoes.map((b) => b.dataset.patrimonio)).toEqual([...PLACAS_DA_DEMO]);
    for (const botao of botoes) {
      const desenho = botao.querySelector("svg");
      expect(desenho?.textContent).toContain(botao.dataset.patrimonio);
      expect(desenho?.textContent?.split(botao.dataset.patrimonio ?? "")).toHaveLength(2);
      expect(desenho?.textContent).toContain("NFC");
      expect(desenho?.querySelector("image")).toBeNull();
    }
    expect(placa(raiz, "004512").textContent).toContain("Bomba de caldo B-104");
  });

  it("diz na tela que é uma demonstração que simula a tag", () => {
    const { raiz } = abrir();
    expect(AVISO_DA_DEMONSTRACAO).toBe("Demonstração: o toque do celular na placa é simulado");
    expect(raiz.querySelector(".aviso-demo")?.textContent).toBe(AVISO_DA_DEMONSTRACAO);
  });

  it("tocar na placa mostra a leitura e só depois abre o endereço que a tag gravaria", async () => {
    const { raiz, destinos } = abrir();
    const botao = placa(raiz, "004512");
    botao.click();
    expect(botao.hasAttribute("data-lendo")).toBe(true);
    expect(botao.textContent).toContain("Lendo a placa (simulada)");
    expect(destinos).toEqual([]);

    await vi.waitFor(() => expect(botao.textContent).toContain("Placa lida (simulada): abrindo a máquina 004512"));
    expect(destinos).toEqual([]);
    await vi.waitFor(() => expect(destinos).toEqual(["/e/004512"]));
  });

  it("o toque abre o mesmo endereço que o número digitado", async () => {
    const { raiz, destinos, enviar } = abrir();
    for (const patrimonio of PLACAS_DA_DEMO) {
      enviar(patrimonio);
      const digitado = destinos.pop();
      placa(raiz, patrimonio).click();
      await vi.waitFor(() => expect(destinos).toEqual([digitado]));
      destinos.length = 0;
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    }
  });

  it("um segundo toque durante a leitura não abre a página duas vezes", async () => {
    const { raiz, destinos } = abrir();
    placa(raiz, "004512").click();
    placa(raiz, "004504").click();
    placa(raiz, "004512").click();
    await vi.waitFor(() => expect(destinos).toEqual(["/e/004512"]));
    await new Promise((resolver) => setTimeout(resolver, 150));
    expect(destinos).toEqual(["/e/004512"]);
  });

  it("voltar pelo histórico do navegador devolve a placa pronta para outro toque", async () => {
    const { raiz, destinos } = abrir();
    const botao = placa(raiz, "004512");
    botao.click();
    await vi.waitFor(() => expect(destinos).toEqual(["/e/004512"]));

    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    expect(botao.hasAttribute("data-lendo")).toBe(false);
    expect(botao.textContent).toContain("Bomba de caldo B-104");

    botao.click();
    await vi.waitFor(() => expect(destinos).toEqual(["/e/004512", "/e/004512"]));
  });

  it("o campo de número continua no lugar e sem mudança, antes das placas", () => {
    const { raiz } = abrir();
    const filhos = [...raiz.children].map((f) => f.tagName.toLowerCase());
    expect(filhos).toEqual(["h1", "form", "section"]);
  });
});
