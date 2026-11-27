import { diagnosticar, resumir, type Diagnostico, type Resumo, type SkuDiagnosticado } from "../../src/agrupamento";
import type {
  CadastroMaterial,
  CodigoLegado,
  ErroDeLinha,
  Fragmentacao,
  Grupo,
  Leitura,
  MotivoRecusa,
  Pendencia,
  SkuUsina,
  Unificacao,
  VeredictoDoSku,
} from "../../src/contrato";
import { lerMateriais } from "../../src/exportacao";
import { unificar } from "../../src/motor";
import { h, type Filho } from "../inicio/dom";
import { decodificar, partirTexto } from "./texto";

interface Analise {
  cadastro: readonly CadastroMaterial[];
  unificacao: Unificacao;
  diagnostico: Diagnostico;
  descricoes: ReadonlyMap<CodigoLegado, string>;
  skuDe: ReadonlyMap<CodigoLegado, SkuUsina | null>;
}

type Veredicto<T extends VeredictoDoSku["tipo"]> = Extract<VeredictoDoSku, { tipo: T }>;

const NOMES_DOS_ATRIBUTOS: Readonly<Record<string, string>> = { serie: "série", vedacao: "vedação", folga: "folga" };

const PENDENCIAS: Readonly<Record<Pendencia, string>> = {
  "sufixo-desconhecido": "falta o sufixo do rolamento, como ZZ ou 2RS",
  "designacao-ausente": "o texto não traz o número do rolamento",
  "duas-leituras": "o texto traz mais de um número de rolamento",
};

const MOTIVOS: Readonly<Record<MotivoRecusa, string>> = {
  contradicao: "o texto se contradiz",
  "fora-das-familias": "ainda não há regra para este tipo de peça",
  "sem-texto": "sem descrição no cadastro",
};

const MAXIMO_DE_ERROS = 5;

const contagem = (n: number, singular: string, plural: string): string => `${n} ${n === 1 ? singular : plural}`;

const nomeDoAtributo = (nome: string): string => NOMES_DOS_ATRIBUTOS[nome] ?? nome;

function juntarComE(itens: readonly string[]): string {
  const ultimo = itens.at(-1);
  return itens.length < 2 || ultimo === undefined ? itens.join("") : `${itens.slice(0, -1).join(", ")} e ${ultimo}`;
}

function motivoDaLeitura(leitura: Leitura | undefined): string | null {
  if (!leitura || leitura.decisao === "resolve") return null;
  return leitura.decisao === "revisa" ? leitura.pendencias.map((p) => PENDENCIAS[p]).join("; ") : MOTIVOS[leitura.motivo];
}

function analisar(cadastro: readonly CadastroMaterial[]): Analise {
  const unificacao = unificar(cadastro);
  return {
    cadastro,
    unificacao,
    diagnostico: diagnosticar(cadastro, unificacao),
    descricoes: new Map(cadastro.map((m) => [m.codigo, m.descricao])),
    skuDe: new Map(cadastro.map((m) => [m.codigo, m.sku])),
  };
}

function textoOriginal(codigo: CodigoLegado, analise: Analise, destacados: readonly string[] | undefined): HTMLElement {
  const descricao = analise.descricoes.get(codigo) ?? "";
  const atributos = analise.unificacao.leituras.get(codigo)?.atributos ?? [];
  const partes: Filho[] = partirTexto(descricao, atributos, destacados).map((p) => (p.marcado ? h("mark", {}, p.texto) : p.texto));
  return h("p", { class: "original" }, ...partes);
}

function linhaDoCodigo(codigo: CodigoLegado, analise: Analise, destacados: readonly string[] | undefined): HTMLElement {
  const motivo = motivoDaLeitura(analise.unificacao.leituras.get(codigo));
  return h(
    "li",
    { "data-codigo": codigo },
    h("strong", {}, codigo),
    motivo === null ? null : h("span", { class: "motivo" }, ` · ${motivo}`),
    textoOriginal(codigo, analise, destacados),
  );
}

function blocoDeCodigos(titulo: string, classe: string, dados: Record<string, string>, linhas: readonly HTMLElement[]): HTMLElement {
  return h("section", { class: `bloco ${classe}`, ...dados }, h("h4", {}, titulo), h("ul", { class: "codigos" }, ...linhas));
}

/** Os códigos do SKU, uma coluna por peça (grupo) e uma para os que não têm grupo. */
function codigosDoSku({ codigos }: SkuDiagnosticado, analise: Analise, destacados?: readonly string[]): HTMLElement {
  const porGrupo = new Map<Grupo, CodigoLegado[]>();
  const semGrupo: CodigoLegado[] = [];
  for (const codigo of codigos) {
    const grupo = analise.unificacao.grupoDe(codigo);
    if (!grupo) semGrupo.push(codigo);
    else porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), codigo]);
  }
  const linhas = (lista: readonly CodigoLegado[]) => lista.map((c) => linhaDoCodigo(c, analise, destacados));
  return h(
    "div",
    { class: "blocos" },
    ...[...porGrupo].map(([grupo, lista]) => blocoDeCodigos(grupo.rotulo, "peca", { "data-peca": grupo.chave }, linhas(lista))),
    semGrupo.length === 0 ? null : blocoDeCodigos("Peça não identificada", "sem-grupo", { "data-sem-grupo": "" }, linhas(semGrupo)),
  );
}

