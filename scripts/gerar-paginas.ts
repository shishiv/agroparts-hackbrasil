import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";
import type { CadastroMaterial, ErroDeLinha, ExportacaoDaUsina, Unificacao } from "../src/contrato";
import { ARQUIVO_EXEMPLO, ARQUIVOS, lerExportacao, lerLeiturasDeExemplo } from "../src/exportacao";
import { CAMINHO_DO_INDICE, caminhoDoEquipamento, indiceDeGrupos, paginaDoEquipamento } from "../src/historico";
import { agrupar } from "../src/unificacao/agrupar";

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

/**
 * Único ponto em que a unificação entra nas páginas.
 *
 * Hoje lê as leituras que o gerador da demo escreveu em `unificacao-de-exemplo.json`.
 * Quando a fatia 1 (`src/motor/`) passar no gabarito, o corpo inteiro vira uma linha,
 * `return unificar(materiais)`, e as duas leituras do exemplo saem. Os testes da página
 * não dependem do texto de chave ou de rótulo, então não mudam.
 */
async function unificarCadastro(_materiais: readonly CadastroMaterial[]): Promise<Unificacao> {
  const exemplo = lerLeiturasDeExemplo(await lerDaDemo(ARQUIVO_EXEMPLO));
  if (!exemplo.ok) throw new Error(descreverErros(ARQUIVO_EXEMPLO, exemplo.erros));
  return agrupar(exemplo.valor.versaoRegras, exemplo.valor.leituras);
}

/** Um JSON por equipamento e o índice de grupos, na mesma ordem em toda execução. */
export async function gerarPaginas(): Promise<readonly ArquivoGerado[]> {
  const exportacao = await lerExportacaoDaDemo();
  const unificacao = await unificarCadastro(exportacao.materiais);
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
