import type { ErroDeLinha, Lido, NaoVazia } from "../contrato";
import { lerCsv } from "./csv";
import type { Tentativa } from "./valores";

export interface LinhaLida {
  campo(coluna: string): string;
  /** Lê o campo com `ler`; se falhar, registra o erro na coluna e devolve `undefined`. */
  exige<T>(coluna: string, ler: (texto: string) => Tentativa<T>): T | undefined;
  erro(coluna: string, problema: string): void;
}

function comoNaoVazia(erros: ErroDeLinha[]): NaoVazia<ErroDeLinha> | null {
  const [primeiro, ...resto] = erros;
  return primeiro ? [primeiro, ...resto] : null;
}

/**
 * Lê um CSV da usina, na ordem de colunas que vier, e junta os erros de todas
 * as linhas em vez de parar no primeiro. `lerLinha` devolve `null` quando a
 * linha tem erro.
 */
export function lerTabela<T>(
  arquivo: string,
  texto: string,
  colunas: readonly string[],
  lerLinha: (linha: LinhaLida) => T | null,
): Lido<readonly T[]> {
  const csv = lerCsv(texto);
  if (!csv.ok) {
    return { ok: false, erros: [{ arquivo, linha: csv.linha, coluna: "", problema: csv.problema }] };
  }
  const [cabecalho, ...registros] = csv.registros;
  if (!cabecalho) {
    return { ok: false, erros: [{ arquivo, linha: 1, coluna: "", problema: "arquivo vazio" }] };
  }

  const posicao = new Map<string, number>();
  cabecalho.campos.forEach((nome, i) => {
    const chave = nome.toLowerCase();
    if (!posicao.has(chave)) posicao.set(chave, i);
  });
  const erros: ErroDeLinha[] = [];
  for (const coluna of colunas) {
    if (!posicao.has(coluna)) {
      erros.push({ arquivo, linha: cabecalho.numero, coluna, problema: "coluna ausente no cabeçalho" });
    }
  }
  const semColuna = comoNaoVazia(erros);
  if (semColuna) return { ok: false, erros: semColuna };

  const valores: T[] = [];
  for (const registro of registros) {
    if (registro.campos.length !== cabecalho.campos.length) {
      erros.push({
        arquivo,
        linha: registro.numero,
        coluna: "",
        problema: `${registro.campos.length} campos, o cabeçalho tem ${cabecalho.campos.length}`,
      });
      continue;
    }
    let comErro = false;
    const erro = (coluna: string, problema: string) => {
      comErro = true;
      erros.push({ arquivo, linha: registro.numero, coluna, problema });
    };
    const campo = (coluna: string) => registro.campos[posicao.get(coluna) ?? -1] ?? "";
    const exige = <V>(coluna: string, ler: (t: string) => Tentativa<V>): V | undefined => {
      const lido = ler(campo(coluna));
      if (lido.ok) return lido.valor;
      erro(coluna, lido.problema);
      return undefined;
    };
    const valor = lerLinha({ campo, exige, erro });
    if (valor !== null && !comErro) valores.push(valor);
  }

  const lista = comoNaoVazia(erros);
  return lista ? { ok: false, erros: lista } : { ok: true, valor: valores };
}
