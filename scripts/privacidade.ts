export type SinalDePrivacidade = "cpf" | "cnpj" | "email" | "telefone" | "onze-digitos-seguidos";

const PADROES: readonly (readonly [SinalDePrivacidade, RegExp])[] = [
  ["cpf", /(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)/],
  ["cnpj", /(?<![0-9A-Z])[0-9A-Z]{2}\.[0-9A-Z]{3}\.[0-9A-Z]{3}\/[0-9A-Z]{4}-\d{2}(?!\d)/i],
  ["email", /[^\s@;,"]+@[^\s@;,"]+\.[^\s@;,"]+/],
  ["telefone", /\(\d{2}\)[\s-]?9?\d{4}[\s-]?\d{4}(?!\d)/],
  ["telefone", /(?<!\d)\d{2}(?:[\s-]9?\d{4}[\s-]?|[\s-]?9?\d{4}[\s-])\d{4}(?!\d)/],
  ["telefone", /(?<![\d-])9?\d{4}-\d{4}(?![\d-])/],
  ["onze-digitos-seguidos", /\d{11,}/],
];

/** Formatos de dado pessoal que não podem entrar na demo, mesmo que o texto seja de catálogo. */
export function acharSinaisDePrivacidade(texto: string): SinalDePrivacidade[] {
  const achados = new Set<SinalDePrivacidade>();
  for (const [sinal, padrao] of PADROES) {
    if (padrao.test(texto)) achados.add(sinal);
  }
  return [...achados];
}
