import type { CodigoLegado } from "../../src/contrato";
import { enderecoDoEquipamento, SETORES } from "./casca";
import { h, s } from "./dom";
import type { PecaEscondida, TrocasDoMes, Usina } from "./usina";

const numeroBR = (n: number): string => n.toLocaleString("pt-BR");

const contagem = (n: number, singular: string, plural: string): string => `${numeroBR(n)} ${n === 1 ? singular : plural}`;

const unidades = (n: number, unidade: string): string =>
  unidade === "UN" ? contagem(n, "unidade", "unidades") : unidade === "PC" ? contagem(n, "peça", "peças") : `${numeroBR(n)} ${unidade}`;

const minuscula = (texto: string): string => texto.charAt(0).toLowerCase() + texto.slice(1);

/** A tag de uma máquina numa plaqueta pequena, como a placa de patrimônio; a mesma no fluxograma, na lateral e nos casos. */
const plaqueta = (tag: string, classe = ""): HTMLElement => h("span", { class: `plaqueta${classe ? ` ${classe}` : ""}` }, tag);

/**
 * O cadastro, código por código: os indicadores e um quadradinho por código, agrupados nas peças
 * que o motor juntou. Os códigos que esperam uma pessoa e os que o motor não junta ficam no fim.
 */
export function indicadores(usina: Usina): HTMLElement {
  const { indicadores: i, unificacao } = usina;
  const celula = (rotulo: string, valor: number, unidade: string) =>
    h("div", {}, h("dt", {}, rotulo), h("dd", {}, h("strong", {}, numeroBR(valor)), unidade && h("span", {}, ` ${unidade}`)));
  const comEscondida = new Set(usina.escondidas.map((e) => e.peca.grupo.chave));
  const achados = new Set(usina.escondidas.flatMap((e) => e.achados.map((x) => x.codigo)));
  const quadrados = (n: number) => Array.from({ length: n }, () => h("i", {}));
  const grupos = [...unificacao.grupos.values()].toSorted((a, b) => b.codigos.length - a.codigos.length);
  const decisoes = [...unificacao.leituras.values()];
  const revisar = decisoes.filter((l) => l.decisao === "revisa").length;
  const fora = decisoes.filter((l) => l.decisao === "recusa").length;
  return h(
    "section",
    { class: "cartao-painel cadastro-visao", "data-visita-passo": "1" },
    h("div", { class: "cabeca-painel" }, h("h2", {}, "O cadastro, código por código"), h("a", { href: "/diagnostico/" }, "Cadastro de peças")),
    h(
      "dl",
      { class: "indicadores" },
      celula("Códigos no cadastro", i.codigos, ""),
      celula("Peças que o motor juntou", i.pecas, i.pecas === 1 ? "peça" : "peças"),
      celula("Trocas no histórico", i.trocas, ""),
      celula("Guardadas com outro código", i.unidadesComOutroCodigo, "unidades"),
      celula("Códigos para uma pessoa revisar", i.paraRevisar, ""),
    ),
    h(
      "div",
      {
        class: "unidades",
        role: "img",
        "aria-label": `${i.codigos} códigos: ${unificacao.grupos.size} peças juntadas, ${revisar} para uma pessoa revisar e ${fora} que o motor não junta`,
      },
      ...grupos.map((g) =>
        h("span", { class: `junta${comEscondida.has(g.chave) ? " escondida" : ""}`, title: g.rotulo }, ...g.codigos.map((c) => h("i", achados.has(c) ? { class: "achado" } : {}))),
      ),
      h("span", { class: "junta solta a-revisar" }, ...quadrados(revisar)),
      h("span", { class: "junta solta fora" }, ...quadrados(fora)),
    ),
    h(
      "div",
      { class: "legenda-planta" },
      h("span", { class: "chave chave-codigo" }, "Um código; juntos, a mesma peça"),
      h("span", { class: "chave chave-escondida" }, "Peça guardada com outro código"),
      h("span", { class: "chave chave-revisar" }, "Para uma pessoa revisar"),
      h("span", { class: "chave chave-fora" }, "O motor não junta"),
    ),
  );
}

/** Uma corrente do fluxograma: os pontos, o nome e onde o nome fica. */
interface Corrente {
  pontos: readonly (readonly [number, number])[];
  nome: string;
  rotulo: readonly [number, number, "start" | "end"];
  vapor?: boolean;
}

/** Um setor no desenho: a faixa que ele ocupa, a altura da linha das máquinas e onde fica o nome. */
interface Faixa {
  x: number;
  w: number;
  y: number;
  /** O nome em cima (computador, linha de cima) ou embaixo (linha de baixo). */
  nome: "cima" | "baixo" | "lado";
}

