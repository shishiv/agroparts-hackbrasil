import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { MODELO, transcrever, type Credenciais } from "../functions/api/foto";
import { PRECO_POR_MILHAO, custoDeFotoNova, mediana, palavras, pontuar, type Chamada, type Pontuacao, type Verdade } from "./medicao-foto";

/**
 * bun run scripts/medir-foto.ts chamar --limite <n> [--passadas 2] [--pasta public/exemplos] [--saida docs/medicao/foto-resultados.json] [--registro <arquivo.jsonl>]
 * bun run scripts/medir-foto.ts relatorio [--pasta public/exemplos] [--resultados docs/medicao/foto-resultados.json] [--saida docs/medicao/foto.md]
 *
 * `chamar` gasta chamadas ao Bedrock e se recusa a passar de `--limite`. `relatorio` só lê os resultados gravados.
 */

interface Resultados {
  modelo: string;
  feitoEm: string;
  passadas: Chamada[][];
}

/** Tudo o que vem antes desta linha é regerado; o que vem depois é texto escrito à mão e fica. */
const FIM_DO_GERADO = "<!-- fim do gerado -->";

const RAIZ = new URL("../", import.meta.url).pathname;

function opcao(nome: string, padrao: string | undefined): string | undefined {
  const posicao = process.argv.indexOf(`--${nome}`);
  return posicao < 0 ? padrao : process.argv[posicao + 1];
}

const caminho = (relativo: string): string => (relativo.startsWith("/") ? relativo : `${RAIZ}${relativo}`);

function lerVerdades(pasta: string): { lidoPor: string; fotos: Verdade[] } {
  return JSON.parse(readFileSync(`${caminho(pasta)}/verdade.json`, "utf8"));
}

function credenciais(): Credenciais {
  const arquivo = `${RAIZ}.dev.vars`;
  const doArquivo = Object.fromEntries(
    (existsSync(arquivo) ? readFileSync(arquivo, "utf8") : "")
      .split("\n")
      .filter((linha) => linha.includes("="))
      .map((linha) => [linha.slice(0, linha.indexOf("=")), linha.slice(linha.indexOf("=") + 1)]),
  );
  const variavel = (nome: string): string | undefined => process.env[nome] ?? doArquivo[nome];
  const accessKeyId = variavel("AWS_ACCESS_KEY_ID");
  const secretAccessKey = variavel("AWS_SECRET_ACCESS_KEY");
  const sessionToken = variavel("AWS_SESSION_TOKEN");
  if (!accessKeyId || !secretAccessKey) throw new Error("faltam AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY (ambiente ou .dev.vars)");
  return { accessKeyId, secretAccessKey, ...(sessionToken ? { sessionToken } : {}) };
}

async function chamar(): Promise<void> {
  const pasta = opcao("pasta", "public/exemplos") ?? "";
  const passadas = Number(opcao("passadas", "1"));
  const limite = Number(opcao("limite", undefined));
  const saida = opcao("saida", "docs/medicao/foto-resultados.json") ?? "";
  const registro = opcao("registro", undefined);
  const { fotos } = lerVerdades(pasta);
  const chamadas = fotos.length * passadas;
  if (!Number.isInteger(limite) || chamadas > limite) {
    throw new Error(`são ${chamadas} chamadas e o --limite é ${opcao("limite", "ausente")}: nada foi chamado`);
  }

  const chave = credenciais();
  const resultados: Resultados = { modelo: MODELO, feitoEm: new Date().toISOString(), passadas: [] };
  for (let passada = 1; passada <= passadas; passada++) {
    const feitas: Chamada[] = [];
    for (const { arquivo } of fotos) {
      const jpeg = new Uint8Array(readFileSync(`${caminho(pasta)}/${arquivo}`));
      const resposta = await transcrever(jpeg, chave);
      const feita: Chamada =
        "erro" in resposta
          ? { arquivo, texto: null, ms: 0, uso: null, falha: resposta.erro }
          : { arquivo, texto: resposta.texto, ms: resposta.ms, uso: resposta.uso, falha: null };
      feitas.push(feita);
      if (registro) appendFileSync(registro, `${JSON.stringify({ em: new Date().toISOString(), passada, arquivo, falha: feita.falha })}\n`);
      console.log(`passada ${passada} ${arquivo}: ${feita.falha ?? JSON.stringify(feita.texto)} (${feita.ms} ms)`);
    }
    resultados.passadas.push(feitas);
  }
  writeFileSync(caminho(saida), `${JSON.stringify(resultados, null, 2)}\n`);
}

