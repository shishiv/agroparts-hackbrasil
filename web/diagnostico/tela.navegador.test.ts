import { afterEach, describe, expect, it } from "vitest";
import materiaisDaDemo from "../../dados/demo/materiais.csv?raw";
import esperadoJson from "../../dados/demo/esperado-skus.json?raw";
import { lerMateriais } from "../../src/exportacao";
import { montarDiagnostico } from "./tela";

interface Esperado {
  skus: { sku: string; veredicto: string; codigos: string[]; grupos: string[][]; semGrupo: string[] }[];
  fragmentacoes: { codigos: string[]; skus: string[] }[];
  resumo: { coerentes: number; misturas: number; inconclusivos: number; fragmentacoes: number };
}

const esperado: Esperado = JSON.parse(esperadoJson);

const lidos = lerMateriais(materiaisDaDemo);
if (!lidos.ok) throw new Error("materiais da demo ilegíveis");
const descricaoDe = new Map<string, string>(lidos.valor.map((m) => [m.codigo, m.descricao]));

const montados: HTMLElement[] = [];

function montar(csv = materiaisDaDemo): HTMLElement {
  const raiz = document.createElement("main");
  document.body.append(raiz);
  montados.push(raiz);
  montarDiagnostico(raiz, csv);
  return raiz;
}

afterEach(() => {
  for (const raiz of montados.splice(0)) raiz.remove();
});

const todos = <T extends Element>(pai: ParentNode, seletor: string): T[] => [...pai.querySelectorAll<T>(seletor)];
const codigosDe = (pai: ParentNode): string[] => todos<HTMLElement>(pai, "[data-codigo]").map((c) => c.dataset.codigo ?? "");
const ordenados = (lista: readonly string[]) => [...lista].sort();
const conjuntos = (listas: readonly (readonly string[])[]) => listas.map((l) => ordenados(l).join(",")).sort();

function numerosDoResumo(raiz: HTMLElement): Record<string, number> {
  return Object.fromEntries(todos<HTMLElement>(raiz, "[data-resumo]").map((n) => [n.dataset.resumo, Number(n.querySelector("strong")?.textContent)]));
}

async function terminar(raiz: HTMLElement): Promise<void> {
  const resultado = raiz.querySelector("#resultado");
  for (let i = 0; i < 200 && resultado?.hasAttribute("aria-busy"); i++) await new Promise((r) => setTimeout(r, 10));
  expect(resultado?.hasAttribute("aria-busy")).toBe(false);
}

async function escolherArquivo(raiz: HTMLElement, arquivo: File): Promise<void> {
  const entrada = raiz.querySelector<HTMLInputElement>('input[type="file"]');
  if (!entrada) throw new Error("a tela não tem o campo de arquivo");
  const lista = new DataTransfer();
  lista.items.add(arquivo);
  entrada.files = lista.files;
  entrada.dispatchEvent(new Event("change", { bubbles: true }));
  await terminar(raiz);
}

const SECAO_DO_VEREDICTO: Record<string, string> = {
  mistura: "misturas",
  coerente: "coerentes",
  inconclusivo: "inconclusivos",
};