interface Desenho {
  classe: string;
  largura: number;
  altura: number;
  raio: number;
  faixas: Readonly<Record<(typeof SETORES)[number], Faixa>>;
  correntes: readonly Corrente[];
}

/**
 * No computador, o caminho da cana da esquerda para a direita: recepção, preparo, extração e caldo
 * na linha de cima; embaixo, a caldeira que queima o bagaço e devolve vapor, e a filtração do caldo.
 */
const LARGO: Desenho = {
  classe: "fluxo fluxo-largo",
  largura: 760,
  altura: 300,
  raio: 19,
  faixas: {
    Recepção: { x: 12, w: 92, y: 116, nome: "cima" },
    Preparo: { x: 124, w: 204, y: 116, nome: "cima" },
    Extração: { x: 348, w: 204, y: 116, nome: "cima" },
    Caldo: { x: 572, w: 176, y: 116, nome: "cima" },
    Caldeira: { x: 348, w: 204, y: 236, nome: "baixo" },
    Filtração: { x: 572, w: 176, y: 236, nome: "baixo" },
  },
  correntes: [
    { pontos: [[4, 116], [552, 116]], nome: "cana", rotulo: [4, 104, "start"] },
    { pontos: [[552, 116], [736, 116], [736, 236], [700, 236]], nome: "caldo", rotulo: [730, 180, "end"] },
    { pontos: [[536, 116], [536, 236], [501, 236]], nome: "bagaço", rotulo: [542, 180, "start"] },
    { pontos: [[399, 236], [364, 236], [364, 137]], nome: "vapor", rotulo: [358, 180, "end"], vapor: true },
  ],
};

/** No celular, o mesmo caminho de cima para baixo, um setor por linha, com as máquinas lado a lado. */
const ALTO: Desenho = {
  classe: "fluxo fluxo-alto",
  largura: 340,
  altura: 592,
  raio: 24,
  faixas: {
    Recepção: { x: 44, w: 296, y: 64, nome: "lado" },
    Preparo: { x: 44, w: 296, y: 164, nome: "lado" },
    Extração: { x: 44, w: 296, y: 264, nome: "lado" },
    Caldeira: { x: 70, w: 270, y: 364, nome: "lado" },
    Caldo: { x: 44, w: 296, y: 464, nome: "lado" },
    Filtração: { x: 44, w: 296, y: 564, nome: "lado" },
  },
  correntes: [
    { pontos: [[18, 16], [18, 564], [42, 564]], nome: "", rotulo: [0, 0, "start"] },
    ...[64, 164, 264, 464].map((y): Corrente => ({ pontos: [[18, y], [42, y]], nome: "", rotulo: [0, 0, "start"] })),
    { pontos: [[44, 290], [44, 364], [68, 364]], nome: "", rotulo: [0, 0, "start"] },
  ],
};

/** A tag partida no balão, como num fluxograma: as letras em cima e o número embaixo. */
function partesDaTag(tag: string): readonly [string, string] {
  const [letras = tag, numero = ""] = tag.split("-");
  return [letras, numero];
}

