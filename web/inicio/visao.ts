import type { Equipamento } from "../../src/contrato";
import { enderecoDoEquipamento, numeroDaMaquina } from "./casca";
import { h, s } from "./dom";
import type { PecaEscondida, TrocasDoMes, Usina } from "./usina";

const numeroBR = (n: number): string => n.toLocaleString("pt-BR");

const contagem = (n: number, singular: string, plural: string): string => `${numeroBR(n)} ${n === 1 ? singular : plural}`;

const unidades = (n: number, unidade: string): string =>
  unidade === "UN" ? contagem(n, "unidade", "unidades") : unidade === "PC" ? contagem(n, "peça", "peças") : `${numeroBR(n)} ${unidade}`;

const minuscula = (texto: string): string => texto.charAt(0).toLowerCase() + texto.slice(1);

/** A faixa de indicadores: só números que a exportação da demo e o motor provam. */
export function indicadores({ indicadores: i }: Usina): HTMLElement {
  const celula = (rotulo: string, valor: number, unidade: string) =>
    h("div", {}, h("dt", {}, rotulo), h("dd", {}, h("strong", {}, numeroBR(valor)), unidade && h("span", {}, ` ${unidade}`)));
  return h(
    "dl",
    { class: "indicadores", "data-visita-passo": "1" },
    celula("Códigos no cadastro", i.codigos, ""),
    celula("Peças que o motor juntou", i.pecas, i.pecas === 1 ? "peça" : "peças"),
    celula("Trocas no histórico", i.trocas, ""),
    celula("Guardadas com outro código", i.unidadesComOutroCodigo, "unidades"),
    celula("Códigos para uma pessoa revisar", i.paraRevisar, ""),
  );
}

