import type { Atributo, ChaveIdentidade, FamiliaId } from "../contrato";
import { lerChave, lerFamilia, type Tentativa } from "../exportacao/valores";

function ou<T>(tentativa: Tentativa<T>): T {
  if (!tentativa.ok) throw new Error(`valor do motor recusado pelo contrato: ${tentativa.problema}`);
  return tentativa.valor;
}

export const familiaId = (texto: string): FamiliaId => ou(lerFamilia(texto));

/**
 * A chave é a família mais o valor de cada atributo da chave, na ordem que a
 * família declara. Falha se a leitura não trouxer um deles: seria erro da família.
 */
export function montarChave(
  familia: FamiliaId,
  atributosDaChave: readonly string[],
  atributos: readonly Atributo[],
): ChaveIdentidade {
  const partes = atributosDaChave.map((nome) => {
    const atributo = atributos.find((a) => a.nome === nome);
    if (!atributo) throw new Error(`a família ${familia} não leu o atributo ${nome} da chave`);
    return atributo.valor;
  });
  return ou(lerChave([familia, ...partes].join("|")));
}
