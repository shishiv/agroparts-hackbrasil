import type { Parte } from "./catmat";

/**
 * O cenário inventado. Cada peça aponta para o item do CATMAT que a define; o
 * gerador confere a peça contra esse item antes de usá-la. O gabarito sai
 * daqui, nunca do motor de leitura.
 */

export const SEMENTE_PADRAO = 20261116;
export const PRIMEIRO_DIA = { ano: 2024, mes: 11, dia: 1 } as const;
export const ULTIMO_DIA = { ano: 2026, mes: 10, dia: 31 } as const;

export interface ParteDoCenario extends Parte {
  /** Quantos códigos a usina tem para esta peça. */
  codigos: number;
  /** SKU da usina de cada código, na ordem dos códigos; `null` é código sem SKU. */
  skus: readonly (string | null)[];
  /** Unidade de cada código, quando não é tudo UN. */
  unidades?: readonly string[];
}

export const PARTES: readonly ParteDoCenario[] = [
  { id: "p01", item: 311967, serie: "6312", vedacao: "ZZ", folga: "C3", codigos: 4, skus: ["ROL-6312", "ROL-6312", "ROL-6312-ZZC3", "ROL-6312-ZZC3"] },
  { id: "p02", item: 472657, serie: "6312", vedacao: "ZZ", folga: "CN", codigos: 2, skus: ["ROL-6312", "ROL-6312"] },
  { id: "p03", item: 472555, serie: "6309", vedacao: "ZZ", folga: "C3", codigos: 3, skus: ["ROL-6309-ZZC3", "ROL-6309-ZZC3", "ROL-6309-ZZC3"] },
  { id: "p04", item: 472551, serie: "6309", vedacao: "2RS", folga: "CN", codigos: 2, skus: ["ROL-6309-2RS", "ROL-6309-2RS"] },
  { id: "p05", item: 472549, serie: "6308", vedacao: "ZZ", folga: "C3", codigos: 3, skus: ["ROL-6308", "ROL-6308", "ROL-6308"], unidades: ["UN", "PC", "UN"] },
  { id: "p06", item: 472547, serie: "6308", vedacao: "2RS", folga: "CN", codigos: 2, skus: ["ROL-6308", "ROL-6308"] },
  { id: "p07", item: 472647, serie: "6210", vedacao: "ZZ", folga: "C3", codigos: 3, skus: ["ROL-6210", "ROL-6210", "ROL-6210"] },
  { id: "p08", item: 472646, serie: "6210", vedacao: "ZZ", folga: "CN", codigos: 2, skus: ["ROL-6210", "ROL-6210"] },
  { id: "p09", item: 472644, serie: "6210", vedacao: "2RS", folga: "CN", codigos: 2, skus: ["ROL-6210", "ROL-6210"] },
  { id: "p10", item: 472516, serie: "6217", vedacao: "ZZ", folga: "C3", codigos: 2, skus: ["ROL-6217", "ROL-6217"] },
  { id: "p11", item: 472558, serie: "6314", vedacao: "ZZ", folga: "CN", codigos: 3, skus: ["ROL-6314-A", "ROL-6314-A", "ROL-6314-B"] },
  { id: "p12", item: 472509, serie: "6211", vedacao: "ZZ", folga: "C3", codigos: 3, skus: ["ROL-6211", "ROL-6211", "ROL-6211"] },
  { id: "p13", item: 472505, serie: "6211", vedacao: "2RS", folga: "CN", codigos: 2, skus: ["ROL-6211", "ROL-6211"] },
  { id: "p14", item: 472639, serie: "6311", vedacao: "ZZ", folga: "C3", codigos: 3, skus: ["ROL-6311", "ROL-6311", "ROL-6311"] },
  { id: "p15", item: 472486, serie: "6205", vedacao: "2RS", folga: "CN", codigos: 2, skus: ["ROL-2RS-PEQ", "ROL-2RS-PEQ"] },
  { id: "p16", item: 472488, serie: "6206", vedacao: "2RS", folga: "CN", codigos: 2, skus: ["ROL-2RS-PEQ", "ROL-2RS-PEQ"] },
  { id: "p17", item: 472458, serie: "6007", vedacao: "ZZ", folga: "CN", codigos: 2, skus: ["ROL-6007", "ROL-6007"] },
  { id: "p18", item: 472483, serie: "6204", vedacao: "2RS", folga: "CN", codigos: 2, skus: ["ROL-6204", null] },
];

