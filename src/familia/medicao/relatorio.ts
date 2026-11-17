import { MODELO_DO_JEV } from "../pergunta";
import type { Amostra } from "./amostra";
import { intervaloDeWilson, type Avaliacao, type Fracao, type Resultados, type Veredito } from "./avaliar";
import type { Protocolo } from "./protocolo";

/** Preço de entrada do Jev 1.14 em dólares por milhão de tokens, na tabela de https://docs.typesafe.ai/models.md. */
export const DOLARES_POR_MILHAO_DE_TOKENS = 0.042;

export interface DadosDoRelatorio {
  protocolo: Protocolo;
  amostra: Amostra;
  /** Quantas classes o Jev recebeu como opção, sem contar "nenhuma". */
  classesOferecidas: number;
  /** Ausentes antes da medição: o relatório sai só com o protocolo. */
  medicao: { resultados: Resultados; avaliacao: Avaliacao } | null;
}

const virgula = (n: number, casas: number): string => n.toFixed(casas).replace(".", ",");

export function percentual({ k, n }: Fracao): string {
  return n === 0 ? "sem itens" : `${virgula((100 * k) / n, 1)}%`;
}

function comIntervalo(fracao: Fracao): string {
  if (fracao.n === 0) return "sem itens";
  const [de, ate] = intervaloDeWilson(fracao);
  return `${percentual(fracao)} (${virgula(100 * de, 0)}% a ${virgula(100 * ate, 0)}%)`;
}

const celula = (texto: string): string => texto.replaceAll("|", "/");

function tabela(cabecalho: readonly string[], linhas: readonly (readonly string[])[]): string {
  const separador = cabecalho.map((_, i) => (i < 2 ? "---" : "---:"));
  return [cabecalho, separador, ...linhas.map((l) => l.map(celula))].map((l) => `| ${l.join(" | ")} |`).join("\n");
}

