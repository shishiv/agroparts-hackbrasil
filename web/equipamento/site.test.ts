import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build, preview, type PreviewServer } from "vite";
import { BEDROCK_GRAVADO, COM_CHAVE_DA_AWS, COM_CHAVE_DO_GROQ, GROQ_GRAVADO, rotearFuncoes, type FuncaoRoteada } from "../entrada/funcoes-de-teste";

const CONFIGURACAO = join(import.meta.dir, "..", "..", "vite.config.ts");
const CELULAR = { width: 390, height: 844 };

/**
 * Sem Chromium estes testes falham, e não pulam: um verde sem navegador não prova o critério
 * "o link e o número digitado mostram o mesmo histórico". Rode `bunx playwright install chromium`
 * ou aponte `CHROMIUM_PATH` para um Chromium, como o `bun run test:navegador` já pede.
 */
const executavel = process.env.CHROMIUM_PATH;
const navegador: Browser = await chromium.launch({
  ...(executavel ? { executablePath: executavel } : {}),
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});

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
  const contexto = await navegador.newContext({ viewport: CELULAR, permissions: ["microphone"] });
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

  it("tocar na placa simulada de uma máquina da demo abre a página dela, a mesma do link, e a tela diz que é demonstração", async () => {
    const link = await celular();
    await link.pagina.goto(`${base}/e/004512`);
    const doLink = await historicoDe(link.pagina);

    const { pagina, contexto } = await celular();
    await pagina.goto(`${base}/`);
    expect(await pagina.locator(".aviso-demo").innerText()).toBe("Demonstração: simula o toque na tag NFC");
    const placa = pagina.locator('button[data-patrimonio="004512"]');
    expect(await placa.locator("svg").textContent()).toContain("004512");

    await placa.click();
    await pagina.waitForSelector('[data-patrimonio="004512"][data-lendo]');
    expect(await placa.innerText()).toContain("(simulada)");
    await pagina.waitForURL(`${base}/e/004512`);
    expect(await historicoDe(pagina)).toBe(doLink);

    await pagina.goBack();
    await pagina.waitForSelector('button[data-patrimonio="004512"]:not([data-lendo])');
    expect(await pagina.locator('button[data-patrimonio="004512"]').innerText()).toContain("B-104 · Bomba de caldo");
    await link.contexto.close();
    await contexto.close();
  }, 60_000);

  it("mostra a folga normal como não escrita no texto, sem marcar nada, com o motor real no build", async () => {
    const { pagina, contexto } = await celular();
    await pagina.goto(`${base}/e/004540`);
    await historicoDe(pagina);
    const folgas = await pagina.locator('.codigos [data-atributo="folga"]').allTextContents();
    expect(folgas).toHaveLength(4);
    expect(new Set(folgas)).toEqual(new Set(["folga normal (não escrita no texto)"]));
    expect(await pagina.locator(".codigos mark").evaluateAll((marcas) => marcas.filter((m) => m.textContent === ""))).toEqual([]);
    await contexto.close();
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

describe("foto e áudio na página da máquina, com as funções respondendo a gravações", () => {
  const FOTO = readFileSync(new URL("../../public/exemplos/nsk-608z.jpg", import.meta.url));
  const SEM_CHAVE: FuncaoRoteada = { env: {}, gravada: BEDROCK_GRAVADO };

  async function abrir004512(funcoes: Parameters<typeof rotearFuncoes>[1]) {
    const { pagina, contexto } = await celular();
    const erros: string[] = [];
    pagina.on("pageerror", (erro) => erros.push(erro.message));
    const chamadasAoProvedor = await rotearFuncoes(pagina, funcoes);
    await pagina.goto(`${base}/e/004512`);
    await historicoDe(pagina);
    return { pagina, contexto, erros, chamadasAoProvedor };
  }

  async function fotografar(pagina: Page): Promise<void> {
    const escolha = pagina.waitForEvent("filechooser");
    await pagina.click('#entradas button:has-text("Achar peça por foto")');
    await (await escolha).setFiles({ name: "rolamento.jpg", mimeType: "image/jpeg", buffer: FOTO });
  }

  async function falar(pagina: Page): Promise<void> {
    await pagina.click('#entradas button:has-text("Achar peça por voz")');
    await pagina.waitForSelector('#entradas button:has-text("Parar")');
    await pagina.waitForTimeout(600);
    await pagina.click('#entradas button:has-text("Parar")');
  }

  const confirmar = (pagina: Page) => pagina.click('#entradas button:has-text("Confirmar")');
  const destacadas = (pagina: Page) => pagina.locator(".peca.destaque").evaluateAll((pecas) => pecas.map((p) => p.getAttribute("data-peca")));
  const aviso = (pagina: Page) => pagina.locator("#avisos [data-aviso]");
  const mensagemDeErro = (pagina: Page) => pagina.locator("#entradas").innerText();

  it("a página mostra os dois botões, um ao lado do outro, sem rolar para o lado", async () => {
    const { pagina, contexto } = await abrir004512({});
    const caixas = await pagina.locator("#entradas button").evaluateAll((botoes) =>
      botoes.map((b) => ({ texto: b.textContent, ...JSON.parse(JSON.stringify(b.getBoundingClientRect())) })),
    );
    expect(caixas.map((c) => c.texto)).toEqual(["Achar peça por foto", "Achar peça por voz"]);
    expect(caixas[0].top).toBe(caixas[1].top);
    expect(caixas[0].height).toBeGreaterThanOrEqual(48);
    expect(await pagina.evaluate(() => document.documentElement.scrollWidth)).toBe(CELULAR.width);
    await contexto.close();
  }, 60_000);

  it("foto: o texto lido aparece num campo, a pessoa o corrige, confirma, e o grupo certo fica destacado", async () => {
    const { pagina, contexto, erros, chamadasAoProvedor } = await abrir004512({ foto: { env: COM_CHAVE_DA_AWS, gravada: BEDROCK_GRAVADO } });

    await fotografar(pagina);
    const campo = pagina.locator("#entradas textarea");
    await campo.waitFor();
    expect(await campo.inputValue()).toBe("JAPAN\n608\nUST");

    await confirmar(pagina);
    await aviso(pagina).waitFor();
    expect(await destacadas(pagina)).toEqual([]);
    expect(await aviso(pagina).getAttribute("data-aviso")).toBe("sem-chave");
    expect(await pagina.locator("#avisos p").allInnerTexts()).toEqual([
      "Não deu para identificar a peça.",
      "Só rolamento rígido de esferas é identificado por enquanto.",
      "Texto lido na foto:",
      "JAPAN\n608\nUST",
    ]);

    await fotografar(pagina);
    await campo.waitFor();
    await campo.fill("Rolamento 6312 2Z C3");
    await confirmar(pagina);
    await pagina.waitForSelector('#avisos [data-aviso="nesta-maquina"]');
    expect(await destacadas(pagina)).toEqual(["rolamento-rigido-de-esferas|6312|ZZ|C3"]);
    expect(await pagina.locator("#avisos").innerText()).toBe("Peça identificada: Rolamento 6312 ZZ C3");

    expect(chamadasAoProvedor).toEqual(Array(2).fill("https://bedrock-runtime.us-east-1.amazonaws.com/model/us.openai.gpt-6-luna/converse"));
    expect(erros).toEqual([]);
    await contexto.close();
  }, 60_000);

  it("áudio: grava no microfone, mostra o texto ouvido, a pessoa o corrige, confirma, e o grupo certo fica destacado", async () => {
    const { pagina, contexto, erros, chamadasAoProvedor } = await abrir004512({ audio: { env: COM_CHAVE_DO_GROQ, gravada: GROQ_GRAVADO.sucesso } });

    await falar(pagina);
    const campo = pagina.locator("#audio-ouvido");
    await campo.waitFor();
    expect(await campo.inputValue()).toBe("Rolamento 6304 ZZ C3");

    await confirmar(pagina);
    await pagina.waitForSelector('#avisos [data-aviso="desconhecida"]');
    expect(await pagina.locator("#avisos").innerText()).toBe("Esta peça não está no cadastro.");
    expect(await destacadas(pagina)).toEqual([]);

    await falar(pagina);
    await campo.waitFor();
    await campo.fill("Rolamento 6309 ZZ C3");
    await confirmar(pagina);
    await pagina.waitForSelector('#avisos [data-aviso="nesta-maquina"]');
    expect(await destacadas(pagina)).toEqual(["rolamento-rigido-de-esferas|6309|ZZ|C3"]);
    expect(await pagina.locator("#avisos").innerText()).toBe("Peça identificada: Rolamento 6309 ZZ C3");

    expect(chamadasAoProvedor).toEqual(Array(2).fill("https://api.groq.com/openai/v1/audio/transcriptions"));
    expect(erros).toEqual([]);
    await contexto.close();
  }, 60_000);

  it("site estático sem Functions: cada botão diz que está indisponível e a página segue inteira", async () => {
    const { pagina, contexto, erros } = await abrir004512({});

    await fotografar(pagina);
    await pagina.waitForSelector('#entradas [role="alert"]');
    expect(await pagina.locator('#entradas [role="alert"]').innerText()).toBe("A leitura de foto está indisponível agora.");

    await falar(pagina);
    await pagina.waitForSelector("#entradas :text('A transcrição de áudio está indisponível agora.')");
    expect(await mensagemDeErro(pagina)).toContain("Tentar de novo");

    expect(await pagina.locator("[data-peca]").count()).toBe(2);
    expect(await pagina.locator('#entradas button:has-text("Achar peça por foto")').isVisible()).toBe(true);
    expect(erros).toEqual([]);
    await contexto.close();
  }, 60_000);

  it("funções sem a chave do provedor: foto e áudio dizem que estão indisponíveis, sem chamar o provedor", async () => {
    const { pagina, contexto, erros, chamadasAoProvedor } = await abrir004512({ foto: SEM_CHAVE, audio: { env: {}, gravada: GROQ_GRAVADO.sucesso } });

    await fotografar(pagina);
    await pagina.waitForSelector('#entradas [role="alert"]');
    expect(await pagina.locator('#entradas [role="alert"]').innerText()).toBe("A leitura de foto está indisponível agora.");
    await falar(pagina);
    await pagina.waitForSelector("#entradas :text('A transcrição de áudio está indisponível agora.')");

    expect(chamadasAoProvedor).toEqual([]);
    expect(erros).toEqual([]);
    await contexto.close();
  }, 60_000);

  it("limite do Groq: o áudio diz que o limite da demo foi atingido e deixa tentar de novo", async () => {
    const { pagina, contexto, chamadasAoProvedor } = await abrir004512({ audio: { env: COM_CHAVE_DO_GROQ, gravada: GROQ_GRAVADO.limite } });

    await falar(pagina);
    await pagina.waitForSelector("#entradas :text('Limite da demo atingido. Tente em um minuto.')");

    expect(await mensagemDeErro(pagina)).toContain("Tentar de novo");
    expect(chamadasAoProvedor).toEqual(["https://api.groq.com/openai/v1/audio/transcriptions"]);
    await contexto.close();
  }, 60_000);
});