function desenharFluxo(usina: Usina, d: Desenho): SVGSVGElement {
  const comEscondida = new Set(usina.escondidas.map((e) => e.equipamento.patrimonio));
  const id = d.classe.endsWith("largo") ? "l" : "a";
  const desenho = s("svg", { viewBox: `0 0 ${d.largura} ${d.altura}`, class: d.classe, role: "group", "aria-label": "Fluxograma da usina, com as máquinas pela tag" });
  desenho.append(
    s(
      "defs",
      {},
      s("marker", { id: `ponta-${id}`, viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse" }, s("path", { d: "M0 0 L8 4 L0 8 z", class: "ponta" })),
    ),
  );
  for (const c of d.correntes) {
    desenho.append(s("polyline", { points: c.pontos.map((p) => p.join(",")).join(" "), class: c.vapor ? "corrente vapor" : "corrente", "marker-end": d === LARGO ? `url(#ponta-${id})` : undefined }));
    const [x, y, ancora] = c.rotulo;
    if (d === LARGO) desenho.append(s("text", { x: String(x), y: String(y), "text-anchor": ancora, class: "nome-corrente" }, c.nome));
  }
  for (const setor of SETORES) {
    const f = d.faixas[setor];
    const daqui = usina.maquinas.filter((m) => m.equipamento.area === setor);
    const g = s("g", { class: "setor" });
    if (f.nome === "lado") {
      g.append(s("text", { x: String(f.x), y: String(f.y - d.raio - 12), class: "nome-setor" }, setor));
    } else {
      const yNome = f.nome === "cima" ? f.y - d.raio - 30 : f.y + d.raio + 34;
      const yCota = f.nome === "cima" ? yNome + 10 : yNome - 18;
      g.append(
        s("path", { d: `M${f.x} ${yCota - 4} V${yCota + 4} M${f.x} ${yCota} H${f.x + f.w} M${f.x + f.w} ${yCota - 4} V${yCota + 4}`, class: "cota" }),
        s("text", { x: String(f.x), y: String(yNome), class: "nome-setor" }, setor),
      );
    }
    daqui.forEach((m, k) => {
      const passo = f.nome === "lado" ? d.raio * 2 + 14 : f.w / (daqui.length + 1);
      const cx = f.nome === "lado" ? f.x + d.raio + k * passo : f.x + passo * (k + 1);
      const cy = f.y;
      const escondida = comEscondida.has(m.equipamento.patrimonio);
      const [letras, numero] = partesDaTag(m.equipamento.tag);
      g.append(
        s(
          "a",
          { href: enderecoDoEquipamento(m.equipamento.patrimonio), class: `balao${escondida ? " escondida" : ""}`, "aria-label": `${m.equipamento.nome} ${m.equipamento.tag}` },
          s("title", {}, `${m.equipamento.nome} ${m.equipamento.tag}`),
          escondida ? s("circle", { cx: String(cx), cy: String(cy), r: String(d.raio + 5), class: "anel" }) : s("g", {}),
          s("circle", { cx: String(cx), cy: String(cy), r: String(d.raio), class: "corpo" }),
          s("path", { d: `M${cx - d.raio} ${cy} H${cx + d.raio}`, class: "divisa" }),
          s("text", { x: String(cx), y: String(cy - d.raio * 0.2), "text-anchor": "middle", class: "letras" }, letras),
          s("text", { x: String(cx), y: String(cy + d.raio * 0.68), "text-anchor": "middle", class: "numero-tag" }, numero),
        ),
      );
    });
    if (f.nome === "lado" && daqui.length > 0) {
      const trocas = daqui.reduce((a, m) => a + m.trocas, 0);
      g.append(s("text", { x: String(d.largura), y: String(f.y - d.raio - 12), "text-anchor": "end", class: "conta-setor" }, contagem(trocas, "troca", "trocas")));
    }
    desenho.append(g);
  }
  return desenho;
}

/** O caminho da cana: o fluxograma (largo no computador, de cima para baixo no celular), a legenda e os setores. */
export function mapa(usina: Usina): HTMLElement {
  const desenho = h("div", { class: "fluxo-duplo" }, desenharFluxo(usina, LARGO), desenharFluxo(usina, ALTO));
  const setores = SETORES.map((setor) => {
    const daqui = usina.maquinas.filter((m) => m.equipamento.area === setor);
    const trocas = daqui.reduce((a, m) => a + m.trocas, 0);
    return h("li", {}, h("strong", {}, setor), h("span", {}, `${contagem(daqui.length, "máquina", "máquinas")} · ${contagem(trocas, "troca", "trocas")}`));
  });

  return h(
    "section",
    { class: "cartao-painel mapa", "data-visita-passo": "2" },
    h("div", { class: "cabeca-painel" }, h("h2", {}, "Caminho da cana")),
    h("div", { class: "quadro-fluxo" }, desenho),
    h(
      "div",
      { class: "legenda-planta" },
      h("span", { class: "chave chave-maquina" }, "Máquina pela tag, toque para abrir"),
      h("span", { class: "chave chave-escondida" }, "Peça guardada com outro código"),
    ),
    h("ul", { class: "setores" }, ...setores),
  );
}

function linhaDoCaso({ equipamento, peca, achados }: PecaEscondida): HTMLElement {
  const primeiro = achados[0];
  return h(
    "li",
    {},
    h(
      "a",
      { href: enderecoDoEquipamento(equipamento.patrimonio) },
      plaqueta(equipamento.tag, "escondida"),
      h(
        "span",
        {},
        h("strong", {}, equipamento.nome),
        h("span", {}, `${peca.grupo.rotulo}: ${unidades(primeiro.quantidade, primeiro.unidade)} com o código ${primeiro.codigo}`),
      ),
    ),
  );
}

/** A ligação do caso: os códigos da máquina sem saldo, a seta e a etiqueta da prateleira onde a peça está. */
function ligacao({ peca, achados }: PecaEscondida): HTMLElement {
  const saldoDe = (codigo: CodigoLegado) => peca.saldoAqui.filter((x) => x.codigo === codigo).reduce((soma, x) => soma + x.quantidade, 0);
  const achado = achados[0];
  return h(
    "div",
    { class: "ligacao", "aria-hidden": "true" },
    h(
      "span",
      { class: "ligacao-de" },
      ...peca.codigosUsadosAqui.map((c) => h("span", { class: "chip sem" }, h("span", { class: "chip-codigo" }, c), h("span", { class: "chip-saldo" }, String(saldoDe(c))))),
    ),
    h("span", { class: "ligacao-seta" }),
    h(
      "span",
      { class: "etiqueta" },
      h("span", { class: "etiqueta-endereco" }, achado.endereco ?? "almoxarifado"),
      h("span", { class: "etiqueta-linha" }, h("span", {}, achado.codigo), h("span", {}, unidades(achado.quantidade, achado.unidade))),
    ),
  );
}

/** "Para revisar": o caso principal como a ligação da placa à prateleira, e os outros casos embaixo. */
export function paraRevisar(usina: Usina): HTMLElement {
  const casos = [...usina.escondidas].toSorted((a, b) => (a.equipamento.patrimonio === "004512" ? -1 : b.equipamento.patrimonio === "004512" ? 1 : 0));
  const [principal, ...outros] = casos;
  const corpo: HTMLElement[] = [];
  if (principal) {
    const usados = principal.peca.codigosUsadosAqui;
    corpo.push(
      h(
        "div",
        { class: "caso" },
        h("p", { class: "caso-maquina" }, plaqueta(principal.equipamento.patrimonio, "patrimonio"), h("strong", {}, `${principal.equipamento.nome} ${principal.equipamento.tag}`)),
        h("p", { class: "caso-peca" }, principal.peca.grupo.rotulo),
        ligacao(principal),
        h(
          "p",
          { class: "explica" },
          `O almoxarifado não tem ${usados.length === 1 ? "o código" : "os códigos"} que esta máquina usa para o ${minuscula(principal.peca.grupo.rotulo)}. A mesma peça está guardada com outro código.`,
        ),
        h("a", { class: "botao-principal", href: enderecoDoEquipamento(principal.equipamento.patrimonio) }, `Abrir a máquina ${principal.equipamento.patrimonio}`),
      ),
    );
  }
  const misturas = usina.resumoDoCadastro.misturas;
  return h(
    "aside",
    { class: "revisar", "data-visita-passo": "3" },
    h("div", { class: "cabeca-painel" }, h("h2", {}, "Para revisar"), h("span", { class: "contador" }, String(casos.length))),
    ...corpo,
    h(
      "ul",
      { class: "casos" },
      ...outros.slice(0, 3).map((c) => linhaDoCaso(c)),
      misturas > 0
        ? h(
            "li",
            {},
            h(
              "a",
              { href: "/diagnostico/#misturas" },
              plaqueta(String(misturas), "alerta"),
              h("span", {}, h("strong", {}, "Cadastro de peças"), h("span", {}, `${contagem(misturas, "item mistura", "itens misturam")} peças diferentes`)),
            ),
          )
        : null,
    ),
  );
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Trocas por mês, de todas as máquinas: uma barra por mês, porque cada mês é uma contagem; janeiro abre o ano. */
export function grafico(porMes: readonly TrocasDoMes[]): HTMLElement {
  const maximo = Math.max(10, Math.ceil(Math.max(...porMes.map((p) => p.trocas)) / 10) * 10);
  const ip = porMes.reduce((melhor, p, i) => (p.trocas > (porMes[melhor]?.trocas ?? -1) ? i : melhor), 0);
  const total = porMes.reduce((a, p) => a + p.trocas, 0);
  const nomeDoMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`;
  const barras = porMes.map((p, i) => {
    const janeiro = p.mes.endsWith("-01");
    return h(
      "li",
      { class: `${i === ip ? "pico" : ""}${janeiro ? " ano" : ""}`.trim() || undefined, style: `--v: ${(p.trocas / maximo).toFixed(3)}`, title: `${nomeDoMes(p.mes)}: ${contagem(p.trocas, "troca", "trocas")}` },
      h("span", { class: "barra-mes" }),
      i === ip ? h("span", { class: "valor-pico" }, String(p.trocas)) : null,
      janeiro ? h("span", { class: "rotulo-ano" }, p.mes.slice(0, 4)) : null,
    );
  });
  const grade = [maximo, maximo / 2, 0].map((v) => h("li", {}, String(v)));
  return h(
    "section",
    { class: "cartao-painel grafico" },
    h("div", { class: "cabeca-painel" }, h("h2", {}, "Trocas por mês")),
    h(
      "div",
      { class: "barras-quadro", role: "img", "aria-label": `Trocas por mês, de ${nomeDoMes(porMes[0]?.mes ?? "")} a ${nomeDoMes(porMes.at(-1)?.mes ?? "")}; o maior mês teve ${porMes[ip]?.trocas ?? 0}` },
      h("ol", { class: "escala", "aria-hidden": "true" }, ...grade),
      h("ol", { class: "barras", "aria-hidden": "true" }, ...barras),
    ),
    h("p", { class: "fonte-planta" }, h("span", {}, `${contagem(total, "troca", "trocas")} em ${porMes.length} meses, todas as máquinas`), h("span", {}, "dados fictícios")),
  );
}