const linhaDaTabela = (celulas: readonly string[]): string => `| ${celulas.join(" | ")} |`;
const dolares = (valor: number): string => `US$ ${valor.toFixed(5).replace(".", ",")}`;
const percentual = (parte: number, todo: number): string => `${parte} de ${todo}`;
const umaLinha = (texto: string | null): string => (texto ?? "(falhou)").trim().replace(/\s*\n\s*/g, " / ").replace(/\|/g, "\\|");

const DESFECHOS: readonly [Pontuacao["desfecho"], string][] = [
  ["chave-certa", "chave certa"],
  ["chave-errada", "chave errada (par falso possível)"],
  ["revisa", "o motor manda para revisão"],
  ["recusa", "o motor recusa"],
  ["resolve-sem-chave-esperada", "o motor resolve sem a peça ter chave esperada (par falso possível)"],
  ["sem-chave-esperada", "a peça não tem chave esperada, e o motor não resolve"],
];

function horaDeBrasilia(iso: string): string {
  const data = new Date(new Date(iso).getTime() - 3 * 3600_000);
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(data.getUTCDate())}/${dois(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}, ${dois(data.getUTCHours())}:${dois(data.getUTCMinutes())} (Brasília)`;
}

function pontuarPassada(fotos: readonly Verdade[], passada: readonly Chamada[]): Pontuacao[] {
  return fotos.map((verdade, i) => {
    const chamada = passada[i];
    if (chamada?.arquivo !== verdade.arquivo) throw new Error(`a chamada ${i + 1} é de ${chamada?.arquivo}, e a verdade é de ${verdade.arquivo}`);
    return pontuar(verdade, chamada.texto ?? "");
  });
}

const soma = (valores: readonly number[]): number => valores.reduce((a, b) => a + b, 0);

function tabelaFotoAFoto(pontuadas: readonly Pontuacao[]): string[] {
  return [
    "| Foto | Texto lido | Palavra torta | Palavra inventada | Designação lida | Desfecho |",
    "|---|---|---|---|---|---|",
    ...pontuadas.map((p) => {
      const designacao = p.designacaoLida === null ? "sem designação" : p.designacaoLida ? "sim" : "não";
      const torta = p.lidosTortos.map((t) => `${t.lido} (era ${t.verdade})`).join(", ") || "-";
      const nome = DESFECHOS.find(([chave]) => chave === p.desfecho)?.[1] ?? p.desfecho;
      return `| ${p.arquivo} | ${umaLinha(p.texto)} | ${torta} | ${p.inventados.join(", ") || "-"} | ${designacao} | ${nome} |`;
    }),
  ];
}

function relatorio(): void {
  const pasta = opcao("pasta", "public/exemplos") ?? "";
  const resultados: Resultados = JSON.parse(readFileSync(caminho(opcao("resultados", "docs/medicao/foto-resultados.json") ?? ""), "utf8"));
  const { lidoPor, fotos } = lerVerdades(pasta);
  const passadas = resultados.passadas;
  const pontuadas = passadas.map((passada) => pontuarPassada(fotos, passada));
  const primeira = passadas[0] ?? [];
  const nomes = passadas.map((_, i) => `Passada ${i + 1}`);
  const comTexto = fotos.filter((f) => f.linhas.length > 0).length;
  const porPassada = (rotulo: string, calcular: (p: readonly Pontuacao[], i: number) => string): string =>
    linhaDaTabela([rotulo, ...pontuadas.map(calcular)]);
  const cabecalho = (primeiraColuna: string): string[] => [linhaDaTabela([primeiraColuna, ...nomes]), `|---|${nomes.map(() => "---:|").join("")}`];

  const custos = primeira.flatMap((c) => (c.uso ? [custoDeFotoNova(c.uso)] : []));
  const custoMedio = soma(custos) / Math.max(1, custos.length);
  const tempos = (passada: readonly Chamada[]) => passada.filter((c) => c.falha === null).map((c) => c.ms);
  const igualAPrimeira = (i: number): number =>
    (passadas[i] ?? []).filter((c, j) => palavras(c.texto ?? "").join(" ") === palavras(primeira[j]?.texto ?? "").join(" ")).length;

  const linhas: string[] = [
    "# Medição da foto",
    "",
    `Modelo: \`${resultados.modelo}\` (Bedrock, Converse, us-east-1). Medido em ${horaDeBrasilia(resultados.feitoEm)} com \`bun run scripts/medir-foto.ts chamar\`. Esta parte do arquivo sai de \`bun run scripts/medir-foto.ts relatorio\` sobre \`docs/medicao/foto-resultados.json\`; o que vem depois da última linha deste bloco é escrito à mão.`,
    "",
    "## O que estes números valem",
    "",
    `- **${fotos.length} fotos públicas** da Wikimedia Commons (créditos em \`public/exemplos/CREDITOS.txt\`), ${comTexto} com texto na peça e ${fotos.length - comTexto} sem texto legível. **Nenhuma foto do Myke ainda.** Os rolamentos são antigos, abertos ou de outra série. Nenhum é um 6310-2Z C3 de moenda, e é esse o tipo de foto que o produto vai receber.`,
    `- O texto certo de cada foto (\`public/exemplos/verdade.json\`) foi lido por ${lidoPor.split(", olhando")[0]}, ampliando a foto, e conferido com a descrição do autor na Commons. Nenhuma pessoa conferiu. Onde a peça tem marca que a foto não deixa ler, a marca está em \`ambiguo\` e o modelo não é punido por ela.`,
    `- A amostra é pequena: uma foto a mais ou a menos muda a taxa em ${(100 / fotos.length).toFixed(0)} pontos. Serve para achar o tipo de erro, não para prometer uma taxa.`,
    `- Cada foto foi lida ${passadas.length} vezes, na mesma ordem, com o mesmo pedido. A segunda leitura mostra o quanto o modelo repete a si mesmo, já que ele não aceita \`temperature\`.`,
    "",
    "## Resultado",
    "",
    ...cabecalho("O que se mede"),
    porPassada("Designação inteira no texto lido", (p) => {
      const com = p.filter((x) => x.designacaoLida !== null);
      return percentual(com.filter((x) => x.designacaoLida).length, com.length);
    }),
    porPassada("**Chave certa**: o motor resolve o texto lido e a chave é a da designação", (p) => {
      const com = p.filter((x) => x.chaveEsperada !== null);
      return `**${percentual(com.filter((x) => x.desfecho === "chave-certa").length, com.length)}**`;
    }),
    porPassada("Fotos com palavra que não está na peça", (p) => `${percentual(p.filter((x) => x.inventados.length > 0).length, p.length)} (${soma(p.map((x) => x.inventados.length))} palavras, ${soma(p.map((x) => x.caracteresInventados))} caracteres)`),
    porPassada("Fotos com palavra lida torta", (p) => `${percentual(p.filter((x) => x.lidosTortos.length > 0).length, p.length)} (${soma(p.map((x) => x.lidosTortos.length))} palavras)`),
    porPassada("Fotos sem texto em que o modelo escreveu alguma palavra", (p) => percentual(p.filter((x, i) => (fotos[i]?.linhas.length ?? 0) === 0 && x.inventados.length > 0).length, fotos.length - comTexto)),
    porPassada("Palavras da peça lidas exatamente", (p) => `${soma(p.map((x) => x.tokensLidos))} de ${soma(p.map((x) => x.tokensDaVerdade))}`),
    porPassada("Mesmas palavras que na primeira passada", (_, i) => (i === 0 ? "-" : percentual(igualAPrimeira(i), fotos.length))),
    porPassada("Chamadas que falharam", (_, i) => String((passadas[i] ?? []).filter((c) => c.falha !== null).length)),
    "",
    "O que o motor faz com o texto lido, foto a foto:",
    "",
    ...cabecalho("Desfecho"),
    ...DESFECHOS.map(([chave, nome]) => porPassada(nome, (p) => String(p.filter((x) => x.desfecho === chave).length))),
    "",
    "## Tempo e custo por foto",
    "",
    ...cabecalho(""),
    linhaDaTabela(["Tempo da chamada ao Bedrock, mediana", ...passadas.map((p) => `${Math.round(mediana(tempos(p)))} ms`)]),
    linhaDaTabela(["Tempo da chamada, máximo", ...passadas.map((p) => `${Math.max(0, ...tempos(p))} ms`)]),
    "",
    "- O tempo é o da chamada ao Bedrock em us-east-1 vista da máquina que mediu, sem o Cloudflare no meio. O que a pessoa espera soma a ida da foto à função e a volta.",
    `- Custo médio por foto nova (a imagem inteira cobrada como escrita de cache), sobre a primeira passada: **${dolares(custoMedio)}**. Mil fotos custam ${dolares(custoMedio * 1000)}. Preços por milhão de tokens: entrada ${PRECO_POR_MILHAO.entrada}, escrita de cache ${PRECO_POR_MILHAO.escritaDeCache}, leitura de cache ${PRECO_POR_MILHAO.leituraDeCache}, saída ${PRECO_POR_MILHAO.saida} (cartão do modelo na AWS, geo US, 17/11/2026).`,
    "- A mesma foto outra vez é lida do cache da AWS e custa menos. Por isso a conta usa só a primeira passada, e trata como escrita a única foto que uma chamada anterior já tinha posto no cache.",
    "",
    ...pontuadas.flatMap((p, i) => [`## Foto a foto, ${nomes[i]?.toLowerCase()}`, "", ...tabelaFotoAFoto(p), ""]),
    "## Como repetir",
    "",
    "```sh",
    "aws configure export-credentials --profile firstmate-workers --format env-no-export > .dev.vars   # fora do git",
    "bun run scripts/medir-foto.ts chamar --limite 24 --passadas 2",
    "bun run scripts/medir-foto.ts relatorio",
    "```",
    "",
    "Para medir fotos do Myke: ponha os JPEG numa pasta com um `verdade.json` no formato de `public/exemplos/verdade.json` (texto certo em `linhas`, o que a foto não deixa ler em `ambiguo`, a designação que o almoxarifado digitaria em `designacao`) e rode os dois comandos com `--pasta <pasta>`. `chamar` se recusa a passar de `--limite` chamadas.",
    "",
  ];
  const destino = caminho(opcao("saida", "docs/medicao/foto.md") ?? "");
  const existente = existsSync(destino) ? readFileSync(destino, "utf8") : "";
  const depoisDoGerado = existente.includes(FIM_DO_GERADO) ? existente.slice(existente.indexOf(FIM_DO_GERADO) + FIM_DO_GERADO.length) : "\n";
  writeFileSync(destino, `${linhas.join("\n")}${FIM_DO_GERADO}${depoisDoGerado}`);
}

const comando = process.argv[2];
if (comando === "chamar") await chamar();
else if (comando === "relatorio") relatorio();
else throw new Error("use `chamar` ou `relatorio`");
