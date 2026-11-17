import { mkdtemp, readFile, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build, preview, type PreviewServer } from "vite";

const CONFIGURACAO = join(import.meta.dir, "..", "vite.config.ts");

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
  const endereco = servidor.httpServer.address() as AddressInfo;
  base = `http://127.0.0.1:${endereco.port}`;
}, 60_000);

afterAll(async () => {
  await servidor?.close();
  await rm(saida, { recursive: true, force: true });
});

async function titulo(caminho: string): Promise<{ status: number; titulo: string | null }> {
  const resposta = await fetch(`${base}${caminho}`);
  const html = await resposta.text();
  return { status: resposta.status, titulo: /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? null };
}

describe("site vazio, depois do build e no preview", () => {
  it("responde a página inicial", async () => {
    expect(await titulo("/")).toEqual({ status: 200, titulo: "AgroParts" });
  });

  it("responde /e/<patrimônio> com a página do equipamento, para qualquer número", async () => {
    expect(await titulo("/e/004512")).toEqual({ status: 200, titulo: "Equipamento · AgroParts" });
    expect(await titulo("/e/B-77?origem=nfc")).toEqual({ status: 200, titulo: "Equipamento · AgroParts" });
  });

  it("responde /diagnostico com e sem barra no fim", async () => {
    expect(await titulo("/diagnostico")).toEqual({ status: 200, titulo: "Diagnóstico · AgroParts" });
    expect(await titulo("/diagnostico/")).toEqual({ status: 200, titulo: "Diagnóstico · AgroParts" });
  });

  it("manda tudo que está sob /e/ para a página do equipamento, até um arquivo .json", async () => {
    expect(await titulo("/e/004512.json")).toEqual({ status: 200, titulo: "Equipamento · AgroParts" });
  });

  it("não inventa rota: o que não existe dá 404", async () => {
    expect((await titulo("/nao-existe")).status).toBe(404);
    expect((await titulo("/maquinas/nao-existe.json")).status).toBe(404);
  });

  it("leva a página de 404 que o Cloudflare Pages usa no lugar da página inicial", async () => {
    const pagina = await readFile(join(saida, "404.html"), "utf8");
    expect(pagina).toContain("Página não encontrada");
  });

  it("leva o _redirects que faz o mesmo no Cloudflare Pages", async () => {
    const regras = await readFile(join(saida, "_redirects"), "utf8");
    expect(regras.trim()).toBe("/e/* /equipamento/ 200");
  });
});
