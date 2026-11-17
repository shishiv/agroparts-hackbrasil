import type {
  CadastroMaterial,
  CodigoLegado,
  Equipamento,
  ErroDeLinha,
  ExportacaoDaUsina,
  Lido,
  NumeroPatrimonio,
  Saldo,
  Troca,
} from "../contrato";
import { lerTabela } from "./tabela";
import {
  lerCodigo,
  lerData,
  lerDecimal,
  lerObrigatorio,
  lerOrdem,
  lerPatrimonio,
  lerSku,
  lerTipoOrdem,
} from "./valores";

export const ARQUIVOS = {
  equipamentos: "equipamentos.csv",
  materiais: "materiais.csv",
  consumo: "consumo.csv",
  estoque: "estoque.csv",
} as const;

export const COLUNAS_DO_CONSUMO = [
  "ordem",
  "data",
  "patrimonio",
  "tipo_ordem",
  "descricao_ordem",
  "codigo_material",
  "descricao_material",
  "quantidade",
  "unidade",
  "posicao",
] as const;

export interface TextosDaExportacao {
  equipamentos: string;
  materiais: string;
  consumo: string;
  estoque: string;
}

export interface Conhecidos {
  patrimonios?: ReadonlySet<NumeroPatrimonio>;
  codigos?: ReadonlySet<CodigoLegado>;
}

export function lerEquipamentos(texto: string): Lido<readonly Equipamento[]> {
  const vistos = new Set<string>();
  return lerTabela(ARQUIVOS.equipamentos, texto, ["patrimonio", "tag", "nome", "area"], (l) => {
    const patrimonio = l.exige("patrimonio", lerPatrimonio);
    const nome = l.exige("nome", (t) => lerObrigatorio(t, "nome"));
    if (patrimonio === undefined || nome === undefined) return null;
    if (vistos.has(patrimonio)) {
      l.erro("patrimonio", `patrimônio repetido: ${patrimonio}`);
      return null;
    }
    vistos.add(patrimonio);
    return { patrimonio, tag: l.campo("tag"), nome, area: l.campo("area") };
  });
}

export function lerMateriais(texto: string): Lido<readonly CadastroMaterial[]> {
  const vistos = new Set<string>();
  return lerTabela(ARQUIVOS.materiais, texto, ["codigo", "descricao", "unidade", "sku"], (l) => {
    const codigo = l.exige("codigo", lerCodigo);
    const unidade = l.exige("unidade", (t) => lerObrigatorio(t, "unidade"));
    const sku = l.exige("sku", lerSku);
    if (codigo === undefined || unidade === undefined || sku === undefined) return null;
    if (vistos.has(codigo)) {
      l.erro("codigo", `código repetido: ${codigo}`);
      return null;
    }
    vistos.add(codigo);
    return { codigo, descricao: l.campo("descricao"), unidade, sku };
  });
}

export function lerConsumo(texto: string, conhecidos: Conhecidos = {}): Lido<readonly Troca[]> {
  return lerTabela(ARQUIVOS.consumo, texto, COLUNAS_DO_CONSUMO, (l) => {
    const ordem = l.exige("ordem", lerOrdem);
    const data = l.exige("data", lerData);
    const patrimonio = l.exige("patrimonio", lerPatrimonio);
    const tipo = l.exige("tipo_ordem", lerTipoOrdem);
    const codigo = l.exige("codigo_material", lerCodigo);
    const quantidade = l.exige("quantidade", lerDecimal);
    const unidade = l.exige("unidade", (t) => lerObrigatorio(t, "unidade"));
    if (
      ordem === undefined ||
      data === undefined ||
      patrimonio === undefined ||
      tipo === undefined ||
      codigo === undefined ||
      quantidade === undefined ||
      unidade === undefined
    ) {
      return null;
    }
    if (quantidade <= 0) {
      l.erro("quantidade", "a quantidade da troca precisa ser maior que zero");
      return null;
    }
    if (conhecidos.patrimonios && !conhecidos.patrimonios.has(patrimonio)) {
      l.erro("patrimonio", `patrimônio ${patrimonio} não está em ${ARQUIVOS.equipamentos}`);
      return null;
    }
    if (conhecidos.codigos && !conhecidos.codigos.has(codigo)) {
      l.erro("codigo_material", `código ${codigo} não está em ${ARQUIVOS.materiais}`);
      return null;
    }
    const posicao = l.campo("posicao");
    return {
      ordem,
      data,
      patrimonio,
      tipo,
      descricaoOrdem: l.campo("descricao_ordem"),
      codigo,
      descricaoMaterial: l.campo("descricao_material"),
      quantidade,
      unidade,
      posicao: posicao === "" ? null : posicao,
    };
  });
}

export function lerEstoque(texto: string, conhecidos: Conhecidos = {}): Lido<readonly Saldo[]> {
  return lerTabela(ARQUIVOS.estoque, texto, ["codigo", "quantidade", "unidade", "endereco"], (l) => {
    const codigo = l.exige("codigo", lerCodigo);
    const quantidade = l.exige("quantidade", lerDecimal);
    const unidade = l.exige("unidade", (t) => lerObrigatorio(t, "unidade"));
    if (codigo === undefined || quantidade === undefined || unidade === undefined) return null;
    if (conhecidos.codigos && !conhecidos.codigos.has(codigo)) {
      l.erro("codigo", `código ${codigo} não está em ${ARQUIVOS.materiais}`);
      return null;
    }
    const endereco = l.campo("endereco");
    return { codigo, quantidade, unidade, endereco: endereco === "" ? null : endereco };
  });
}

function errosDe(...lidos: Lido<unknown>[]): ErroDeLinha[] {
  return lidos.flatMap((lido) => (lido.ok ? [] : lido.erros));
}

/**
 * Lê os quatro arquivos e confere que o consumo e o estoque só citam
 * patrimônios e códigos que existem nos cadastros.
 */
export function lerExportacao(textos: TextosDaExportacao): Lido<ExportacaoDaUsina> {
  const equipamentos = lerEquipamentos(textos.equipamentos);
  const materiais = lerMateriais(textos.materiais);
  const conhecidos: Conhecidos = {
    ...(equipamentos.ok && {
      patrimonios: new Set(equipamentos.valor.map((e) => e.patrimonio)),
    }),
    ...(materiais.ok && { codigos: new Set(materiais.valor.map((m) => m.codigo)) }),
  };
  const consumo = lerConsumo(textos.consumo, conhecidos);
  const estoque = lerEstoque(textos.estoque, conhecidos);

  if (!equipamentos.ok) {
    return { ok: false, erros: [...equipamentos.erros, ...errosDe(materiais, consumo, estoque)] };
  }
  if (!materiais.ok) {
    return { ok: false, erros: [...materiais.erros, ...errosDe(consumo, estoque)] };
  }
  if (!consumo.ok) return { ok: false, erros: [...consumo.erros, ...errosDe(estoque)] };
  if (!estoque.ok) return { ok: false, erros: estoque.erros };
  return {
    ok: true,
    valor: {
      equipamentos: equipamentos.valor,
      materiais: materiais.valor,
      trocas: consumo.valor,
      estoque: estoque.valor,
    },
  };
}
