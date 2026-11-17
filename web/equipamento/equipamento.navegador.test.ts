import { afterEach, describe, expect, it } from "vitest";
import { PECA_IDENTIFICADA, type Leitura, type PecaIdentificada } from "../../src/contrato";
import { lerChave, lerFamilia } from "../../src/exportacao/valores";
import { indiceDeGrupos } from "../../src/historico";
import { montarInicio } from "../inicio/inicio";
import { patrimonioDoCaminho } from "./carregar";
import { exportacaoDaDemo, servidorDaDemo, unificacaoDaDemo } from "./demo-de-teste";
import { montarEquipamento } from "./pagina";

const montados: HTMLElement[] = [];

function novaRaiz(): HTMLElement {
  const raiz = document.createElement("main");
  document.body.append(raiz);
  montados.push(raiz);
  return raiz;
}

afterEach(() => {
  for (const raiz of montados.splice(0)) raiz.remove();
});

async function abrir(patrimonio: string, servidor = servidorDaDemo()) {
  const raiz = novaRaiz();
  const sinal = new EventTarget();
  await montarEquipamento(raiz, patrimonio, { buscar: servidor.buscar, ir: () => undefined, escutar: sinal });
  return { raiz, servidor, sinal };
}

const pecasDe = (raiz: HTMLElement) => [...raiz.querySelectorAll<HTMLElement>("[data-peca]")];

function leituraQueResolve(chave: string): Leitura {
  const grupo = unificacaoDaDemo.grupos.get(chaveDe(chave));
  if (!grupo) throw new Error("grupo fora da demo");
  return { decisao: "resolve", familia: grupo.familia, chave: grupo.chave, rotulo: grupo.rotulo, atributos: [] };
}

const chaveDe = (texto: string) => {
  const lida = lerChave(texto);
  if (!lida.ok) throw new Error(lida.problema);
  return lida.valor;
};

function identificar(sinal: EventTarget, leitura: Leitura): void {
  const detalhe: PecaIdentificada = { leitura, origem: { tipo: "digitado" } };
  sinal.dispatchEvent(new CustomEvent(PECA_IDENTIFICADA, { detail: detalhe }));
}

const depoisDoAviso = () => new Promise((resolver) => setTimeout(resolver, 20));

