import type { ErroDeLinha, Lido } from "../../contrato";
import type { Ordem, RespostaMedida, Resultados } from "./avaliar";

const ARQUIVO = "familia-respostas.json";

type Objeto = Record<string, unknown>;
const ehObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);
const ehProbabilidade = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const ORDENS: readonly Ordem[] = ["crescente", "invertida"];

export function escreverResultados(resultados: Resultados): string {
  const linhas = [
    "{",
    `  "modelo": ${JSON.stringify(resultados.modelo)},`,
    `  "chamadas": ${resultados.chamadas},`,
    `  "tokensDeEntrada": ${resultados.tokensDeEntrada},`,
    '  "respostas": [',
    resultados.respostas.map((r) => `    ${JSON.stringify(r)}`).join(",\n"),
    "  ]",
    "}",
  ];
  return `${linhas.join("\n")}\n`;
}

export function lerResultados(texto: string): Lido<Resultados> {
  const erros: ErroDeLinha[] = [];
  const erro = (coluna: string, problema: string): void => {
    erros.push({ arquivo: ARQUIVO, linha: 0, coluna, problema });
  };
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { ok: false, erros: [{ arquivo: ARQUIVO, linha: 0, coluna: "", problema: "JSON inválido" }] };
  }
  if (!ehObjeto(bruto)) {
    return { ok: false, erros: [{ arquivo: ARQUIVO, linha: 0, coluna: "", problema: "esperava um objeto na raiz" }] };
  }
  const { modelo, chamadas, tokensDeEntrada } = bruto;
  if (typeof modelo !== "string" || modelo === "") erro("modelo", "esperava um texto");
  if (typeof chamadas !== "number" || !Number.isInteger(chamadas)) erro("chamadas", "esperava um inteiro");
  if (typeof tokensDeEntrada !== "number" || !Number.isInteger(tokensDeEntrada)) erro("tokensDeEntrada", "esperava um inteiro");

  const respostas: RespostaMedida[] = [];
  const vistas = new Set<string>();
  const lista: unknown[] = Array.isArray(bruto.respostas) ? bruto.respostas : [];
  if (!Array.isArray(bruto.respostas)) erro("respostas", "esperava uma lista");
  lista.forEach((r, i) => {
    const onde = `respostas[${i}]`;
    if (!ehObjeto(r) || typeof r.codigoItem !== "number" || typeof r.escolha !== "string") {
      return erro(onde, "esperava codigoItem e escolha");
    }
    const ordem = ORDENS.find((o) => o === r.ordem);
    if (!ordem) return erro(`${onde}.ordem`, "esperava crescente ou invertida");
    if (!ehProbabilidade(r.probabilidadeDaEscolha) || !ehProbabilidade(r.noul)) {
      return erro(onde, "esperava probabilidadeDaEscolha e noul de 0 a 1");
    }
    const chave = `${r.codigoItem}:${ordem}`;
    if (vistas.has(chave)) return erro(onde, `resposta repetida: ${chave}`);
    vistas.add(chave);
    respostas.push({
      codigoItem: r.codigoItem,
      ordem,
      escolha: r.escolha,
      probabilidadeDaEscolha: r.probabilidadeDaEscolha,
      noul: r.noul,
    });
  });

  const [primeiro, ...resto] = erros;
  if (primeiro) return { ok: false, erros: [primeiro, ...resto] };
  return { ok: true, valor: { modelo: String(modelo), chamadas: Number(chamadas), tokensDeEntrada: Number(tokensDeEntrada), respostas } };
}
