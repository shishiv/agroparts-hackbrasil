import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build, preview, type PreviewServer } from "vite";

const CONFIGURACAO = join(import.meta.dir, "..", "..", "vite.config.ts");
const CELULAR = { width: 390, height: 844 };

/**
 * Sem Chromium estes testes falham, e não pulam: um verde sem navegador não prova o critério
 * "o link e o número digitado mostram o mesmo histórico". Rode `bunx playwright install chromium`
 * ou aponte `CHROMIUM_PATH` para um Chromium, como o `bun run test:navegador` já pede.
 */
const executavel = process.env.CHROMIUM_PATH;
const navegador: Browser = await chromium.launch(executavel ? { executablePath: executavel } : {});

let saida = "";
let servidor: PreviewServer | undefined;
let base = "";

beforeAll(async () => {
  saida = await mkdtemp(join(tmpdir(), "agroparts-site-"));
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

interface PaginaObservada {
  pagina: Page;
  contexto: BrowserContext;
  /** Caminho e status de cada resposta que não é HTML, JS nem CSS do próprio site. */
  dados: { caminho: string; status: number }[];
}

async function celular(): Promise<PaginaObservada> {
  const contexto = await navegador.newContext({ viewport: CELULAR });
  const pagina = await contexto.newPage();
  const dados: PaginaObservada["dados"] = [];
  pagina.on("response", (resposta) => {
    const tipo = resposta.request().resourceType();
    if (tipo === "fetch" || tipo === "xhr") {
      dados.push({ caminho: new URL(resposta.url()).pathname, status: resposta.status() });
    }
  });
  return { pagina, contexto, dados };
}

async function historicoDe(pagina: Page): Promise<string> {
  await pagina.waitForSelector("[data-peca]");
  return pagina.locator("main").innerText();
}

describe("no site construído, num celular de 390 px", () => {
  it("abrir o link /e/<patrimônio> e digitar o número na página inicial mostram o mesmo histórico", async () => {
    const link = await celular();
    await link.pagina.goto(`${base}/e/004512?origem=nfc`);
    const doLink = await historicoDe(link.pagina);

    const digitado = await celular();
    await digitado.pagina.goto(`${base}/`);
    await digitado.pagina.fill("#patrimonio", "004512");
    await digitado.pagina.click("button[type=submit]");
    await digitado.pagina.waitForURL(`${base}/e/004512`);
    const doCampo = await historicoDe(digitado.pagina);

    expect(doCampo).toBe(doLink);
    expect(await link.pagina.locator("[data-peca]").evaluateAll((pecas) => pecas.map((p) => [p.getAttribute("data-trocas"), p.getAttribute("data-total")]))).toEqual([
      ["12", "22"],
      ["11", "22"],
    ]);
    await link.contexto.close();
    await digitado.contexto.close();
  }, 60_000);

  it("baixa só o JSON da própria máquina", async () => {
    const { pagina, dados, contexto } = await celular();
    await pagina.goto(`${base}/e/004540`);
    await historicoDe(pagina);
    expect(dados).toEqual([{ caminho: "/maquinas/004540.json", status: 200 }]);
    await contexto.close();
  }, 60_000);

  it("um número que não existe mostra patrimônio desconhecido e deixa digitar outro", async () => {
    const { pagina, dados, contexto } = await celular();
    await pagina.goto(`${base}/e/999999`);
    await pagina.waitForSelector('[data-estado="desconhecido"]');
    expect(dados).toEqual([{ caminho: "/maquinas/999999.json", status: 404 }]);

    await pagina.fill("#patrimonio", "004512");
    await pagina.click("button[type=submit]");
    await pagina.waitForURL(`${base}/e/004512`);
    await historicoDe(pagina);
    await contexto.close();
  }, 60_000);

  it("não rola para o lado e não usa texto abaixo de 16 px, na página inicial e na da máquina", async () => {
    const { pagina, contexto } = await celular();
    for (const caminho of ["/", "/e/004512", "/e/999999"]) {
      await pagina.goto(`${base}${caminho}`);
      await pagina.waitForSelector("main > *");
      await pagina.waitForFunction(() => !document.querySelector("[aria-busy]"));
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
        return { largura: document.documentElement.scrollWidth, janela: innerWidth, pequenos };
      });
      expect(medidas, caminho).toEqual({ largura: CELULAR.width, janela: CELULAR.width, pequenos: [] });
    }
    await contexto.close();
  }, 60_000);

  it("leva o rodapé de dados de demonstração na página inicial e na da máquina", async () => {
    const { pagina, contexto } = await celular();
    for (const caminho of ["/", "/e/004512"]) {
      await pagina.goto(`${base}${caminho}`);
      expect(await pagina.locator("footer").innerText()).toMatch(/demonstra/i);
    }
    await contexto.close();
  }, 60_000);
});