export type MotivoDoRevisa = "sufixo-desconhecido" | "designacao-ausente" | "duas-leituras";

/** Texto da usina que parece uma peça do cenário mas não prova qual: o gabarito diz revisa. */
export interface Duplicata {
  id: string;
  texto: string;
  motivo: MotivoDoRevisa;
  /** Peça de que a usina costuma lançar esta duplicata; `null` se o texto não diz. */
  deParte: string | null;
  /** Atributos que o texto traz, para o exemplo marcar os trechos. */
  traz: readonly ("serie" | "folga")[];
  sku: string | null;
}

export const DUPLICATAS: readonly Duplicata[] = [
  { id: "r01", texto: "ROL 6312 C3", motivo: "sufixo-desconhecido", deParte: "p01", traz: ["serie", "folga"], sku: "ROL-6312" },
  { id: "r02", texto: "ROLAMENTO RIGIDO 6309", motivo: "sufixo-desconhecido", deParte: "p03", traz: ["serie"], sku: "ROL-6309-ZZC3" },
  { id: "r03", texto: "ROL. 6210 C3", motivo: "sufixo-desconhecido", deParte: "p07", traz: ["serie", "folga"], sku: "ROL-6210" },
  { id: "r04", texto: "ROLAMENTO P/ MANCAL BOMBA DE CALDO", motivo: "designacao-ausente", deParte: "p01", traz: [], sku: "ROL-GEN" },
  { id: "r05", texto: "ROLAMENTO RIGIDO ESFERAS TAMBOR ESTEIRA", motivo: "designacao-ausente", deParte: "p15", traz: [], sku: "ROL-GEN" },
  { id: "r06", texto: "ROL 6312 ZZ C3 / 6310 ZZ C3", motivo: "duas-leituras", deParte: "p01", traz: [], sku: "ROL-GEN" },
  { id: "r07", texto: "ROLAMENTO 6308 2RS OU 6309 2RS", motivo: "duas-leituras", deParte: "p06", traz: [], sku: "ROL-GEN" },
];

/** Texto da usina com duas informações que se contradizem: o gabarito diz recusa por contradição. */
export interface Contradicao {
  id: string;
  texto: string;
  detalhe: string;
  deParte: string;
  sku: string | null;
}

export const CONTRADICOES: readonly Contradicao[] = [
  { id: "c01", texto: "ROL 6205 ZZ 2RS C3", detalhe: "vedação metálica (ZZ) e de borracha (2RS) no mesmo texto", deParte: "p15", sku: null },
  { id: "c02", texto: "ROLAMENTO 6308 ZZ C3 C4", detalhe: "duas folgas (C3 e C4) no mesmo texto", deParte: "p05", sku: "ROL-6308" },
];

/** Rolamento de esferas que não é rígido de uma carreira: fora da família, e o CATMAT diz isso num campo estruturado. */
export interface OutroRolamento {
  id: string;
  item: number;
  sku: string;
}

export const OUTROS_ROLAMENTOS: readonly OutroRolamento[] = [
  { id: "o01", item: 625866, sku: "ROL-AUTO" },
  { id: "o02", item: 606518, sku: "ROL-ANG" },
];

/** Peça que não é rolamento. `indice` é a posição entre os itens ativos do PDM, em ordem de código. */
export interface OutraPeca {
  id: string;
  pdm: number;
  indice: number;
  sku: string;
  unidade: string;
  quantidades: readonly number[];
}

