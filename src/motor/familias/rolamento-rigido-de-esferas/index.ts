import type { DefinicaoDeFamilia } from "../../../contrato";
import { ATRIBUTOS_DA_CHAVE, ID_DA_FAMILIA, lerRolamento } from "./leitura";

export { rotuloDaPeca } from "./leitura";
export { SERIES_EM_ORDEM, serieDaDesignacao } from "./designacao";

export const rolamentoRigidoDeEsferas: DefinicaoDeFamilia = {
  id: ID_DA_FAMILIA,
  nome: "Rolamento rígido de esferas",
  atributosDaChave: ATRIBUTOS_DA_CHAVE,
  ler: (textoNormalizado) => lerRolamento(textoNormalizado),
};
