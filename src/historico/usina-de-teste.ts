import type { CodigoLegado, ExportacaoDaUsina, Unificacao } from "../contrato";
import { lerExportacao, lerLeiturasDeExemplo } from "../exportacao";
import { agrupar } from "../unificacao/agrupar";

export interface TrocaDeTeste {
  ordem: string;
  data: string;
  patrimonio: string;
  codigo: string;
  quantidade: string;
  unidade?: string;
  posicao?: string;
}

export interface UsinaDeTeste {
  equipamentos: readonly string[];
  /** Um código por texto: `codigo;descricao;unidade`. */
  materiais: readonly string[];
  trocas: readonly TrocaDeTeste[];
  /** `codigo;quantidade;unidade;endereco` */
  estoque: readonly string[];
  /** Códigos que resolvem, com a chave que o motor teria lido. Quem não está aqui nem em `revisa` é recusado. */
  resolve: Readonly<Record<string, string>>;
  revisa?: readonly string[];
}

const comCabecalho = (cabecalho: string, linhas: readonly string[]) => [cabecalho, ...linhas].join("\n");

/**
 * Monta uma usina pequena pelos mesmos leitores que a demo usa, para que os testes
 * não precisem de marca nenhuma escrita à mão.
 */
export function usinaDeTeste(usina: UsinaDeTeste): { exportacao: ExportacaoDaUsina; unificacao: Unificacao } {
  const lido = lerExportacao({
    equipamentos: comCabecalho("patrimonio;tag;nome;area", usina.equipamentos),
    materiais: comCabecalho(
      "codigo;descricao;unidade;sku",
      usina.materiais.map((m) => `${m};`),
    ),
    consumo: comCabecalho(
      "ordem;data;patrimonio;tipo_ordem;descricao_ordem;codigo_material;descricao_material;quantidade;unidade;posicao",
      usina.trocas.map(
        (t) =>
          `${t.ordem};${t.data};${t.patrimonio};corretiva;serviço;${t.codigo};texto;${t.quantidade};${t.unidade ?? "UN"};${t.posicao ?? ""}`,
      ),
    ),
    estoque: comCabecalho("codigo;quantidade;unidade;endereco", usina.estoque),
  });
  if (!lido.ok) throw new Error(`usina de teste inválida: ${JSON.stringify(lido.erros)}`);

  const codigos = lido.valor.materiais.map((m) => m.codigo);
  const leitura = (codigo: CodigoLegado) => {
    const chave = usina.resolve[codigo];
    if (chave !== undefined) {
      return { decisao: "resolve", familia: "familia", chave, rotulo: `Peça ${chave}`, atributos: [] };
    }
    if (usina.revisa?.includes(codigo)) {
      return { decisao: "revisa", familia: null, pendencias: ["designacao-ausente"], atributos: [] };
    }
    return { decisao: "recusa", motivo: "fora-das-familias", detalhe: "fora da família", atributos: [] };
  };
  const exemplo = lerLeiturasDeExemplo(
    JSON.stringify({
      versaoRegras: "teste",
      leituras: codigos.map((codigo) => ({ codigo, leitura: leitura(codigo) })),
    }),
  );
  if (!exemplo.ok) throw new Error(`leituras de teste inválidas: ${JSON.stringify(exemplo.erros)}`);
  return { exportacao: lido.valor, unificacao: agrupar(exemplo.valor.versaoRegras, exemplo.valor.leituras) };
}