export const OUTRAS_PECAS_DO_CENARIO: readonly OutraPeca[] = [
  { id: "x01", pdm: 5892, indice: 0, sku: "COR-V", unidade: "UN", quantidades: [1, 2] },
  { id: "x02", pdm: 5892, indice: 1, sku: "COR-V", unidade: "M", quantidades: [2.5, 3, 4.5] },
  { id: "x03", pdm: 5892, indice: 2, sku: "COR-V", unidade: "UN", quantidades: [2, 4] },
  { id: "x04", pdm: 5892, indice: 3, sku: "COR-V", unidade: "UN", quantidades: [1, 2] },
  { id: "x05", pdm: 11707, indice: 0, sku: "RET", unidade: "UN", quantidades: [1, 2] },
  { id: "x06", pdm: 11707, indice: 1, sku: "RET", unidade: "UN", quantidades: [1, 2] },
  { id: "x07", pdm: 11707, indice: 2, sku: "RET", unidade: "UN", quantidades: [2] },
  { id: "x08", pdm: 10954, indice: 0, sku: "POL", unidade: "UN", quantidades: [1] },
  { id: "x09", pdm: 10954, indice: 1, sku: "POL", unidade: "UN", quantidades: [1] },
  { id: "x10", pdm: 2052, indice: 0, sku: "ACO", unidade: "UN", quantidades: [1] },
  { id: "x11", pdm: 2052, indice: 1, sku: "ACO", unidade: "UN", quantidades: [1] },
  { id: "x12", pdm: 11992, indice: 0, sku: "SEL", unidade: "UN", quantidades: [1] },
  { id: "x13", pdm: 11992, indice: 1, sku: "SEL", unidade: "UN", quantidades: [1] },
];

/** Código cadastrado sem descrição: o gabarito diz recusa por falta de texto. */
export const CODIGO_SEM_TEXTO = { id: "t01", deParte: "p17", sku: null } as const;

/** Saldo que o cenário fixa à mão, por código da peça, na ordem dos códigos. */
export const ESTOQUE_FIXO: Readonly<Record<string, readonly { quantidade: number; endereco: string | null }[]>> = {
  p01: [
    { quantidade: 0, endereco: null },
    { quantidade: 0, endereco: null },
    { quantidade: 2, endereco: "A-03-5" },
    { quantidade: 4, endereco: "A-03-2" },
  ],
};

export interface Posicao {
  /** Id de peça (`pNN`), de rolamento fora da família (`oNN`) ou de outra peça (`xNN`). */
  alvo: string;
  posicao: string;
  quantidade: number;
  /** Índices dos códigos da peça que esta máquina nunca lançou. */
  semCodigos?: readonly number[];
}

export interface EquipamentoDoCenario {
  patrimonio: string;
  tag: string;
  nome: string;
  area: string;
  posicoes: readonly Posicao[];
}

