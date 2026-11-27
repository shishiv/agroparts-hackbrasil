import type {
  Atributo,
  CodigoLegado,
  Equipamento,
  ItemDoHistorico,
  Leitura,
  MotivoRecusa,
  Origem,
  PecaIdentificada,
  Pendencia,
  Saldo,
  Troca,
} from "../../src/contrato";
import { somarQuantidades, type PaginaCarregada, type TextoDoCodigo } from "../../src/historico";
import { h, type Filho } from "../inicio/dom";
import { desenharPlaca } from "../inicio/placa";

type Achado = Extract<PaginaCarregada, { tipo: "achado" }>;
type Peca = Extract<ItemDoHistorico, { tipo: "peca" }>;
type SemChave = Extract<ItemDoHistorico, { tipo: "codigo-sem-chave" }>;
type Textos = ReadonlyMap<CodigoLegado, TextoDoCodigo>;

const dataBR = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const numeroBR = (n: number): string => String(n).replace(".", ",");

/** As unidades da exportação que têm nome por extenso; as outras aparecem como vieram. */
const UNIDADES: Readonly<Record<string, readonly [string, string]>> = { UN: ["unidade", "unidades"], PC: ["peça", "peças"] };

const nomeDaUnidade = (unidade: string, n = 2): string => UNIDADES[unidade]?.[n === 1 ? 0 : 1] ?? unidade;

const comUnidade = (n: number, unidade: string): string => `${numeroBR(n)} ${nomeDaUnidade(unidade, n)}`;

