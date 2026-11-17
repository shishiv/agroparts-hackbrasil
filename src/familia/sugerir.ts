import type { CodigoLegado, FamiliaSugerida, NaoVazia } from "../contrato";
import type { Classe } from "./classes";
import { decidir, REGRA, type Regra } from "./decidir";
import { interpretar, montarPedido, type BrutoDoJev, type PedidoAoJev, type RespostaDoJev } from "./pergunta";

/** Faz uma pergunta ao Jev. Em produção é a rede; nos testes, uma resposta gravada. */
export type Jev = (pedido: PedidoAoJev) => Promise<RespostaDoJev>;

export interface Sugestao extends FamiliaSugerida {
  /** O que o Jev respondeu, antes da regra. Fica no arquivo para quem quiser conferir a regra. */
  jev: Pick<BrutoDoJev, "escolha" | "probabilidadeDaEscolha" | "noul">;
}

export interface MaterialParaSugerir {
  codigo: CodigoLegado;
  descricao: string;
}

export async function sugerirFamilia(
  jev: Jev,
  classes: NaoVazia<Classe>,
  material: MaterialParaSugerir,
  regra: Regra = REGRA,
): Promise<Sugestao> {
  const bruto = interpretar(classes, await jev(montarPedido(material.descricao, classes)));
  return {
    codigo: material.codigo,
    ...decidir(bruto, regra),
    modelo: bruto.modelo,
    jev: { escolha: bruto.escolha, probabilidadeDaEscolha: bruto.probabilidadeDaEscolha, noul: bruto.noul },
  };
}

/** Roda `tarefa` sobre cada item com até `simultaneas` ao mesmo tempo e devolve os resultados na ordem de `itens`. */
export async function emParalelo<T, R>(
  itens: readonly T[],
  simultaneas: number,
  tarefa: (item: T) => Promise<R>,
): Promise<readonly R[]> {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;
  const trabalhador = async (): Promise<void> => {
    for (let i = proximo++; i < itens.length; i = proximo++) {
      const item = itens[i] as T;
      resultados[i] = await tarefa(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(simultaneas, itens.length) }, trabalhador));
  return resultados;
}

export function sugerirVarias(
  jev: Jev,
  classes: NaoVazia<Classe>,
  materiais: readonly MaterialParaSugerir[],
  simultaneas: number,
  regra: Regra = REGRA,
): Promise<readonly Sugestao[]> {
  return emParalelo(materiais, simultaneas, (material) => sugerirFamilia(jev, classes, material, regra));
}