export const EQUIPAMENTOS: readonly EquipamentoDoCenario[] = [
  { patrimonio: "004501", tag: "M-101", nome: "Moenda, 1º terno", area: "Extração", posicoes: [
    { alvo: "p10", posicao: "motor, lado acoplamento", quantidade: 2 },
    { alvo: "p14", posicao: "motor, lado oposto", quantidade: 2 },
    { alvo: "x05", posicao: "acionamento hidráulico", quantidade: 1 },
  ] },
  { patrimonio: "004502", tag: "M-102", nome: "Moenda, 2º terno", area: "Extração", posicoes: [
    { alvo: "p10", posicao: "motor, lado acoplamento", quantidade: 2 },
    { alvo: "p14", posicao: "motor, lado oposto", quantidade: 2 },
    { alvo: "x06", posicao: "acionamento hidráulico", quantidade: 1 },
  ] },
  { patrimonio: "004503", tag: "P-101", nome: "Picador de cana", area: "Preparo", posicoes: [
    { alvo: "p07", posicao: "eixo, lado acoplamento", quantidade: 2 },
    { alvo: "p08", posicao: "eixo, lado oposto", quantidade: 2 },
    { alvo: "x01", posicao: "acionamento", quantidade: 1 },
  ] },
  { patrimonio: "004504", tag: "D-101", nome: "Desfibrador", area: "Preparo", posicoes: [
    { alvo: "p05", posicao: "mancal, lado acoplamento", quantidade: 2 },
    { alvo: "p03", posicao: "mancal, lado oposto", quantidade: 2 },
    { alvo: "x10", posicao: "acoplamento do motor", quantidade: 1 },
  ] },
  { patrimonio: "004505", tag: "EC-101", nome: "Esteira de cana nº 1", area: "Recepção", posicoes: [
    { alvo: "p15", posicao: "tambor de acionamento", quantidade: 2 },
    { alvo: "p16", posicao: "tambor de retorno", quantidade: 2 },
    { alvo: "o01", posicao: "roletes de apoio", quantidade: 4 },
    { alvo: "x08", posicao: "acionamento", quantidade: 1 },
  ] },
  { patrimonio: "004512", tag: "B-104", nome: "Bomba de caldo", area: "Caldo", posicoes: [
    { alvo: "p01", posicao: "mancal, lado acoplamento", quantidade: 2 },
    { alvo: "p03", posicao: "mancal, lado oposto", quantidade: 2 },
    { alvo: "x12", posicao: "selagem do eixo", quantidade: 1 },
  ] },
  { patrimonio: "004513", tag: "B-105", nome: "Bomba de caldo", area: "Caldo", posicoes: [
    { alvo: "p01", posicao: "mancal, lado acoplamento", quantidade: 2, semCodigos: [0] },
    { alvo: "p03", posicao: "mancal, lado oposto", quantidade: 2 },
    { alvo: "x13", posicao: "selagem do eixo", quantidade: 1 },
  ] },
  { patrimonio: "004520", tag: "EX-201", nome: "Exaustor da caldeira", area: "Caldeira", posicoes: [
    { alvo: "p11", posicao: "mancal, lado do motor", quantidade: 2 },
    { alvo: "p12", posicao: "mancal, lado do rotor", quantidade: 2 },
    { alvo: "x02", posicao: "transmissão", quantidade: 3 },
    { alvo: "x09", posicao: "transmissão", quantidade: 1 },
  ] },
  { patrimonio: "004521", tag: "VT-202", nome: "Ventilador de ar secundário", area: "Caldeira", posicoes: [
    { alvo: "p12", posicao: "mancal, lado do rotor", quantidade: 2 },
    { alvo: "p13", posicao: "mancal, lado do motor", quantidade: 2 },
    { alvo: "x03", posicao: "transmissão", quantidade: 2 },
    { alvo: "o02", posicao: "mancal axial", quantidade: 1 },
  ] },
  { patrimonio: "004530", tag: "RD-101", nome: "Redutor da moenda 1", area: "Extração", posicoes: [
    { alvo: "p02", posicao: "eixo de entrada", quantidade: 2 },
    { alvo: "p04", posicao: "eixo de saída", quantidade: 2 },
    { alvo: "x07", posicao: "tampa do eixo", quantidade: 2 },
    { alvo: "x11", posicao: "acoplamento", quantidade: 1 },
  ] },
  { patrimonio: "004531", tag: "RD-102", nome: "Redutor do picador", area: "Preparo", posicoes: [
    { alvo: "p06", posicao: "eixo de entrada", quantidade: 2 },
    { alvo: "p09", posicao: "eixo de saída", quantidade: 2 },
    { alvo: "x04", posicao: "acionamento", quantidade: 2 },
  ] },
  { patrimonio: "004540", tag: "BV-301", nome: "Bomba de vácuo do filtro", area: "Filtração", posicoes: [
    { alvo: "p17", posicao: "mancal, lado acoplamento", quantidade: 2 },
    { alvo: "p18", posicao: "mancal, lado oposto", quantidade: 2 },
    { alvo: "x12", posicao: "selagem do eixo", quantidade: 1 },
  ] },
];