describe("a página mostra a conta que se faz à mão", () => {
  it("004512: cada peça traz as trocas, a soma e a última troca do grupo", async () => {
    const { raiz } = await abrir("004512");
    expect(pecasDe(raiz).map((p) => [p.dataset.trocas, p.dataset.total, p.dataset.ultima, p.dataset.codigos])).toEqual([
      ["12", "22", "2026-07-23", "2"],
      ["11", "22", "2026-06-17", "3"],
    ]);
  });

  it("004504: a peça com unidades diferentes não mostra soma", async () => {
    const { raiz } = await abrir("004504");
    const mista = pecasDe(raiz).find((p) => p.querySelector('[data-codigo="10186"]'));
    expect(mista?.dataset.trocas).toBe("15");
    expect(mista?.dataset.total).toBeUndefined();
  });

  it("004540: duas peças somadas e dois códigos sem chave sem nenhuma soma", async () => {
    const { raiz } = await abrir("004540");
    expect(pecasDe(raiz).map((p) => [p.dataset.trocas, p.dataset.total])).toEqual([
      ["18", "34"],
      ["13", "25"],
    ]);
    const semChave = [...raiz.querySelectorAll<HTMLElement>(".sem-chave")];
    expect(semChave.map((c) => [c.dataset.codigo, c.dataset.trocas])).toEqual([
      ["10241", "15"],
      ["10282", "1"],
    ]);
    expect(semChave.every((c) => c.dataset.total === undefined)).toBe(true);
  });

  it("mostra o texto original de cada código, o que a máquina usou e o que nunca usou", async () => {
    const { raiz } = await abrir("004512");
    const doCadastro = new Map<string, string>(exportacaoDaDemo.materiais.map((m) => [m.codigo, m.descricao]));
    const codigos = [...raiz.querySelectorAll<HTMLElement>(".peca .codigos [data-codigo]")];
    expect(codigos.map((c) => c.dataset.codigo).sort()).toEqual(["10059", "10066", "10071", "10091", "10158", "10165", "10261"]);
    for (const item of codigos) {
      expect(item.querySelector(".original")?.textContent).toBe(doCadastro.get(item.dataset.codigo ?? ""));
    }
    const nunca = codigos.filter((c) => c.dataset.usadoAqui === "nao").map((c) => c.dataset.codigo);
    expect(nunca).toEqual(["10059", "10158"]);
  });

  it("marca no texto original exatamente o que o motor leu, trecho por trecho", async () => {
    const { raiz } = await abrir("004512");
    let conferidos = 0;
    for (const item of raiz.querySelectorAll<HTMLElement>(".peca .codigos [data-codigo]")) {
      const material = exportacaoDaDemo.materiais.find((m) => m.codigo === item.dataset.codigo);
      if (!material) throw new Error(`código ${item.dataset.codigo} fora do cadastro`);
      const esperado = (unificacaoDaDemo.leituras.get(material.codigo)?.atributos ?? [])
        .filter((a) => a.trecho.inicio < a.trecho.fim)
        .toSorted((a, b) => a.trecho.inicio - b.trecho.inicio)
        .map((a) => material.descricao.slice(a.trecho.inicio, a.trecho.fim));
      const marcado = [...item.querySelectorAll("mark")].map((m) => m.textContent);
      expect(marcado).toEqual(esperado);
      conferidos += marcado.length;
    }
    expect(conferidos).toBeGreaterThan(5);
  });

  it("004512: a folga que o texto escreve aparece com o valor lido, junto da série e da vedação", async () => {
    const { raiz } = await abrir("004512");
    const doCodigo = (codigo: string) =>
      [...raiz.querySelectorAll(`.peca .codigos [data-codigo="${codigo}"] [data-atributo]`)].map((a) => a.textContent);
    expect(doCodigo("10066")).toEqual(["série 6309", "vedação ZZ", "folga C3"]);
    expect(doCodigo("10091")).toEqual(["série 6312", "vedação ZZ", "folga C3"]);
  });

  it("004540: a folga normal, que o texto não escreve, aparece dita em palavras e não marca trecho nenhum", async () => {
    const { raiz } = await abrir("004540");
    const codigos = [...raiz.querySelectorAll<HTMLElement>(".peca .codigos [data-codigo]")];
    expect(codigos.map((c) => c.dataset.codigo).sort()).toEqual(["10076", "10131", "10176", "10251"]);
    for (const item of codigos) {
      const folga = item.querySelector('[data-atributo="folga"]');
      expect(folga?.textContent, item.dataset.codigo).toBe("folga normal (não escrita no texto)");
      expect([...item.querySelectorAll("mark")].every((m) => m.textContent !== ""), item.dataset.codigo).toBe(true);
    }
  });

  it("mostra, separado, o saldo sob outro código e deixa de fora o saldo zerado", async () => {
    const { raiz } = await abrir("004512");
    const [primeira, segunda] = pecasDe(raiz);
    const sob = (peca: HTMLElement | undefined) =>
      [...(peca?.querySelectorAll<HTMLElement>('[data-estoque="outro"] li') ?? [])].map((l) => [l.dataset.codigo, l.dataset.saldo]);
    const aqui = (peca: HTMLElement | undefined) =>
      [...(peca?.querySelectorAll<HTMLElement>('[data-estoque="aqui"] li') ?? [])].map((l) => [l.dataset.codigo, l.dataset.saldo]);
    expect(sob(primeira)).toEqual([["10059", "3"]]);
    expect(aqui(primeira)).toEqual([
      ["10066", undefined],
      ["10165", undefined],
    ]);
    expect(sob(segunda)).toEqual([["10158", "4"]]);
    expect(aqui(segunda)).toEqual([
      ["10071", "0"],
      ["10091", "2"],
      ["10261", "0"],
    ]);
  });

  it("explica por que um código sem chave ficou fora da soma", async () => {
    const { raiz } = await abrir("004512");
    const decisoes = new Map([...raiz.querySelectorAll<HTMLElement>(".sem-chave")].map((c) => [c.dataset.codigo, c.dataset.decisao]));
    expect(decisoes).toEqual(
      new Map([
        ["10241", "recusa"],
        ["10041", "revisa"],
        ["10203", "revisa"],
        ["10012", "revisa"],
      ]),
    );
    for (const motivo of raiz.querySelectorAll(".sem-chave .motivo")) expect(motivo.textContent?.length).toBeGreaterThan(0);
  });

  it("não troca nenhum texto do cadastro por HTML: um texto com marcação aparece como texto", async () => {
    const { raiz } = await abrir("004512");
    expect(raiz.querySelector("script, img, iframe")).toBeNull();
  });
});

