import type { DefinicaoDeFamilia } from "../../contrato";
import { rolamentoRigidoDeEsferas } from "./rolamento-rigido-de-esferas";

/**
 * Uma entrada por família de peça. A ordem importa: o motor entrega o texto à
 * primeira família que não o recusa como fora das famílias.
 */
export const FAMILIAS: readonly DefinicaoDeFamilia[] = [rolamentoRigidoDeEsferas];