describe("os números da tela batem com o que o gerador plantou", () => {
  const raiz = () => montar();

  it("o resumo traz as misturas, as fragmentações, os coerentes e os inconclusivos", () => {
    expect(numerosDoResumo(raiz())).toEqual({
      misturas: esperado.resumo.misturas,
      fragmentacoes: esperado.resumo.fragmentacoes,
      coerentes: esperado.resumo.coerentes,
      inconclusivos: esperado.resumo.inconclusivos,
    });
  });

  it("cada SKU aparece uma vez, na seção do veredicto plantado", () => {
    const tela = raiz();
    const cartoes = todos<HTMLElement>(tela, "[data-veredicto][data-sku]");
    expect(cartoes.map((c) => c.dataset.sku).sort()).toEqual(esperado.skus.map((s) => s.sku).sort());
    for (const planejado of esperado.skus) {
      const cartao = cartoes.find((c) => c.dataset.sku === planejado.sku);
      expect(cartao?.dataset.veredicto, planejado.sku).toBe(planejado.veredicto);
      expect(cartao?.closest("section")?.id, planejado.sku).toBe(SECAO_DO_VEREDICTO[planejado.veredicto]);
    }
  });

  it("cada SKU mostra todos os seus códigos, uma coluna por peça e a coluna dos que não têm grupo", () => {
    const tela = raiz();
    for (const planejado of esperado.skus) {
      const cartao = tela.querySelector<HTMLElement>(`[data-veredicto][data-sku="${planejado.sku}"]`);
      if (!cartao) throw new Error(`${planejado.sku} não está na tela`);
      expect(ordenados(codigosDe(cartao)), planejado.sku).toEqual(planejado.codigos);
      const pecas = todos<HTMLElement>(cartao, ".bloco.peca").map(codigosDe);
      expect(conjuntos(pecas), planejado.sku).toEqual(conjuntos(planejado.grupos));
      const semGrupo = todos<HTMLElement>(cartao, ".bloco.sem-grupo").flatMap(codigosDe);
      expect(ordenados(semGrupo), planejado.sku).toEqual(planejado.semGrupo);
    }
  });

  it("cada fragmentação mostra os códigos do grupo e os SKUs em que ele está", () => {
    const cartoes = todos<HTMLElement>(raiz(), "#fragmentacoes article");
    expect(cartoes).toHaveLength(esperado.fragmentacoes.length);
    const naTela = cartoes.map((c) => ({
      codigos: ordenados(codigosDe(c)),
      skus: todos<HTMLElement>(c, ".bloco.sku").map((b) => b.dataset.sku ?? ""),
    }));
    const plantadas = esperado.fragmentacoes.map((f) => ({ codigos: ordenados(f.codigos), skus: ordenados(f.skus) }));
    const chave = (f: { codigos: string[] }) => f.codigos.join(",");
    expect(naTela.toSorted((a, b) => chave(a).localeCompare(chave(b)))).toEqual(
      plantadas.toSorted((a, b) => chave(a).localeCompare(chave(b))),
    );
  });

  it("cada código mostra o texto original do cadastro, sem mudar uma letra", () => {
    const tela = raiz();
    const nasLinhas = todos<HTMLElement>(tela, "[data-veredicto] li[data-codigo]");
    expect(nasLinhas).toHaveLength(esperado.skus.reduce((soma, s) => soma + s.codigos.length, 0));
    for (const linha of nasLinhas) {
      expect(linha.querySelector(".original")?.textContent, linha.dataset.codigo).toBe(descricaoDe.get(linha.dataset.codigo ?? ""));
    }
  });

  it("na mistura, marca no texto o que difere entre as peças", () => {
    const tela = raiz();
    const marcado = (codigo: string) =>
      todos<HTMLElement>(tela, `[data-veredicto="mistura"][data-sku="ROL-6210"] [data-codigo="${codigo}"] mark`).map((m) => m.textContent);
    expect(marcado("10005")).toEqual(["2RS"]);
    expect(marcado("10049")).toEqual(["2Z", "C3"]);
  });

  it("a mistura diz quantas peças junta e em que a chave difere", () => {
    const resumo = montar().querySelector('[data-sku="ROL-6210"] .resumo-do-sku')?.textContent;
    expect(resumo).toBe("Junta 3 peças diferentes, que mudam em vedação e folga");
  });
});

