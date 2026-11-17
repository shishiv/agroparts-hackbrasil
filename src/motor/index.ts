import type { Motor } from "../contrato";
import { ler } from "./ler";
import { unificar } from "./unificar";

export { FAMILIAS } from "./familias";
export { ler } from "./ler";
export { VERSAO_REGRAS, unificar } from "./unificar";

export const motor: Motor = { ler, unificar };
