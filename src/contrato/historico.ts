import type { Equipamento, Saldo, Troca } from "./cmms";
import type { Leitura } from "./leitura";
import type { CodigoLegado, DataISO, NaoVazia } from "./marcas";
import type { Grupo } from "./unificacao";

export type ItemDoHistorico =
  | {
      tipo: "peca";
      grupo: Grupo;
      trocas: NaoVazia<Troca>;
      codigosUsadosAqui: NaoVazia<CodigoLegado>;
      /** `null` quando as unidades das trocas não batem; a página mostra por código. */
      quantidadeTotal: number | null;
      ultimaTroca: DataISO;
      /** Saldo dos códigos que esta máquina já usou. */
      saldoAqui: readonly Saldo[];
      /** Saldo de códigos do mesmo grupo que esta máquina nunca usou. */
      saldoSobOutroCodigo: readonly Saldo[];
    }
  | {
      tipo: "codigo-sem-chave";
      codigo: CodigoLegado;
      leitura: Exclude<Leitura, { decisao: "resolve" }>;
      trocas: NaoVazia<Troca>;
    };

export interface HistoricoDoEquipamento {
  equipamento: Equipamento;
  itens: readonly ItemDoHistorico[];
  versaoRegras: string;
}

export type ResultadoDaPagina =
  | { tipo: "achado"; historico: HistoricoDoEquipamento }
  | { tipo: "patrimonio-desconhecido"; digitado: string };