describe("a página baixa só o JSON da própria máquina", () => {
  it("pede um endereço, o da máquina, e nenhum outro", async () => {
    const { servidor } = await abrir("004512");
    expect(servidor.pedidos).toEqual(["/maquinas/004512.json"]);
  });

  it("o endereço da máquina fica fora de /e/", async () => {
    const { servidor } = await abrir("004540");
    expect(servidor.pedidos.every((p) => !p.startsWith("/e/"))).toBe(true);
  });
});

describe("patrimônio desconhecido", () => {
  it("um número bem escrito que não existe mostra o aviso e o campo para tentar outro", async () => {
    const { raiz, servidor } = await abrir("999999");
    expect(raiz.querySelector('[data-estado="desconhecido"]')?.textContent).toContain("999999");
    expect(raiz.querySelector("form input")).not.toBeNull();
    expect(pecasDe(raiz)).toEqual([]);
    expect(servidor.pedidos).toEqual(["/maquinas/999999.json"]);
  });

  it("um texto que nunca seria um patrimônio nem sai para a rede", async () => {
    const { raiz, servidor } = await abrir("../../etc/passwd");
    expect(raiz.querySelector('[data-estado="desconhecido"]')).not.toBeNull();
    expect(servidor.pedidos).toEqual([]);
  });

  it("o campo do aviso leva ao patrimônio digitado", async () => {
    const raiz = novaRaiz();
    const destinos: string[] = [];
    await montarEquipamento(raiz, "999999", { buscar: servidorDaDemo().buscar, ir: (e) => destinos.push(e), escutar: new EventTarget() });
    const campo = raiz.querySelector<HTMLInputElement>("form input");
    if (!campo) throw new Error("sem campo");
    campo.value = "004512";
    raiz.querySelector("form")?.requestSubmit();
    expect(destinos).toEqual(["/e/004512"]);
  });

  it("o caminho sem número também cai no aviso", () => {
    expect(patrimonioDoCaminho("/equipamento/")).toBe("");
  });
});

describe("quando o servidor falha", () => {
  it("avisa e tenta de novo ao tocar no botão", async () => {
    const falhar = new Set(["/maquinas/004512.json"]);
    const { raiz, servidor } = await abrir("004512", servidorDaDemo(falhar));
    expect(raiz.querySelector('[data-estado="erro"]')).not.toBeNull();
    falhar.clear();
    raiz.querySelector<HTMLButtonElement>('[data-estado="erro"] button')?.click();
    await depoisDoAviso();
    expect(pecasDe(raiz)).toHaveLength(2);
    expect(servidor.pedidos).toEqual(["/maquinas/004512.json", "/maquinas/004512.json"]);
  });
});

