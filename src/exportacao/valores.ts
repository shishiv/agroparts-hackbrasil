import type {
  ChaveIdentidade,
  CodigoLegado,
  DataISO,
  FamiliaId,
  NumeroOrdem,
  NumeroPatrimonio,
  SkuUsina,
  TipoOrdem,
} from "../contrato";

export type Tentativa<T> = { ok: true; valor: T } | { ok: false; problema: string };

const certo = <T>(valor: T): Tentativa<T> => ({ ok: true, valor });
const errado = (problema: string): Tentativa<never> => ({ ok: false, problema });

const SEM_CONTROLE = /^[^\u0000-\u001f\u007f]+$/;

// As funções abaixo são as únicas que criam valores marcados do contrato.

export function lerPatrimonio(texto: string): Tentativa<NumeroPatrimonio> {
  if (texto === "") return errado("patrimônio vazio");
  if (!/^[0-9A-Za-z][0-9A-Za-z-]{0,19}$/.test(texto)) {
    return errado(`patrimônio inválido: "${texto}" (use letras, números e hífen, até 20 caracteres)`);
  }
  return certo(texto as NumeroPatrimonio);
}

export function lerCodigo(texto: string): Tentativa<CodigoLegado> {
  if (texto === "") return errado("código vazio");
  if (!/^[0-9A-Za-z][0-9A-Za-z.-]{0,29}$/.test(texto)) {
    return errado(`código inválido: "${texto}" (use letras, números, ponto e hífen, até 30 caracteres)`);
  }
  return certo(texto as CodigoLegado);
}

export function lerOrdem(texto: string): Tentativa<NumeroOrdem> {
  if (texto === "") return errado("número da ordem vazio");
  if (!/^[0-9A-Za-z][0-9A-Za-z./-]{0,29}$/.test(texto)) {
    return errado(`número da ordem inválido: "${texto}"`);
  }
  return certo(texto as NumeroOrdem);
}

export function lerSku(texto: string): Tentativa<SkuUsina | null> {
  if (texto === "") return certo(null);
  if (texto.length > 60 || !SEM_CONTROLE.test(texto)) return errado(`SKU inválido: "${texto}"`);
  return certo(texto as SkuUsina);
}

export function lerChave(texto: string): Tentativa<ChaveIdentidade> {
  if (texto === "" || texto.length > 200 || !SEM_CONTROLE.test(texto)) {
    return errado(`chave inválida: "${texto}"`);
  }
  return certo(texto as ChaveIdentidade);
}

export function lerFamilia(texto: string): Tentativa<FamiliaId> {
  if (texto === "" || texto.length > 100 || !SEM_CONTROLE.test(texto)) {
    return errado(`família inválida: "${texto}"`);
  }
  return certo(texto as FamiliaId);
}

/** dd/mm/aaaa vira AAAA-MM-DD. Recusa dia que não existe, como 31/02/2026. */
export function lerData(texto: string): Tentativa<DataISO> {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return errado(`data inválida: "${texto}" (use dd/mm/aaaa)`);
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const existe =
    ano >= 1900 &&
    ano <= 2100 &&
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia;
  if (!existe) return errado(`data que não existe: "${texto}"`);
  return certo(`${m[3]}-${m[2]}-${m[1]}` as DataISO);
}

/** Vírgula decimal, ponto opcional como milhar: "1.234,5" vira 1234.5. */
export function lerDecimal(texto: string): Tentativa<number> {
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(texto)) {
    return errado(`número inválido: "${texto}" (use vírgula decimal, como 1,5)`);
  }
  const valor = Number(texto.replaceAll(".", "").replace(",", "."));
  if (!Number.isFinite(valor)) return errado(`número fora do limite: "${texto}"`);
  return certo(valor);
}

const TIPOS: ReadonlyMap<string, TipoOrdem> = new Map([
  ["preventiva", "preventiva"],
  ["corretiva", "corretiva"],
  ["preditiva", "preditiva"],
  ["outra", "outra"],
]);

export function lerTipoOrdem(texto: string): Tentativa<TipoOrdem> {
  const tipo = TIPOS.get(texto.toLowerCase());
  if (!tipo) {
    return errado(`tipo de ordem desconhecido: "${texto}" (use preventiva, corretiva, preditiva ou outra)`);
  }
  return certo(tipo);
}

export function lerObrigatorio(texto: string, nome: string): Tentativa<string> {
  return texto === "" ? errado(`${nome} vazio`) : certo(texto);
}