interface Setor {
  nome: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A planta da usina na ordem do caminho da cana: recepção, preparo, extração, caldo e filtração; a caldeira embaixo. */
const SETORES: readonly Setor[] = [
  { nome: "Recepção", x: 16, y: 44, w: 104, h: 128 },
  { nome: "Preparo", x: 140, y: 44, w: 176, h: 128 },
  { nome: "Extração", x: 336, y: 44, w: 176, h: 128 },
  { nome: "Caldo", x: 532, y: 44, w: 132, h: 128 },
  { nome: "Caldeira", x: 336, y: 212, w: 176, h: 108 },
  { nome: "Filtração", x: 532, y: 212, w: 132, h: 108 },
];

/** O desenho da usina: setores, o caminho da cana e uma marca numerada por máquina, que abre a página dela. */
export function mapa(usina: Usina): HTMLElement {
  const comEscondida = new Set(usina.escondidas.map((e) => e.equipamento.patrimonio));
  const indice = new Map(usina.maquinas.map((m, i) => [m.equipamento.patrimonio, i]));
  const desenho = s("svg", { viewBox: "0 0 680 360", class: "planta", role: "group", "aria-label": "Planta da usina, com as máquinas numeradas" });
  desenho.append(
    s("defs", {}, s("pattern", { id: "pontos", width: "12", height: "12", patternUnits: "userSpaceOnUse" }, s("circle", { cx: "1", cy: "1", r: "0.8", fill: "#d9d6c9" }))),
    s("rect", { x: "0", y: "0", width: "680", height: "360", fill: "url(#pontos)" }),
  );
  const seta = (x1: number, y1: number, x2: number, y2: number, tracejada = false) =>
    s("path", {
      d: `M${x1} ${y1} L${x2} ${y2}`,
      class: tracejada ? "fluxo vapor" : "fluxo",
      "marker-end": "url(#ponta)",
    });
  desenho.querySelector("defs")?.append(
    s("marker", { id: "ponta", viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, s("path", { d: "M0 0 L8 4 L0 8 z", class: "ponta" })),
  );
  desenho.append(
    seta(120, 108, 138, 108),
    seta(316, 108, 334, 108),
    seta(512, 108, 530, 108),
    seta(598, 172, 598, 210),
    seta(424, 210, 424, 174, true),
    s("text", { x: "18", y: "28", class: "nota-planta" }, "cana"),
    s("text", { x: "430", y: "196", class: "nota-planta" }, "vapor"),
  );
  for (const setor of SETORES) {
    const daqui = usina.maquinas.filter((m) => m.equipamento.area === setor.nome);
    const g = s("g", { class: "setor" });
    g.append(
      s("rect", { x: String(setor.x), y: String(setor.y), width: String(setor.w), height: String(setor.h), rx: "6" }),
      s("text", { x: String(setor.x + 10), y: String(setor.y + 20), class: "nome-setor" }, setor.nome),
    );
    daqui.forEach((m, k) => {
      const passo = setor.w / (daqui.length + 1);
      const cx = setor.x + passo * (k + 1);
      const cy = setor.y + setor.h / 2 + 2;
      const i = indice.get(m.equipamento.patrimonio) ?? 0;
      const escondida = comEscondida.has(m.equipamento.patrimonio);
      const marca = s(
        "a",
        { href: enderecoDoEquipamento(m.equipamento.patrimonio), class: `marca-maquina${escondida ? " escondida" : ""}`, "aria-label": `${numeroDaMaquina(i)}, ${m.equipamento.nome} ${m.equipamento.tag}` },
        s("title", {}, `${m.equipamento.nome} ${m.equipamento.tag}`),
        escondida ? s("circle", { cx: String(cx), cy: String(cy), r: "21", class: "anel" }) : s("g", {}),
        s("circle", { cx: String(cx), cy: String(cy), r: "15", class: "ponto" }),
        s("text", { x: String(cx), y: String(cy + 4.5), "text-anchor": "middle", class: "numero-maquina" }, numeroDaMaquina(i)),
        s("text", { x: String(cx), y: String(cy + 38), "text-anchor": "middle", class: "tag-planta" }, m.equipamento.tag),
      );
      g.append(marca);
    });
    desenho.append(g);
  }
  desenho.append(
    s("rect", { x: "16", y: "296", width: "176", height: "24", rx: "3", class: "placa-planta" }),
    s("text", { x: "104", y: "312.5", "text-anchor": "middle", class: "nome-planta" }, "Usina Modelo"),
  );

  const setores = SETORES.map((setor) => {
    const daqui = usina.maquinas.filter((m) => m.equipamento.area === setor.nome);
    const trocas = daqui.reduce((a, m) => a + m.trocas, 0);
    return h("li", {}, h("strong", {}, setor.nome), h("span", {}, `${contagem(daqui.length, "máquina", "máquinas")} · ${contagem(trocas, "troca", "trocas")}`));
  });

  return h(
    "section",
    { class: "cartao-painel mapa", "data-visita-passo": "2" },
    h("div", { class: "cabeca-painel" }, h("h2", {}, "Mapa da usina"), h("a", { href: "/diagnostico/" }, "Cadastro de peças")),
    h("div", { class: "quadro-planta" }, desenho),
    h(
      "div",
      { class: "legenda-planta" },
      h("span", { class: "chave chave-maquina" }, "Máquina, toque para abrir"),
      h("span", { class: "chave chave-escondida" }, "Peça guardada com outro código"),
    ),
    h("ul", { class: "setores" }, ...setores),
    h("p", { class: "fonte-planta" }, `${usina.maquinas.length} máquinas em ${SETORES.length} setores. Planta esquemática de uma usina fictícia.`),
  );
}

function linhaDoCaso({ equipamento, peca, achados }: PecaEscondida, indiceDe: (e: Equipamento) => number): HTMLElement {
  const primeiro = achados[0];
  return h(
    "li",
    {},
    h(
      "a",
      { href: enderecoDoEquipamento(equipamento.patrimonio) },
      h("span", { class: "num" }, numeroDaMaquina(indiceDe(equipamento))),
      h(
        "span",
        {},
        h("strong", {}, `${equipamento.nome} ${equipamento.tag}`),
        h("span", {}, `${peca.grupo.rotulo}: ${unidades(primeiro.quantidade, primeiro.unidade)} com o código ${primeiro.codigo}`),
      ),
    ),
  );
}

/** "Para revisar": o caso principal com o número de destaque e o botão, e os outros casos embaixo. */
export function paraRevisar(usina: Usina): HTMLElement {
  const casos = [...usina.escondidas].toSorted((a, b) => (a.equipamento.patrimonio === "004512" ? -1 : b.equipamento.patrimonio === "004512" ? 1 : 0));
  const indice = new Map(usina.maquinas.map((m, i) => [m.equipamento.patrimonio, i]));
  const indiceDe = (e: Equipamento) => indice.get(e.patrimonio) ?? 0;
  const [principal, ...outros] = casos;
  const corpo: HTMLElement[] = [];
  if (principal) {
    const achado = principal.achados[0];
    const usados = principal.peca.codigosUsadosAqui;
    corpo.push(
      h("p", { class: "sobre" }, "Peça guardada com outro código"),
      h("h3", {}, `${principal.equipamento.nome} ${principal.equipamento.tag}`),
      h(
        "p",
        { class: "explica" },
        `O almoxarifado não tem ${usados.length === 1 ? "o código" : "os códigos"} que esta máquina usa para o ${minuscula(principal.peca.grupo.rotulo)}. A mesma peça está guardada com outro código.`,
      ),
      h(
        "p",
        { class: "destaque" },
        h("strong", {}, numeroBR(achado.quantidade)),
        h("span", { class: "unidade" }, achado.unidade === "UN" ? "unidades" : achado.unidade),
        h("span", { class: "onde-fica" }, `${achado.endereco === null ? "no almoxarifado" : `no endereço ${achado.endereco}`}, código ${achado.codigo}`),
      ),
      h("a", { class: "botao-principal", href: enderecoDoEquipamento(principal.equipamento.patrimonio) }, `Abrir a máquina ${principal.equipamento.patrimonio}`),
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
      ...outros.slice(0, 3).map((c) => linhaDoCaso(c, indiceDe)),
      misturas > 0
        ? h(
            "li",
            {},
            h(
              "a",
              { href: "/diagnostico/#misturas" },
              h("span", { class: "num alerta" }, String(misturas)),
              h("span", {}, h("strong", {}, "Cadastro de peças"), h("span", {}, `${contagem(misturas, "item mistura", "itens misturam")} peças diferentes`)),
            ),
          )
        : null,
    ),
  );
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Trocas por mês, de todas as máquinas: uma linha, a grade e os rótulos, sem enfeite. */
export function grafico(porMes: readonly TrocasDoMes[]): HTMLElement {
  const L = 680;
  const A = 200;
  const m = { esq: 32, dir: 8, cima: 12, baixo: 28 };
  const maximo = Math.max(10, Math.ceil(Math.max(...porMes.map((p) => p.trocas)) / 10) * 10);
  const x = (i: number) => m.esq + (i * (L - m.esq - m.dir)) / Math.max(1, porMes.length - 1);
  const y = (v: number) => m.cima + (1 - v / maximo) * (A - m.cima - m.baixo);
  const pontos = porMes.map((p, i) => `${x(i).toFixed(1)},${y(p.trocas).toFixed(1)}`);
  const svg = s("svg", { viewBox: `0 0 ${L} ${A}`, class: "grafico-linha", role: "img", "aria-label": `Trocas por mês, de ${porMes[0]?.mes} a ${porMes.at(-1)?.mes}` });
  for (let v = 0; v <= maximo; v += maximo / 4) {
    svg.append(
      s("line", { x1: String(m.esq), x2: String(L - m.dir), y1: y(v).toFixed(1), y2: y(v).toFixed(1), class: v === 0 ? "eixo" : "grade" }),
      s("text", { x: String(m.esq - 8), y: (y(v) + 4).toFixed(1), "text-anchor": "end", class: "rotulo-eixo" }, String(v)),
    );
  }
  porMes.forEach((p, i) => {
    if (i % 3 !== 0) return;
    svg.append(s("text", { x: x(i).toFixed(1), y: String(A - 8), "text-anchor": "middle", class: "rotulo-eixo" }, `${MESES[Number(p.mes.slice(5, 7)) - 1]} ${p.mes.slice(2, 4)}`));
  });
  svg.append(
    s("polygon", { points: `${x(0)},${y(0)} ${pontos.join(" ")} ${x(porMes.length - 1)},${y(0)}`, class: "area" }),
    s("polyline", { points: pontos.join(" "), class: "linha" }),
  );
  const ip = porMes.reduce((melhor, p, i) => (p.trocas > (porMes[melhor]?.trocas ?? -1) ? i : melhor), 0);
  const pico = porMes[ip] ?? { mes: "0000-01", trocas: 0 };
  svg.append(
    s("circle", { cx: x(ip).toFixed(1), cy: y(pico.trocas).toFixed(1), r: "3.5", class: "pico" }),
    s("text", { x: (x(ip) + 8).toFixed(1), y: (y(pico.trocas) + 4).toFixed(1), class: "rotulo-pico" }, `${pico.trocas} em ${MESES[Number(pico.mes.slice(5)) - 1]}`),
  );
  const total = porMes.reduce((a, p) => a + p.trocas, 0);
  return h(
    "section",
    { class: "cartao-painel grafico" },
    h("div", { class: "cabeca-painel" }, h("h2", {}, "Trocas por mês")),
    h("div", { class: "rolagem" }, svg),
    h("p", { class: "fonte-planta" }, h("span", { class: "chave chave-linha" }, `${contagem(total, "troca", "trocas")} em ${porMes.length} meses, todas as máquinas`), h("span", {}, "dados fictícios")),
  );
}
