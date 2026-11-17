import { cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { lerExportacao } from "../src/exportacao";
import { NOMES_DOS_ARQUIVOS } from "./demo/escrever";
import { PASTA_DA_DEMO, gerarArquivos } from "./gerar-demo";
import { acharSinaisDePrivacidade } from "./privacidade";

const pastasTemporarias: string[] = [];

afterAll(async () => {
  await Promise.all(pastasTemporarias.map((p) => rm(p, { recursive: true, force: true })));
});

async function lerDaDemo(nome: string): Promise<string> {
  return readFile(join(PASTA_DA_DEMO, nome), "utf8");
}

describe("gerar-demo", () => {
  it("refaz byte a byte os arquivos versionados, com a semente padrão", async () => {
    const gerados = await gerarArquivos();
    for (const nome of NOMES_DOS_ARQUIVOS) {
      expect(gerados[nome], nome).toBe(await lerDaDemo(nome));
    }
  });

  it("dá o mesmo resultado a cada execução com a mesma semente, e outro com outra semente", async () => {
    const primeira = await gerarArquivos(77);
    const segunda = await gerarArquivos(77);
    const outra = await gerarArquivos(78);
    expect(segunda).toEqual(primeira);
    expect(outra["consumo.csv"]).not.toBe(primeira["consumo.csv"]);
  });

  it("pelo comando, escreve em --saida os mesmos arquivos versionados", async () => {
    const saida = await mkdtemp(join(tmpdir(), "gerar-demo-"));
    pastasTemporarias.push(saida);
    const processo = Bun.spawn(["bun", "run", "scripts/gerar-demo.ts", `--saida=${saida}`], {
      cwd: join(import.meta.dir, ".."),
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await processo.exited).toBe(0);
    expect((await readdir(saida)).sort()).toEqual([...NOMES_DOS_ARQUIVOS].sort());
    for (const nome of NOMES_DOS_ARQUIVOS) {
      expect(await readFile(join(saida, nome), "utf8"), nome).toBe(await lerDaDemo(nome));
    }
  });

  it("acha os dados quando o caminho do projeto tem espaço e acento", async () => {
    const raiz = join(import.meta.dir, "..");
    const temporaria = await mkdtemp(join(tmpdir(), "gerar-demo-"));
    pastasTemporarias.push(temporaria);
    const copia = join(temporaria, "Área de Trabalho", "agroparts");
    for (const pasta of ["scripts", "src", "dados/catmat"]) {
      await cp(join(raiz, pasta), join(copia, pasta), { recursive: true });
    }
    const processo = Bun.spawn(["bun", "run", "scripts/gerar-demo.ts"], { cwd: copia, stdout: "pipe", stderr: "pipe" });
    expect(await processo.exited, await new Response(processo.stderr).text()).toBe(0);
    for (const nome of NOMES_DOS_ARQUIVOS) {
      expect(await readFile(join(copia, "dados/demo", nome), "utf8"), nome).toBe(await lerDaDemo(nome));
    }
  });

  it("gera, com outra semente, uma exportação que a fronteira também lê", async () => {
    const g = await gerarArquivos(4242);
    const lido = lerExportacao({
      equipamentos: g["equipamentos.csv"],
      materiais: g["materiais.csv"],
      consumo: g["consumo.csv"],
      estoque: g["estoque.csv"],
    });
    expect(lido.ok).toBe(true);
  });
});

describe("dados pessoais na demo", () => {
  it.each(NOMES_DOS_ARQUIVOS)("%s não tem CPF, CNPJ, e-mail, telefone nem 11 dígitos seguidos", async (nome) => {
    const achados: string[] = [];
    (await lerDaDemo(nome)).split("\n").forEach((linha, i) => {
      const sinais = acharSinaisDePrivacidade(linha);
      if (sinais.length > 0) achados.push(`${nome}:${i + 1} ${sinais.join(",")}`);
    });
    expect(achados).toEqual([]);
  });

  it("vale também para outras sementes", async () => {
    for (const semente of [1, 2, 3]) {
      const arquivos = await gerarArquivos(semente);
      for (const nome of NOMES_DOS_ARQUIVOS) {
        expect(acharSinaisDePrivacidade(arquivos[nome]), `${nome} com a semente ${semente}`).toEqual([]);
      }
    }
  });
});
