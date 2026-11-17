export type SinalDePrivacidade = "cpf" | "cnpj" | "email" | "telefone" | "onze-digitos-seguidos";

const PADROES: readonly (readonly [SinalDePrivacidade, RegExp])[] = [
  ["cpf", /(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)/],
  ["cnpj", /(?<!\d)\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}(?!\d)/],
  ["email", /[^\s@;,"]+@[^\s@;,"]+\.[^\s@;,"]+/],
  ["telefone", /(?:\+55[\s-]?)?(?:\(\d{2}\)|(?<!\d)\d{2})[\s-]?9?\d{4}-\d{4}(?!\d)/],
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
