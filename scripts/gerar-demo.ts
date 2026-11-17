import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SEMENTE_PADRAO } from "./demo/cenario";
import { carregarCatmat } from "./demo/catmat";
import { arquivosDaDemo, NOMES_DOS_ARQUIVOS } from "./demo/escrever";
import { montarUsina } from "./demo/usina";

const RAIZ = fileURLToPath(new URL("../", import.meta.url));
export const PASTA_DO_CATMAT = `${RAIZ}dados/catmat`;
export const PASTA_DA_DEMO = `${RAIZ}dados/demo`;

export async function gerarArquivos(semente: number = SEMENTE_PADRAO) {
  const catmat = await carregarCatmat(PASTA_DO_CATMAT);
  return arquivosDaDemo(montarUsina(catmat, semente));
}

function lerArgumento(nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  return Bun.argv.find((a) => a.startsWith(prefixo))?.slice(prefixo.length);
}

async function principal(): Promise<void> {
  const semente = Number(lerArgumento("semente") ?? SEMENTE_PADRAO);
  if (!Number.isInteger(semente)) throw new Error("--semente precisa ser um número inteiro");
  const pasta = lerArgumento("saida") ?? PASTA_DA_DEMO;
  const arquivos = await gerarArquivos(semente);
  await mkdir(pasta, { recursive: true });
  for (const nome of NOMES_DOS_ARQUIVOS) await writeFile(`${pasta}/${nome}`, arquivos[nome], "utf8");
  console.log(`Demo gerada com a semente ${semente} em ${pasta}: ${NOMES_DOS_ARQUIVOS.length} arquivos.`);
}

if (import.meta.main) await principal();