function juntarComE(itens: readonly string[]): string {
  return itens.length < 2 ? itens.join("") : `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;
}

const contagem = (n: number, singular: string, plural: string): string => `${n} ${n === 1 ? singular : plural}`;

const PENDENCIAS: Readonly<Record<Pendencia, string>> = {
  "sufixo-desconhecido": "Falta o sufixo do rolamento, como ZZ ou 2RS.",
  "designacao-ausente": "O texto não traz o número do rolamento.",
  "duas-leituras": "O texto traz mais de um número de rolamento.",
};

const MOTIVOS: Readonly<Record<MotivoRecusa, string>> = {
  contradicao: "O texto se contradiz.",
  "fora-das-familias": "Ainda não há regra para somar este tipo de peça.",
  "sem-texto": "O cadastro não tem descrição.",
};

const MOTIVOS_DA_ENTRADA: Readonly<Record<MotivoRecusa, string>> = {
  contradicao: "O texto se contradiz.",
  "fora-das-familias": "Só rolamento rígido de esferas é identificado por enquanto.",
  "sem-texto": "Não há texto para ler.",
};

function motivoDaLeitura(leitura: Exclude<Leitura, { decisao: "resolve" }>): string {
  return leitura.decisao === "revisa" ? leitura.pendencias.map((p) => PENDENCIAS[p]).join(" ") : MOTIVOS[leitura.motivo];
}

/** O texto que o modelo escreveu a partir da foto ou do áudio. A pessoa pode tê-lo corrigido antes de confirmar. */
function textoQueVeio(origem: Origem): { quem: string; texto: string } | null {
  if (origem.tipo === "foto") return { quem: "Texto lido na foto", texto: origem.textoLido };
  if (origem.tipo === "audio") return { quem: "Texto ouvido", texto: origem.textoOuvido };
  return null;
}

/** O aviso de uma peça que o motor não resolveu: diz que não deu, por quê, e mostra o texto que chegou. */
export function naoIdentificada({ leitura, origem }: PecaIdentificada): Filho[] {
  const veio = textoQueVeio(origem);
  const porque =
    leitura.decisao === "resolve"
      ? null
      : leitura.decisao === "revisa"
        ? leitura.pendencias.map((p) => PENDENCIAS[p]).join(" ")
        : MOTIVOS_DA_ENTRADA[leitura.motivo];
  return [
    h("p", {}, "Não deu para identificar a peça."),
    porque && h("p", {}, porque),
    veio && h("p", { class: "apoio" }, `${veio.quem}:`),
    veio && h("p", { class: "original texto-lido" }, veio.texto),
  ];
}

const NOMES_DE_ATRIBUTO: Readonly<Record<string, string>> = { serie: "série", vedacao: "vedação", folga: "folga" };

/**
 * O motor grava trecho vazio (início igual ao fim) para o que o texto não escreve, como a folga normal.
 * Esse atributo não tem o que marcar no texto, então a página o diz em palavras.
 */
function atributoEmPalavras(atributo: Atributo): string {
  const nome = NOMES_DE_ATRIBUTO[atributo.nome] ?? atributo.nome;
  const valor = atributo.nome === "folga" && atributo.valor === "CN" ? "normal" : atributo.valor;
  const naoEscrito = atributo.trecho.inicio === atributo.trecho.fim ? " (não escrita no texto)" : "";
  return `${nome} ${valor}${naoEscrito}`;
}

function atributosDoCodigo(atributos: readonly Atributo[]): HTMLElement | null {
  if (atributos.length === 0) return null;
  const itens = atributos.flatMap((a, i) => [
    i > 0 ? " · " : null,
    h("span", { "data-atributo": a.nome }, atributoEmPalavras(a)),
  ]);
  return h("p", { class: "atributos" }, ...itens);
}

/** O texto original com os trechos que o motor leu marcados, na ordem em que aparecem. */
function textoComTrechos(descricao: string, atributos: readonly Atributo[]): Filho[] {
  const trechos = atributos
    .map((a) => a.trecho)
    .filter((t) => t.inicio < t.fim && t.fim <= descricao.length)
    .toSorted((a, b) => a.inicio - b.inicio);
  const partes: Filho[] = [];
  let cursor = 0;
  for (const { inicio, fim } of trechos) {
    if (inicio < cursor) continue;
    partes.push(descricao.slice(cursor, inicio), h("mark", {}, descricao.slice(inicio, fim)));
    cursor = fim;
  }
  partes.push(descricao.slice(cursor));
  return partes;
}

interface Uso {
  vezes: number;
  quantidades: Map<string, number>;
}

function usoPorCodigo(trocas: readonly Troca[]): Map<CodigoLegado, Uso> {
  const uso = new Map<CodigoLegado, Uso>();
  for (const troca of trocas) {
    const atual = uso.get(troca.codigo) ?? { vezes: 0, quantidades: new Map<string, number>() };
    atual.vezes += 1;
    atual.quantidades.set(troca.unidade, somarQuantidades([atual.quantidades.get(troca.unidade) ?? 0, troca.quantidade]));
    uso.set(troca.codigo, atual);
  }
  return uso;
}

const quantidadesTexto = (quantidades: ReadonlyMap<string, number>): string =>
  [...quantidades].map(([unidade, n]) => comUnidade(n, unidade)).join(" + ");

const ondeGuardado = (saldo: Saldo): string =>
  `${comUnidade(saldo.quantidade, saldo.unidade)} ${saldo.endereco === null ? "no almoxarifado" : `no endereço ${saldo.endereco}`}`;

function linhaDeSaldo(saldo: Saldo): HTMLElement {
  return h(
    "li",
    { "data-codigo": saldo.codigo, "data-saldo": String(saldo.quantidade) },
    h("strong", {}, saldo.codigo),
    `: ${saldo.quantidade === 0 ? "estoque zerado" : ondeGuardado(saldo)}`,
  );
}

function blocoComLinhas(tipo: string, titulo: string, linhas: readonly HTMLElement[]): HTMLElement {
  return h("div", { class: `estoque estoque-${tipo}`, "data-estoque": tipo }, h("h4", {}, titulo), h("ul", {}, ...linhas));
}

export function blocoDeSaldo(tipo: string, titulo: string, saldos: readonly Saldo[]): HTMLElement | null {
  return saldos.length === 0 ? null : blocoComLinhas(tipo, titulo, saldos.map((saldo) => linhaDeSaldo(saldo)));
}

/**
 * Cada código que a máquina usou aparece, com o saldo dele ou dizendo que o almoxarifado não tem o código.
 * Saldo zero é um código que o almoxarifado tem, com quantidade 0, e a página não pode confundir os dois.
 */
function saldoNosCodigosDaMaquina(item: Peca): HTMLElement {
  const linhas = item.codigosUsadosAqui.flatMap((codigo) => {
    const doCodigo = item.saldoAqui.filter((s) => s.codigo === codigo);
    return doCodigo.length > 0
      ? doCodigo.map((saldo) => linhaDeSaldo(saldo))
      : [h("li", { "data-codigo": codigo }, h("strong", {}, codigo), ": não tem no almoxarifado")];
  });
  return blocoComLinhas("aqui", "Estoque de cada código desta máquina", linhas);
}

/**
 * A resposta curta da ficha: onde a peça está guardada agora, em frase. Junta o saldo dos códigos
 * desta máquina e o de outros códigos da mesma peça; o detalhe por código fica dentro da ficha.
 */
function ondeTem(item: Peca): HTMLElement {
  const aqui = item.saldoAqui.filter((s) => s.quantidade > 0).map((saldo) => ({ saldo, outro: false }));
  const outro = item.saldoSobOutroCodigo.filter((s) => s.quantidade > 0).map((saldo) => ({ saldo, outro: true }));
  const guardados = [...aqui, ...outro];
  if (guardados.length === 0) return h("p", { class: "onde", "data-onde": "nao-tem" }, "Não tem no almoxarifado.");
  return h(
    "div",
    { class: "onde", "data-onde": outro.length > 0 ? "outro-codigo" : "tem" },
    h("p", {}, "Tem no almoxarifado"),
    h(
      "ul",
      {},
      ...guardados.map(({ saldo, outro: deOutro }) =>
        h(
          "li",
          { "data-codigo": saldo.codigo, ...(deOutro ? { "data-outro-codigo": "" } : {}) },
          h("span", { class: "quanto" }, ondeGuardado(saldo)),
          " ",
          h("span", { class: "codigo" }, deOutro ? `com o código ${saldo.codigo}, outro código da mesma peça` : `com o código ${saldo.codigo}`),
        ),
      ),
    ),
  );
}

function linhaDeTroca(troca: Troca): HTMLElement {
  return h(
    "li",
    { "data-ordem": troca.ordem, "data-data": troca.data },
    h("p", {}, h("strong", {}, dataBR(troca.data)), ` · ${comUnidade(troca.quantidade, troca.unidade)} · código ${troca.codigo}`),
    h("p", { class: "apoio" }, `Ordem ${troca.ordem} · ${troca.tipo}`, troca.posicao === null ? null : ` · ${troca.posicao}`),
    h("p", { class: "apoio" }, troca.descricaoOrdem),
  );
}

const listaDeTrocas = (trocas: readonly Troca[]): HTMLElement => h("ol", { class: "trocas" }, ...trocas.map(linhaDeTroca));

function codigoDaPeca(codigo: CodigoLegado, uso: ReadonlyMap<CodigoLegado, Uso>, textos: Textos): HTMLElement {
  const usado = uso.get(codigo);
  const texto = textos.get(codigo);
  return h(
    "li",
    { "data-codigo": codigo, "data-usado-aqui": usado ? "sim" : "nao" },
    h(
      "p",
      {},
      h("strong", {}, codigo),
      usado
        ? `: usado ${contagem(usado.vezes, "vez", "vezes")} nesta máquina, ${quantidadesTexto(usado.quantidades)}`
        : ": nunca usado nesta máquina",
    ),
    texto ? h("p", { class: "original" }, ...textoComTrechos(texto.descricao, texto.atributos)) : null,
    texto ? atributosDoCodigo(texto.atributos) : null,
  );
}

function desenharPeca(item: Peca, textos: Textos): HTMLElement {
  const uso = usoPorCodigo(item.trocas);
  const total =
    item.quantidadeTotal === null
      ? `contadas em ${juntarComE([...new Set(item.trocas.map((t) => nomeDaUnidade(t.unidade)))])}, por isso sem soma`
      : `${comUnidade(item.quantidadeTotal, item.trocas[0].unidade)} no total`;
  return h(
    "li",
    {
      class: "peca",
      "data-peca": item.grupo.chave,
      "data-trocas": String(item.trocas.length),
      "data-total": item.quantidadeTotal === null ? undefined : String(item.quantidadeTotal),
      "data-ultima": item.ultimaTroca,
      "data-codigos": String(item.codigosUsadosAqui.length),
    },
    h("h3", {}, item.grupo.rotulo),
    h("p", { class: "resumo" }, `Trocada ${contagem(item.trocas.length, "vez", "vezes")}`, h("span", { class: "ponto" }, ", "), h("span", {}, total)),
    h(
      "p",
      { class: "quando" },
      h("span", {}, `Última troca em ${dataBR(item.ultimaTroca)}`),
      " · ",
      h("span", {}, contagem(item.codigosUsadosAqui.length, "código usado nesta máquina", "códigos usados nesta máquina")),
    ),
    ondeTem(item),
    h(
      "details",
      {},
      h("summary", {}, "Ver estoque, textos e trocas"),
      h(
        "div",
        { class: "estoques" },
        saldoNosCodigosDaMaquina(item),
        blocoDeSaldo(
          "outro",
          "Estoque com outro código da mesma peça",
          item.saldoSobOutroCodigo.filter((s) => s.quantidade > 0),
        ),
      ),
      h("h4", {}, "Como cada código aparece no cadastro"),
      h("ul", { class: "codigos" }, ...item.grupo.codigos.map((c) => codigoDaPeca(c, uso, textos))),
      h("h4", {}, "Trocas nesta máquina"),
      listaDeTrocas(item.trocas),
    ),
  );
}

function desenharSemChave(item: SemChave, textos: Textos): HTMLElement {
  const texto = textos.get(item.codigo);
  return h(
    "li",
    {
      class: "sem-chave",
      "data-codigo": item.codigo,
      "data-decisao": item.leitura.decisao,
      "data-trocas": String(item.trocas.length),
      "data-ultima": item.trocas[0].data,
    },
    h("h3", {}, item.codigo),
    h("p", { class: "motivo" }, motivoDaLeitura(item.leitura)),
    h("p", { class: "original" }, ...textoComTrechos(texto?.descricao ?? item.trocas[0].descricaoMaterial, texto?.atributos ?? [])),
    h("p", {}, `${contagem(item.trocas.length, "troca", "trocas")}, a última em ${dataBR(item.trocas[0].data)}`),
    h("details", {}, h("summary", {}, "Ver trocas"), listaDeTrocas(item.trocas)),
  );
}

function cabecalhoDaMaquina(equipamento: Equipamento): HTMLElement {
  return h(
    "section",
    { class: "maquina" },
    h("h1", {}, equipamento.nome),
    h("p", {}, `${equipamento.tag} · setor ${equipamento.area} · placa ${equipamento.patrimonio}`),
    desenharPlaca(equipamento.patrimonio, { decorativa: true }),
  );
}

export function desenharHistorico(achado: Achado): Filho[] {
  const textos: Textos = new Map(achado.textos.map((t) => [t.codigo, t]));
  const { equipamento, itens } = achado.historico;
  const pecas = itens.filter((i): i is Peca => i.tipo === "peca");
  const semChave = itens.filter((i): i is SemChave => i.tipo === "codigo-sem-chave");
  return [
    cabecalhoDaMaquina(equipamento),
    h("div", { id: "entradas", class: "entradas" }),
    h("div", { id: "avisos", role: "status" }),
    itens.length === 0 && h("p", { class: "vazio" }, "Nenhuma troca registrada nesta máquina."),
    pecas.length > 0 &&
      h("section", { class: "pecas" }, h("h2", {}, "Peças trocadas nesta máquina"), h("ul", {}, ...pecas.map((p) => desenharPeca(p, textos)))),
    semChave.length > 0 &&
      h(
        "section",
        { class: "sem-chave-lista" },
        h("h2", {}, "Trocas sem peça identificada"),
        h("p", { class: "explica" }, "O texto destes códigos não diz qual é a peça, então as trocas deles não entram na soma de nenhuma peça."),
        h("ul", {}, ...semChave.map((s) => desenharSemChave(s, textos))),
      ),
  ];
}
