import { lerPatrimonio } from "../../src/exportacao/valores";
import {
  CAMINHO_DO_INDICE,
  caminhoDoEquipamento,
  lerIndiceDeGrupos,
  lerPaginaDoEquipamento,
  type IndiceDeGrupos,
  type PaginaCarregada,
} from "../../src/historico";

export type Buscar = (endereco: string) => Promise<Pick<Response, "ok" | "status" | "text">>;

/** O número digitado ou gravado na tag: `/e/004512` e `/e/004512/` dão `004512`. Vazio quando o caminho não é de uma máquina. */
export function patrimonioDoCaminho(caminho: string): string {
  const achado = /^\/e\/([^/]+)\/?$/.exec(caminho);
  const segmento = achado?.[1];
  if (segmento === undefined) return "";
  try {
    return decodeURIComponent(segmento);
  } catch {
    return segmento;
  }
}

/** Baixa só o JSON da máquina pedida. 404 é um número que não existe; qualquer outra falha lança. */
export async function carregarPagina(digitado: string, buscar: Buscar): Promise<PaginaCarregada> {
  const patrimonio = lerPatrimonio(digitado);
  if (!patrimonio.ok) return { tipo: "patrimonio-desconhecido", digitado };

  const resposta = await buscar(caminhoDoEquipamento(patrimonio.valor));
  if (resposta.status === 404) return { tipo: "patrimonio-desconhecido", digitado };
  if (!resposta.ok) throw new Error(`o servidor respondeu ${resposta.status}`);

  const lida = lerPaginaDoEquipamento(await resposta.text());
  if (!lida.ok) throw new Error(`JSON da máquina inválido: ${lida.erros[0].coluna} ${lida.erros[0].problema}`);
  return { tipo: "achado", historico: lida.valor.historico, textos: lida.valor.textos };
}

export async function carregarIndice(buscar: Buscar): Promise<IndiceDeGrupos> {
  const resposta = await buscar(CAMINHO_DO_INDICE);
  if (!resposta.ok) throw new Error(`o servidor respondeu ${resposta.status}`);
  const lido = lerIndiceDeGrupos(await resposta.text());
  if (!lido.ok) throw new Error(`índice de grupos inválido: ${lido.erros[0].coluna} ${lido.erros[0].problema}`);
  return lido.valor;
}