function cartaoDaMistura(sku: SkuDiagnosticado, veredicto: Veredicto<"mistura">, analise: Analise): HTMLElement {
  const diferem = veredicto.atributosQueDiferem;
  return h(
    "article",
    { class: "cartao mistura", "data-sku": veredicto.sku, "data-veredicto": "mistura" },
    h("h3", {}, veredicto.sku),
    h("p", { class: "resumo-do-sku" }, `Junta ${veredicto.chaves.length} peças diferentes: ${diferem.length > 1 ? "mudam" : "muda"} ${juntarComE(diferem.map((a) => `a ${nomeDoAtributo(a)}`))}`),
    codigosDoSku(sku, analise, diferem),
  );
}

function cartaoDaFragmentacao({ grupo, skus }: Fragmentacao, analise: Analise): HTMLElement {
  const doSku = (sku: SkuUsina | null) => grupo.codigos.filter((c) => (analise.skuDe.get(c) ?? null) === sku);
  const linhas = (lista: readonly CodigoLegado[]) => lista.map((c) => linhaDoCodigo(c, analise, undefined));
  const semSku = doSku(null);
  return h(
    "article",
    { class: "cartao fragmentacao", "data-peca": grupo.chave },
    h("h3", {}, grupo.rotulo),
    h("p", { class: "resumo-do-sku" }, `${contagem(grupo.codigos.length, "código", "códigos")} da mesma peça, em ${contagem(skus.length, "item", "itens")}`),
    h(
      "div",
      { class: "blocos" },
      ...skus.map((sku) => blocoDeCodigos(sku, "sku", { "data-sku": sku }, linhas(doSku(sku)))),
      semSku.length === 0 ? null : blocoDeCodigos("Sem item", "sem-sku", { "data-sem-sku": "" }, linhas(semSku)),
    ),
  );
}

function itemRecolhido(sku: SkuDiagnosticado, veredicto: VeredictoDoSku["tipo"], resumo: string, analise: Analise): HTMLElement {
  return h(
    "li",
    { class: `cartao recolhido ${veredicto}`, "data-sku": sku.veredicto.sku, "data-veredicto": veredicto },
    h("details", {}, h("summary", {}, h("strong", {}, sku.veredicto.sku), ` · ${resumo}`), codigosDoSku(sku, analise)),
  );
}

function itemCoerente(sku: SkuDiagnosticado, veredicto: Veredicto<"coerente">, analise: Analise): HTMLElement {
  const rotulo = analise.unificacao.grupos.get(veredicto.chave)?.rotulo ?? veredicto.chave;
  return itemRecolhido(sku, "coerente", `${rotulo} · ${contagem(sku.codigos.length, "código", "códigos")}`, analise);
}

function itemInconclusivo(sku: SkuDiagnosticado, veredicto: Veredicto<"inconclusivo">, analise: Analise): HTMLElement {
  return itemRecolhido(sku, "inconclusivo", `${veredicto.semChave.length} de ${contagem(sku.codigos.length, "código", "códigos")} sem peça identificada`, analise);
}

function secao(id: string, titulo: string, explicacao: string, vazio: string, itens: readonly HTMLElement[], lista: "ul" | "div"): HTMLElement {
  const corpo = itens.length === 0 ? h("p", { class: "vazio" }, vazio) : h(lista, { class: "cartoes" }, ...itens);
  return h("section", { id, class: "secao" }, h("h2", {}, titulo), h("p", { class: "explica" }, explicacao), corpo);
}

function painelDeResumo(resumo: Resumo): HTMLElement {
  const numero = (id: string, cor: string, n: number, singular: string, plural: string) =>
    h("li", {}, h("a", { href: `#${id}`, class: `numero ${cor}`, "data-resumo": id }, h("strong", {}, String(n)), h("span", {}, n === 1 ? singular : plural)));
  return h(
    "nav",
    { class: "painel", "aria-label": "Resumo" },
    h(
      "ul",
      {},
      numero("misturas", "cor-mistura", resumo.misturas, "item mistura peças diferentes", "itens misturam peças diferentes"),
      numero("fragmentacoes", "cor-fragmentacao", resumo.fragmentacoes, "peça aparece em mais de um item", "peças aparecem em mais de um item"),
      numero("coerentes", "cor-coerente", resumo.coerentes, "item está certo", "itens estão certos"),
      numero("inconclusivos", "cor-inconclusivo", resumo.inconclusivos, "item não pôde ser conferido", "itens não puderam ser conferidos"),
    ),
  );
}