function secaoDoProtocolo({ protocolo, amostra, classesOferecidas }: DadosDoRelatorio): string {
  const { limiares, regra } = protocolo;
  const dentro = amostra.classes.filter((c) => c.dentro).length;
  const fora = amostra.classes.length - dentro;
  const itensFora = amostra.itens.filter((i) => amostra.classes.find((c) => c.codigo === i.codigoClasse)?.dentro === false).length;
  return `## Protocolo

Escrito e commitado antes da primeira chamada ao Jev sobre a amostra. O arquivo \`src/familia/medicao/protocolo.ts\` guarda os mesmos números, e este texto sai dele.

**O que o Jev recebe.** A descrição de um item. Duas perguntas na mesma chamada: um Choice entre ${classesOferecidas} classes do CATMAT (as classes ativas dos grupos listados em \`GRUPOS_OFERECIDOS\`, em \`src/familia/classes.ts\`) mais "nenhuma", e um Noul companheiro que pergunta se alguma dessas classes serve. O modelo é o \`${MODELO_DO_JEV}\`, pinado em \`MODELO_DO_JEV\`, porque os limiares valem para ele e um alias muda sem aviso.

**Regra.** A sugestão é uma classe só quando o Noul é de ${virgula(regra.noulMinimo, 2)} ou mais, o Choice não escolheu "nenhuma" e a probabilidade da classe escolhida é de ${virgula(regra.escolhaMinima, 2)} ou mais (\`${regra.versao}\`). Nos outros casos a resposta é "nenhuma". A pergunta teve duas versões, e as duas só rodaram nos 24 códigos do cadastro da demo, que não fazem parte da amostra. A segunda manda escolher pela peça que o texto nomeia, e não pelo material nem pelo equipamento, e é a que vale aqui. A regra e a pergunta não mudam depois da amostra.

**Amostra.** ${amostra.itens.length} itens públicos do CATMAT, consultados em ${amostra.consultadoEm}: ${protocolo.itensPorClasse} por classe, em ${dentro} classes oferecidas e ${fora} classes que o Jev não recebe. O sorteio pega os itens ativos da classe, sem sinal de dado pessoal e com descrição diferente, e ordena por um hash de \`${amostra.semente}\` e do código do item (\`sortearItens\`, em \`src/familia/medicao/amostra.ts\`). A amostra está em \`docs/medicao/familia-amostra.json\`.

**O que é certo.** Para um item de classe oferecida, a classe que o próprio CATMAT lhe dá. Para um item das ${fora} classes não oferecidas (${itensFora} itens), "nenhuma".

**Ordem das opções.** O Jev tende a favorecer as primeiras opções de um Choice (https://docs.typesafe.ai/model-jaggedness.md). ${protocolo.itensNaInversao} itens de classes oferecidas são perguntados de novo com as classes na ordem inversa, e a decisão tem de continuar a mesma.

**O que cada resultado decide.** Uma medida passa quando o valor medido, sem o intervalo, chega ao mínimo.

${tabela(
  ["medida", "o que conta", "mínimo"],
  [
    ["precisão das sugestões", "das sugestões de classe para itens de classes oferecidas, as que batem com o CATMAT", `${virgula(100 * limiares.precisaoDasSugestoes, 0)}%`],
    ["controles em \"nenhuma\"", "dos itens de classes não oferecidas, os que terminam em \"nenhuma\"", `${virgula(100 * limiares.controlesEmNenhuma, 0)}%`],
    ["cobertura", "dos itens de classes oferecidas, os que recebem uma sugestão de classe", `${virgula(100 * limiares.cobertura, 0)}%`],
    ["concordância ao inverter a ordem", "dos itens repetidos, os que mantêm a mesma decisão", `${virgula(100 * limiares.concordanciaAoInverter, 0)}%`],
    ["acerto por classe", "dos itens da classe, os em que o Choice escolheu a classe certa", `${virgula(100 * limiares.acertoMinimoPorClasse, 0)}% (abaixo, a classe é fraca)`],
  ],
)}

- O selo de família sugerida entra na página do equipamento e na tela de diagnóstico só se a precisão e os controles passarem. Se algum falhar, o selo fica fora e este arquivo diz por quê.
- Se a cobertura não passar, o selo entra e o texto público diz que ele aparece em poucos códigos.
- Se a concordância não passar, o resultado vale só para esta ordem de opções, e o arquivo diz isso.
- Uma classe fraca fica listada. Nenhuma regra a esconde do selo, porque dez itens por classe não sustentam uma regra por classe.`;
}

const LIMITES = `## O que estes números valem

- Os itens são descrições do catálogo, que começam pelo nome padronizado da peça (por exemplo "RETENTOR, ..."). O texto livre de uma usina ("ROL 6312 C3") traz menos pista, e a precisão ali deve ser menor.
- Dez itens por classe dão um intervalo largo. O intervalo de 95% (Wilson) vem ao lado de cada número.
- É uma execução de um modelo, numa data. A TypeSafe diz que o Jev não é treinado com pedidos de clientes. O catálogo do CATMAT é público, e o modelo pode tê-lo visto no treino, o que não dá para medir daqui.
- A medição não treina nenhum classificador com as respostas do Jev (cláusula 2.3 (b) de https://typesafe.ai/legal/mca).`;

function linhaDoVeredito(v: Veredito): string {
  return `| ${v.nome} | ${v.k} de ${v.n} | ${comIntervalo(v)} | ${virgula(100 * v.minimo, 0)}% | ${v.passou ? "passou" : "não passou"} |`;
}