describe("o evento agroparts:peca-identificada", () => {
  it("destaca o grupo da máquina, abre os textos e não pede o índice", async () => {
    const { raiz, servidor, sinal } = await abrir("004512");
    const [, segunda] = pecasDe(raiz);
    const chave = segunda?.dataset.peca ?? "";
    identificar(sinal, leituraQueResolve(chave));
    await depoisDoAviso();
    expect(pecasDe(raiz).map((p) => p.classList.contains("destaque"))).toEqual([false, true]);
    expect(segunda?.querySelector("details")?.open).toBe(true);
    expect(raiz.querySelector("#avisos [data-aviso]")?.getAttribute("data-aviso")).toBe("nesta-maquina");
    expect(servidor.pedidos).toEqual(["/maquinas/004512.json"]);
  });

  it("muda o destaque quando outra peça é identificada", async () => {
    const { raiz, sinal } = await abrir("004512");
    const [primeira, segunda] = pecasDe(raiz);
    identificar(sinal, leituraQueResolve(primeira?.dataset.peca ?? ""));
    identificar(sinal, leituraQueResolve(segunda?.dataset.peca ?? ""));
    await depoisDoAviso();
    expect(pecasDe(raiz).map((p) => p.classList.contains("destaque"))).toEqual([false, true]);
  });

  it("uma peça que a máquina nunca trocou aparece com o saldo do almoxarifado, vindo do índice", async () => {
    const { raiz, servidor, sinal } = await abrir("004512");
    const daMaquina = new Set(pecasDe(raiz).map((p) => p.dataset.peca));
    const alheio = indiceDeGrupos(exportacaoDaDemo, unificacaoDaDemo).grupos.find((g) => !daMaquina.has(g.chave) && g.saldo.some((s) => s.quantidade > 0));
    if (!alheio) throw new Error("a demo precisa de uma peça com saldo que a 004512 nunca trocou");

    identificar(sinal, leituraQueResolve(alheio.chave));
    await depoisDoAviso();
    const aviso = raiz.querySelector('#avisos [data-aviso="outra-maquina"]');
    expect(aviso).not.toBeNull();
    const esperado = alheio.saldo.filter((s) => s.quantidade > 0).map((s) => s.codigo);
    expect([...(aviso?.querySelectorAll<HTMLElement>("li") ?? [])].map((l) => l.dataset.codigo)).toEqual(esperado);
    expect(pecasDe(raiz).some((p) => p.classList.contains("destaque"))).toBe(false);
    expect(servidor.pedidos).toEqual(["/maquinas/004512.json", "/grupos.json"]);

    identificar(sinal, leituraQueResolve(alheio.chave));
    await depoisDoAviso();
    expect(servidor.pedidos).toEqual(["/maquinas/004512.json", "/grupos.json"]);
  });

  it("uma chave que nem o índice conhece não inventa saldo", async () => {
    const familia = lerFamilia("qualquer");
    if (!familia.ok) throw new Error(familia.problema);
    const { raiz, sinal } = await abrir("004512");
    identificar(sinal, {
      decisao: "resolve",
      familia: familia.valor,
      chave: chaveDe("chave-que-nao-existe"),
      rotulo: "Peça nova",
      atributos: [],
    });
    await depoisDoAviso();
    expect(raiz.querySelector('#avisos [data-aviso="desconhecida"]')).not.toBeNull();
    expect(raiz.querySelector("#avisos li")).toBeNull();
  });

  it("uma leitura sem chave não destaca nada", async () => {
    const { raiz, sinal } = await abrir("004512");
    identificar(sinal, { decisao: "revisa", familia: null, pendencias: ["designacao-ausente"], atributos: [] });
    await depoisDoAviso();
    expect(raiz.querySelector('#avisos [data-aviso="sem-chave"]')).not.toBeNull();
    expect(pecasDe(raiz).some((p) => p.classList.contains("destaque"))).toBe(false);
  });

  it("chega mesmo quando é disparado num elemento da página e a janela escuta", async () => {
    const raiz = novaRaiz();
    await montarEquipamento(raiz, "004512", { buscar: servidorDaDemo().buscar, ir: () => undefined, escutar: window });
    const [primeira] = pecasDe(raiz);
    const detalhe: PecaIdentificada = { leitura: leituraQueResolve(primeira?.dataset.peca ?? ""), origem: { tipo: "digitado" } };
    raiz.dispatchEvent(new CustomEvent(PECA_IDENTIFICADA, { detail: detalhe, bubbles: false }));
    await depoisDoAviso();
    expect(primeira?.classList.contains("destaque")).toBe(true);
  });
});

describe("abrir o link e digitar o número mostram o mesmo histórico", () => {
  it("o campo da página inicial leva ao mesmo endereço que a tag grava, e a página desenha o mesmo", async () => {
    const inicio = novaRaiz();
    const destinos: string[] = [];
    montarInicio(inicio, (endereco) => destinos.push(endereco));
    const campo = inicio.querySelector<HTMLInputElement>("input");
    if (!campo) throw new Error("sem campo");
    campo.value = " 004512 ";
    inicio.querySelector("form")?.requestSubmit();
    expect(destinos).toEqual(["/e/004512"]);

    const digitado = await abrir(patrimonioDoCaminho(destinos[0] ?? ""));
    const link = await abrir(patrimonioDoCaminho("/e/004512"));
    expect(pecasDe(digitado.raiz)).toHaveLength(2);
    expect(digitado.raiz.innerHTML).toBe(link.raiz.innerHTML);
  });
});