describe("carregar outro cadastro de materiais", () => {
  const csv = (...linhas: string[]) => ["codigo;descricao;unidade;sku", ...linhas].join("\n");

  it("mostra o diagnóstico do arquivo escolhido e deixa voltar à demonstração", async () => {
    const tela = montar();
    const arquivo = new File(
      [csv("1;ROL 6310-2Z/C3;UN;A", "2;ROLAMENTO RIGIDO DE ESFERAS 6310 ZZ C3;UN;A", "3;ROL 6310-2RS1 C3;UN;B", "4;ROL 6310 ZZ C3;UN;B")],
      "meus-materiais.csv",
    );
    await escolherArquivo(tela, arquivo);

    expect(tela.querySelector(".fonte")?.textContent).toBe("meus-materiais.csv · 4 códigos · 2 itens da usina");
    expect(numerosDoResumo(tela)).toEqual({ misturas: 1, fragmentacoes: 1, coerentes: 1, inconclusivos: 0 });
    expect(todos(tela, "[data-veredicto][data-sku]").map((s) => (s as HTMLElement).dataset.sku)).toEqual(["B", "A"]);

    tela.querySelector<HTMLButtonElement>("button.secundario")?.click();
    expect(numerosDoResumo(tela).misturas).toBe(esperado.resumo.misturas);
    expect(tela.querySelector(".fonte")?.textContent).toContain("Dados de demonstração");
    expect(tela.querySelector<HTMLElement>("button.secundario")?.hidden).toBe(true);
  });

  it("um arquivo que não dá para ler avisa onde, e deixa na tela o que estava", async () => {
    const tela = montar();
    await escolherArquivo(tela, new File([csv("1;ROL 6310 ZZ;UN;A", "1;ROL 6310 ZZ;UN;A", ";sem codigo;UN;A")], "ruim.csv"));

    const aviso = tela.querySelector<HTMLElement>('[role="alert"]');
    expect(aviso?.hidden).toBe(false);
    expect(aviso?.textContent).toContain("Não consegui ler ruim.csv.");
    expect(aviso?.textContent).toContain("Linha 3");
    expect(numerosDoResumo(tela).misturas).toBe(esperado.resumo.misturas);
    expect(tela.querySelector(".fonte")?.textContent).toContain("Dados de demonstração");
  });

  it("uma exportação sem as colunas do cadastro avisa a coluna que falta", async () => {
    const tela = montar();
    await escolherArquivo(tela, new File(["codigo;texto\n1;ROL 6310 ZZ"], "outra.csv"));
    expect(tela.querySelector('[role="alert"]')?.textContent).toContain("coluna ausente no cabeçalho");
  });

  it("um arquivo bom depois de um ruim tira o aviso", async () => {
    const tela = montar();
    await escolherArquivo(tela, new File(["x"], "ruim.csv"));
    await escolherArquivo(tela, new File([csv("1;ROL 6310 ZZ;UN;A")], "bom.csv"));
    expect(tela.querySelector<HTMLElement>('[role="alert"]')?.hidden).toBe(true);
    expect(tela.querySelector(".fonte")?.textContent).toBe("bom.csv · 1 código · 1 item da usina");
  });

  it("lê o que o Excel brasileiro grava em Windows-1252, sem trocar o acento por �", async () => {
    const tela = montar();
    const texto = csv("1;ROLAMENTO RÍGIDO DE ESFERAS 6310 ZZ;UN;A", "2;ROL 6310-2Z;UN;A");
    const bytes = Uint8Array.from(texto, (c) => c.charCodeAt(0));
    await escolherArquivo(tela, new File([bytes], "excel.csv"));
    expect(numerosDoResumo(tela)).toEqual({ misturas: 0, fragmentacoes: 0, coerentes: 1, inconclusivos: 0 });
    expect(tela.querySelector("[data-codigo='1'] .original")?.textContent).toBe("ROLAMENTO RÍGIDO DE ESFERAS 6310 ZZ");
  });

  it("um cadastro sem nenhum SKU diz que não há o que comparar", async () => {
    const tela = montar();
    await escolherArquivo(tela, new File([csv("1;ROL 6310 ZZ;UN;")], "sem-sku.csv"));
    expect(tela.querySelector("#resultado")?.textContent).toContain("não há o que comparar");
    expect(todos(tela, "[data-resumo]")).toHaveLength(0);
  });
});