function secaoDoResultado(dados: DadosDoRelatorio, resultados: Resultados, avaliacao: Avaliacao): string {
  const nomeDe = new Map(dados.amostra.classes.map((c) => [c.codigo, c.nome]));
  const nome = (codigo: string): string => (codigo === "nenhuma" ? "nenhuma" : `${codigo} ${nomeDe.get(codigo) ?? ""}`.trim());
  const { vereditos, dentro, fora, inversao } = avaliacao;

  const veredito = avaliacao.seloEntra
    ? "O selo de família sugerida entra, porque a precisão e os controles passaram."
    : "O selo de família sugerida não entra, porque a precisão ou os controles não passaram.";
  const custo = (resultados.tokensDeEntrada / 1_000_000) * DOLARES_POR_MILHAO_DE_TOKENS;

  const porClasse = avaliacao.porClasse.map((r) => [
    r.classe.codigo,
    r.classe.nome.slice(0, 60),
    r.classe.dentro ? "oferecida" : "fora",
    String(r.itens),
    r.classe.dentro ? `${r.escolhaCerta}` : "",
    String(r.sugestoes),
    r.classe.dentro ? String(r.sugestoesCertas) : "",
    String(r.emNenhuma),
    avaliacao.classesFracas.includes(r) ? "fraca" : "",
  ]);

  const confusoes = avaliacao.confusoes.length
    ? tabela(["esperada", "escolhida", "vezes"], avaliacao.confusoes.map((c) => [nome(c.esperada).slice(0, 60), nome(c.escolhida).slice(0, 60), String(c.vezes)]))
    : "O Choice acertou todos os itens de classes oferecidas.";

  const faixas = tabela(
    ["probabilidade da escolha", "itens", "escolha certa", "acerto"],
    avaliacao.faixas.map((f) => [`${virgula(f.de, 1)} a ${virgula(f.ate, 1)}`, String(f.itens), String(f.escolhaCerta), percentual({ k: f.escolhaCerta, n: f.itens })]),
  );

  return `## Resultado

Modelo \`${resultados.modelo}\`, ${resultados.chamadas} pedidos distintos ao Jev, ${resultados.tokensDeEntrada} tokens de entrada (cerca de US$ ${virgula(custo, 3)} pela tabela de preços). O SDK pode ter repetido um pedido por erro de rede, e isso não entra na conta.

${veredito}

| medida | k de n | acerto (intervalo de 95%) | mínimo | resultado |
|---|---|---|---:|---|
${linhaDoVeredito(vereditos.precisao)}
${linhaDoVeredito(vereditos.controles)}
${linhaDoVeredito(vereditos.cobertura)}
${linhaDoVeredito(vereditos.inversao)}

Escolha do Choice sem a regra: ${dentro.escolhaCerta} de ${dentro.itens} itens de classes oferecidas na classe certa (${comIntervalo({ k: dentro.escolhaCerta, n: dentro.itens })}). Nas ${fora.itens} amostras de classes não oferecidas, ${fora.emNenhuma} terminaram em "nenhuma".

### Por classe

${tabela(["classe", "nome", "tipo", "itens", "escolha certa", "sugestões", "sugestões certas", "em nenhuma", "marca"], porClasse)}

${avaliacao.classesFracas.length === 0 ? "Nenhuma classe oferecida ficou abaixo do mínimo." : `Classes fracas: ${avaliacao.classesFracas.map((r) => r.classe.codigo).join(", ")}.`}

### Onde o Choice errou

${confusoes}

### A probabilidade da escolha

${faixas}

### Ordem das opções

Dos ${inversao.itens} itens repetidos com as opções na ordem inversa, ${inversao.mesmaEscolha} mantiveram a classe escolhida e ${inversao.mesmaDecisao} mantiveram a decisão. A classe certa foi escolhida em ${inversao.escolhaCertaNaOrdemNormal} na ordem normal e em ${inversao.escolhaCertaInvertida} na inversa.`;
}

export function formatarRelatorio(dados: DadosDoRelatorio): string {
  const { medicao } = dados;
  const resultado = medicao
    ? secaoDoResultado(dados, medicao.resultados, medicao.avaliacao)
    : "## Resultado\n\nAinda não medido.";
  return `# Família sugerida pelo Jev

Acerto da classe do CATMAT que o Jev sugere para um código que o motor não resolve como rolamento, medido contra a classe que o próprio CATMAT dá a itens públicos. Protocolo \`${dados.protocolo.versao}\`.

${secaoDoProtocolo(dados)}

${LIMITES}

${resultado}
`;
}
