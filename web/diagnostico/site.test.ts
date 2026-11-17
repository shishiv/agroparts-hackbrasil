import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build, preview, type PreviewServer } from "vite";

const CONFIGURACAO = join(import.meta.dir, "..", "..", "vite.config.ts");
const CELULAR = { width: 390, height: 844 };
const NOTEBOOK = { width: 1366, height: 768 };

const esperado: { resumo: Record<string, number> } = JSON.parse(
  readFileSync(join(import.meta.dir, "..", "..", "dados", "demo", "esperado-skus.json"), "utf8"),
);

/**
 * Sem Chromium estes testes falham, e não pulam. Rode `bunx playwright install chromium`
 * ou aponte `CHROMIUM_PATH` para um Chromium, como o `bun run test:navegador` já pede.
 */
const executavel = process.env.CHROMIUM_PATH;
const navegador: Browser = await chromium.launch(executavel ? { executablePath: executavel } : {});

let saida = "";
let servidor: PreviewServer | undefined;
let base = "";

beforeAll(async () => {
  saida = await mkdtemp(join(tmpdir(), "agroparts-diagnostico-"));
  await build({ configFile: CONFIGURACAO, logLevel: "silent", build: { outDir: saida } });
  servidor = await preview({
    configFile: CONFIGURACAO,
    logLevel: "silent",
    build: { outDir: saida },
    preview: { host: "127.0.0.1", port: 0 },
  });
  base = `http://127.0.0.1:${(servidor.httpServer.address() as AddressInfo).port}`;
}, 120_000);

afterAll(async () => {
  await navegador.close();
  await servidor?.close();
  if (saida) await rm(saida, { recursive: true, force: true });
});

interface Aberta {
  pagina: Page;
  contexto: BrowserContext;
  /** Toda requisição que não é HTML, JS nem CSS do próprio site. */
  dados: string[];
}

async function abrir(tela: { width: number; height: number }): Promise<Aberta> {
  const contexto = await navegador.newContext({ viewport: tela });
  const pagina = await contexto.newPage();
  const dados: string[] = [];
  pagina.on("request", (requisicao) => {
    const tipo = requisicao.resourceType();
    if (tipo === "fetch" || tipo === "xhr" || tipo === "websocket" || requisicao.method() !== "GET") {
      dados.push(`${requisicao.method()} ${new URL(requisicao.url()).pathname}`);
    }
  });
  await pagina.goto(`${base}/diagnostico`);
  await pagina.waitForSelector("[data-resumo]");
  return { pagina, contexto, dados };
}

const resumoNaTela = (pagina: Page) =>
  pagina.locator("[data-resumo]").evaluateAll((itens) =>
    Object.fromEntries(itens.map((i) => [i.getAttribute("data-resumo"), Number(i.querySelector("strong")?.textContent)])),
  );

describe("a tela de diagnóstico no site construído", () => {
  it("mostra os números que o gerador plantou, e não faz nenhuma requisição de dados", async () => {
    const { pagina, contexto, dados } = await abrir(NOTEBOOK);
    expect(await resumoNaTela(pagina)).toEqual({
      misturas: esperado.resumo.misturas,
      fragmentacoes: esperado.resumo.fragmentacoes,
      coerentes: esperado.resumo.coerentes,
      inconclusivos: esperado.resumo.inconclusivos,
    });
    expect(dados).toEqual([]);
    await contexto.close();
  }, 60_000);

  it("escolher um arquivo troca a análise sem nenhuma requisição", async () => {
    const { pagina, contexto, dados } = await abrir(NOTEBOOK);
    await pagina.setInputFiles('input[type="file"]', {
      name: "usina.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("codigo;descricao;unidade;sku\n1;ROL 6310 ZZ;UN;A\n2;ROL 6310 2RS;UN;A\n"),
    });
    await pagina.waitForFunction(() => document.querySelector(".fonte")?.textContent?.startsWith("usina.csv"));
    expect(await resumoNaTela(pagina)).toEqual({ misturas: 1, fragmentacoes: 0, coerentes: 0, inconclusivos: 0 });
    expect(dados).toEqual([]);
    await contexto.close();
  }, 60_000);

  it("num notebook, o resumo cabe numa linha e as peças de uma mistura ficam lado a lado", async () => {
    const { pagina, contexto } = await abrir(NOTEBOOK);
    const topos = await pagina.locator("[data-resumo]").evaluateAll((itens) => itens.map((i) => Math.round(i.getBoundingClientRect().top)));
    expect(new Set(topos).size).toBe(1);
    const colunas = await pagina
      .locator('[data-veredicto="mistura"][data-sku="ROL-6210"] .bloco')
      .evaluateAll((blocos) => blocos.map((b) => Math.round(b.getBoundingClientRect().top)));
    expect(colunas.slice(0, 3)).toEqual([colunas[0], colunas[0], colunas[0]]);
    await contexto.close();
  }, 60_000);

  it("num celular de 390 px, não rola para o lado, não usa texto abaixo de 16 px e empilha as peças", async () => {
    const { pagina, contexto } = await abrir(CELULAR);
    await pagina.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    const medidas = await pagina.evaluate(() => {
      const pequenos: string[] = [];
      const visitar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let no = visitar.nextNode(); no; no = visitar.nextNode()) {
        const pai = no.parentElement;
        if (!pai || !no.textContent?.trim()) continue;
        const tamanho = Number.parseFloat(getComputedStyle(pai).fontSize);
        if (tamanho < 16) pequenos.push(`${tamanho}px: ${no.textContent.trim().slice(0, 40)}`);
      }
      const pecas = [...document.querySelectorAll('[data-sku="ROL-6210"] .bloco')].map((b) => Math.round(b.getBoundingClientRect().left));
      return { largura: document.documentElement.scrollWidth, janela: innerWidth, pequenos, pecasNaMesmaColuna: new Set(pecas).size === 1 };
    });
    expect(medidas).toEqual({ largura: CELULAR.width, janela: CELULAR.width, pequenos: [], pecasNaMesmaColuna: true });
    await contexto.close();
  }, 60_000);

  it("o resumo leva à seção, e os alvos de toque têm pelo menos 44 px", async () => {
    const { pagina, contexto } = await abrir(CELULAR);
    const alvos = await pagina.locator('[data-resumo], summary, label.botao').evaluateAll((itens) => itens.map((i) => Math.round(i.getBoundingClientRect().height)));
    expect(Math.min(...alvos)).toBeGreaterThanOrEqual(44);
    await pagina.click('[data-resumo="fragmentacoes"]');
    expect(new URL(pagina.url()).hash).toBe("#fragmentacoes");
    await contexto.close();
  }, 60_000);
});