function desenharResultado(analise: Analise): Node[] {
  const { skus, fragmentacoes } = analise.diagnostico;
  if (skus.length === 0) return [h("p", { class: "vazio" }, "Nenhum código do cadastro está num item da usina, então não há o que comparar.")];
  const misturas = skus.flatMap((s) => (s.veredicto.tipo === "mistura" ? [cartaoDaMistura(s, s.veredicto, analise)] : []));
  const coerentes = skus.flatMap((s) => (s.veredicto.tipo === "coerente" ? [itemCoerente(s, s.veredicto, analise)] : []));
  const inconclusivos = skus.flatMap((s) => (s.veredicto.tipo === "inconclusivo" ? [itemInconclusivo(s, s.veredicto, analise)] : []));
  return [
    painelDeResumo(resumir(analise.diagnostico)),
    secao("misturas", "Itens que misturam peças diferentes", "O mesmo item junta códigos de peças que não são iguais.", "Nenhum.", misturas, "div"),
    secao(
      "fragmentacoes",
      "Peças que aparecem em mais de um item",
      "Os códigos da mesma peça foram postos em itens diferentes.",
      "Nenhuma.",
      fragmentacoes.map((f) => cartaoDaFragmentacao(f, analise)),
      "div",
    ),
    secao("coerentes", "Itens certos", "Todos os códigos do item são da mesma peça.", "Nenhum.", coerentes, "ul"),
    secao("inconclusivos", "Itens que não puderam ser conferidos", "Algum código do item não tem texto bastante para dizer qual é a peça.", "Nenhum.", inconclusivos, "ul"),
  ];
}

function descreverFonte(nome: string | null, analise: Analise): string {
  const total = analise.cadastro.length;
  const comSku = analise.diagnostico.skus.reduce((soma, s) => soma + s.codigos.length, 0);
  const partes = [
    nome ?? "Dados de demonstração: Usina Modelo (fictícia)",
    contagem(total, "código", "códigos"),
    contagem(analise.diagnostico.skus.length, "item da usina", "itens da usina"),
    total > comSku ? `${contagem(total - comSku, "código sem item", "códigos sem item")}` : null,
  ];
  return partes.filter((p) => p !== null).join(" · ");
}

function descreverErros(nome: string, erros: readonly ErroDeLinha[]): HTMLElement {
  const onde = (e: ErroDeLinha) => `${e.linha > 0 ? `Linha ${e.linha}` : "Arquivo"}${e.coluna === "" ? "" : ` · ${e.coluna}`}`;
  return h(
    "div",
    {},
    h("p", {}, h("strong", {}, `Não consegui ler ${nome}.`)),
    h("ul", {}, ...erros.slice(0, MAXIMO_DE_ERROS).map((e) => h("li", {}, `${onde(e)}: ${e.problema}`))),
    erros.length > MAXIMO_DE_ERROS ? h("p", {}, `e mais ${erros.length - MAXIMO_DE_ERROS}`) : null,
  );
}

/**
 * A tela de diagnóstico. Começa na demonstração e troca pelo cadastro de materiais que a pessoa
 * escolher. O arquivo é lido e analisado aqui, sem rede. Um arquivo que não dá para ler avisa
 * e deixa na tela o que já estava. Enquanto um arquivo é lido, `#resultado` tem `aria-busy`.
 */
export function montarDiagnostico(raiz: HTMLElement, csvDaDemo: string): void {
  const demo = lerMateriais(csvDaDemo);
  if (!demo.ok) throw new Error(`os materiais da demonstração não abrem: ${demo.erros[0].problema}`);
  const analiseDaDemo = analisar(demo.valor);

  const fonte = h("p", { class: "fonte", role: "status" });
  const aviso = h("div", { class: "aviso", role: "alert", hidden: true });
  const resultado = h("div", { id: "resultado" });
  const entrada = h("input", { type: "file", accept: ".csv,text/csv,text/plain" });
  const voltar = h("button", { type: "button", class: "secundario", hidden: true }, "Voltar à demonstração");

  function mostrar(nome: string | null, analise: Analise): void {
    fonte.textContent = descreverFonte(nome, analise);
    resultado.replaceChildren(...desenharResultado(analise));
    aviso.hidden = true;
    voltar.hidden = nome === null;
  }

  entrada.addEventListener("change", async () => {
    const arquivo = entrada.files?.[0];
    if (!arquivo) return;
    resultado.setAttribute("aria-busy", "true");
    try {
      const lido = lerMateriais(decodificar(await arquivo.arrayBuffer()));
      if (lido.ok) mostrar(arquivo.name, analisar(lido.valor));
      else {
        aviso.replaceChildren(descreverErros(arquivo.name, lido.erros));
        aviso.hidden = false;
      }
    } finally {
      resultado.removeAttribute("aria-busy");
      entrada.value = "";
    }
  });
  voltar.addEventListener("click", () => mostrar(null, analiseDaDemo));

  raiz.replaceChildren(
    h("h1", {}, "Cadastro de peças"),
    h("p", { class: "explica" }, "A usina agrupa os códigos de material em itens. Aqui conferimos se cada item junta só códigos da mesma peça."),
    fonte,
    h(
      "div",
      { class: "acoes" },
      h("label", { class: "botao" }, "Conferir outro cadastro (CSV)", entrada),
      voltar,
    ),
    aviso,
    resultado,
  );
  mostrar(null, analiseDaDemo);
}
