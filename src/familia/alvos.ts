import type { CadastroMaterial, CodigoLegado } from "../contrato";
import { unificar } from "../motor";
import type { MaterialParaSugerir } from "./sugerir";

export interface Alvos {
  comTexto: readonly MaterialParaSugerir[];
  semTexto: readonly CodigoLegado[];
}

/**
 * Os códigos do cadastro que o motor não resolve. Quem o motor resolve já tem família,
 * e o Jev não opina sobre ele: a sugestão só rotula o que o motor deixou sem grupo.
 */
export function alvosDoJev(materiais: readonly CadastroMaterial[]): Alvos {
  const { leituras } = unificar(materiais);
  const comTexto: MaterialParaSugerir[] = [];
  const semTexto: CodigoLegado[] = [];
  for (const material of materiais) {
    if (leituras.get(material.codigo)?.decisao === "resolve") continue;
    if (material.descricao.trim() === "") semTexto.push(material.codigo);
    else comTexto.push({ codigo: material.codigo, descricao: material.descricao });
  }
  return { comTexto, semTexto };
}
