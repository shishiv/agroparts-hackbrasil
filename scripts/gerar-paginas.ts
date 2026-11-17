import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";
import type { ErroDeLinha, ExportacaoDaUsina } from "../src/contrato";
import { ARQUIVOS, lerExportacao } from "../src/exportacao";
import { CAMINHO_DO_INDICE, caminhoDoEquipamento, indiceDeGrupos, paginaDoEquipamento } from "../src/historico";
import { unificar } from "../src/motor";

const PASTA_DA_DEMO = new URL("../dados/demo/", import.meta.url);

export interface ArquivoGerado {
  /** Caminho no site, com a barra do começo: `/maquinas/004512.json`. */
  caminho: string;
  conteudo: string;
}

const lerDaDemo = (nome: string) => readFile(new URL(nome, PASTA_DA_DEMO), "utf8");

function descreverErros(arquivo: string, erros: readonly ErroDeLinha[]): string {
  const primeiros = erros.slice(0, 5).map((e) => `  ${e.arquivo}:${e.linha} ${e.coluna} ${e.problema}`);
  return [`${arquivo} ilegível (${erros.length} erros):`, ...primeiros].join("\n");
}

async function lerExportacaoDaDemo(): Promise<ExportacaoDaUsina> {
  const lido = lerExportacao({
    equipamentos: await lerDaDemo(ARQUIVOS.equipamentos),
    materiais: await lerDaDemo(ARQUIVOS.materiais),
    consumo: await lerDaDemo(ARQUIVOS.consumo),
    estoque: await lerDaDemo(ARQUIVOS.estoque),
  });
  if (!lido.ok) throw new Error(descreverErros("dados/demo", lido.erros));
  return lido.valor;
}

/** Um JSON por equipamento e o índice de grupos, na mesma ordem em toda execução. */
export async function gerarPaginas(): Promise<readonly ArquivoGerado[]> {
  const exportacao = await lerExportacaoDaDemo();
  const unificacao = unificar(exportacao.materiais);
  const maquinas = exportacao.equipamentos.map((e) => ({
    caminho: caminhoDoEquipamento(e.patrimonio),
    conteudo: JSON.stringify(paginaDoEquipamento(exportacao, unificacao, e.patrimonio)),
  }));
  return [...maquinas, { caminho: CAMINHO_DO_INDICE, conteudo: JSON.stringify(indiceDeGrupos(exportacao, unificacao)) }];
}

export async function escreverPaginas(pasta: string): Promise<readonly ArquivoGerado[]> {
  const arquivos = await gerarPaginas();
  for (const { caminho, conteudo } of arquivos) {
    const destino = join(pasta, caminho);
    await mkdir(dirname(destino), { recursive: true });
    await writeFile(destino, conteudo);
  }
  return arquivos;
}

/**
 * Faz os JSON entrarem em todo `vite build`, e serve os mesmos arquivos no `vite dev`.
 * O build não depende de um passo antes dele no `package.json`.
 */
export function paginasDoSite(): Plugin {
  return {
    name: "paginas-do-site",
    async generateBundle() {
      for (const { caminho, conteudo } of await gerarPaginas()) {
        this.emitFile({ type: "asset", fileName: caminho.slice(1), source: conteudo });
      }
    },
    configureServer(servidor) {
      servidor.middlewares.use(async (requisicao, resposta, seguir) => {
        const caminho = requisicao.url?.split("?")[0] ?? "";
        if (!caminho.startsWith("/maquinas/") && caminho !== CAMINHO_DO_INDICE) return seguir();
        const arquivo = (await gerarPaginas()).find((a) => a.caminho === caminho);
        if (!arquivo) return seguir();
        resposta.setHeader("content-type", "application/json; charset=utf-8");
        resposta.end(arquivo.conteudo);
      });
    },
  };
}

if (import.meta.main) {
  const pasta = process.argv[2] ?? "dist";
  const arquivos = await escreverPaginas(pasta);
  console.log(`gerar-paginas: ${arquivos.length} arquivos em ${pasta}`);
}
