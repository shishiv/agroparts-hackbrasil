import { afterEach, describe, expect, it } from "vitest";
import { patrimonioDoCaminho } from "../equipamento/carregar";
import { montarInicio } from "./inicio";

const montados: HTMLElement[] = [];

afterEach(() => {
  for (const raiz of montados.splice(0)) raiz.remove();
});

function abrir() {
  const raiz = document.createElement("main");
  document.body.append(raiz);
  montados.push(raiz);
  const destinos: string[] = [];
  montarInicio(raiz, (endereco) => destinos.push(endereco));
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
