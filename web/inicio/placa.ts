import type { Equipamento } from "../../src/contrato";
import equipamentos from "../../dados/demo/equipamentos.csv?raw";
import { lerEquipamentos } from "../../src/exportacao/exportacao";
import { s } from "./dom";

/** As máquinas da demo que têm placa para tocar: as mesmas dos testes de soma conferida à mão. */
export const PLACAS_DA_DEMO: readonly string[] = ["004512", "004504", "004540"];

export function placasDaDemo(): readonly Equipamento[] {
  const lido = lerEquipamentos(equipamentos);
  if (!lido.ok) throw new Error("equipamentos da demo ilegíveis");
  return PLACAS_DA_DEMO.map((numero) => {
    const equipamento = lido.valor.find((e) => e.patrimonio === numero);
    if (!equipamento) throw new Error(`a demo não tem o equipamento ${numero}`);
    return equipamento;
  });
}

/** Raios das três ondas do símbolo NFC, em unidades do desenho. */
const ONDAS = [7, 14, 21] as const;
const CENTRO_DA_TAG = { x: 259, y: 62 } as const;
const GRAVADO = "#1d2124";
const ESTAMPA = "#4a5357";
const FONTE = "'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace";

function onda(raio: number): SVGPathElement {
  const x = CENTRO_DA_TAG.x - 8;
  const { y } = CENTRO_DA_TAG;
  const dx = raio * Math.cos(Math.PI * 0.24);
  const dy = raio * Math.sin(Math.PI * 0.24);
  const d = `M${(x + dx).toFixed(1)} ${(y - dy).toFixed(1)} A${raio} ${raio} 0 0 1 ${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`;
  return s("path", { class: "onda-nfc", d, fill: "none", stroke: "#d6dadd", "stroke-width": "3", "stroke-linecap": "round" });
}

function gradiente(id: string, paradas: readonly (readonly [string, string])[], atributos: Record<string, string>): SVGLinearGradientElement {
  return s("linearGradient", { id, ...atributos }, ...paradas.map(([offset, cor]) => s("stop", { offset, "stop-color": cor })));
}

/**
 * A placa de patrimônio de alumínio escovado: número gravado e a tag NFC para metal colada nela.
 * Desenho próprio, sem imagem de fora. `decorativa` tira a placa da leitura de tela, onde o texto ao lado já diz o número.
 */
export function desenharPlaca(patrimonio: string, { decorativa = false } = {}): SVGSVGElement {
  // O id sai do número, para o mesmo patrimônio dar sempre o mesmo desenho.
  const id = `placa-${patrimonio.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  const url = (nome: string) => `url(#${id}-${nome})`;
  const parafuso = (cx: number, cy: number) => [
    s("circle", { cx: String(cx), cy: String(cy), r: "6", fill: url("rebite"), stroke: "#6c7478", "stroke-width": "1" }),
    s("path", { d: `M${cx - 3.5} ${cy + 3.5} L${cx + 3.5} ${cy - 3.5}`, stroke: "#5d6569", "stroke-width": "1.5", "stroke-linecap": "round" }),
  ];
  const texto = (atributos: Record<string, string>, conteudo: string) =>
    s("text", { "font-family": FONTE, "font-weight": "600", ...atributos }, conteudo);
  const leitura = decorativa
    ? { "aria-hidden": "true" }
    : { role: "img", "aria-label": `Placa de patrimônio ${patrimonio}` };
  return s(
    "svg",
    { viewBox: "0 0 320 132", ...leitura, class: "placa" },
    s(
      "defs",
      {},
      gradiente(
        `${id}-metal`,
        [
          ["0", "#eef1f2"],
          ["0.32", "#c3c9cc"],
          ["0.55", "#e4e8ea"],
          ["0.78", "#aeb5b9"],
          ["1", "#d5dadc"],
        ],
        { x1: "0", y1: "0", x2: "1", y2: "1" },
      ),
      gradiente(`${id}-rebite`, [["0", "#f4f6f7"], ["1", "#8d9599"]], { x1: "0", y1: "0", x2: "1", y2: "1" }),
      s(
        "pattern",
        { id: `${id}-escovado`, width: "6", height: "3", patternUnits: "userSpaceOnUse" },
        s("rect", { width: "6", height: "1", fill: "#ffffff", opacity: "0.18" }),
      ),
      s(
        "filter",
        { id: `${id}-gravado`, x: "-5%", y: "-5%", width: "110%", height: "120%" },
        s("feDropShadow", { dx: "0", dy: "1", stdDeviation: "0", "flood-color": "#ffffff", "flood-opacity": "0.75" }),
      ),
      s("clipPath", { id: `${id}-recorte` }, s("rect", { x: "2", y: "2", width: "316", height: "128", rx: "10" })),
    ),
    s("rect", { x: "2", y: "2", width: "316", height: "128", rx: "10", fill: url("metal") }),
    s("rect", { x: "2", y: "2", width: "316", height: "128", rx: "10", fill: url("escovado") }),
    s("rect", { x: "2", y: "2", width: "316", height: "128", rx: "10", fill: "none", stroke: "#5f676b", "stroke-width": "2" }),
    s("rect", { x: "7.5", y: "7.5", width: "305", height: "117", rx: "6", fill: "none", stroke: "#ffffff", "stroke-opacity": "0.55", "stroke-width": "1.5" }),
    ...parafuso(22, 22),
    ...parafuso(298, 22),
    ...parafuso(22, 110),
    ...parafuso(298, 110),
    texto({ x: "40", y: "44", "font-size": "16", fill: ESTAMPA, "letter-spacing": "3", filter: url("gravado") }, "PATRIMÔNIO"),
    texto({ x: "38", y: "92", "font-size": "40", fill: GRAVADO, "letter-spacing": "1", filter: url("gravado") }, patrimonio),
    s("circle", { class: "onda", cx: String(CENTRO_DA_TAG.x), cy: String(CENTRO_DA_TAG.y), r: "30", fill: "none", stroke: "#fff313", "stroke-width": "3" }),
    s("circle", { class: "onda segunda", cx: String(CENTRO_DA_TAG.x), cy: String(CENTRO_DA_TAG.y), r: "30", fill: "none", stroke: "#fff313", "stroke-width": "3" }),
    s("circle", { cx: String(CENTRO_DA_TAG.x), cy: String(CENTRO_DA_TAG.y), r: "30", fill: "#111314", stroke: "#2b2f31", "stroke-width": "2" }),
    s("circle", { cx: String(CENTRO_DA_TAG.x), cy: String(CENTRO_DA_TAG.y), r: "25", fill: "none", stroke: "#ffffff", "stroke-opacity": "0.08", "stroke-width": "1" }),
    s("circle", { class: "onda-nfc", cx: String(CENTRO_DA_TAG.x - 8), cy: String(CENTRO_DA_TAG.y), r: "3", fill: "#d6dadd" }),
    ...ONDAS.map(onda),
    texto({ x: String(CENTRO_DA_TAG.x), y: "117", "font-size": "16", "text-anchor": "middle", fill: ESTAMPA, "letter-spacing": "2", filter: url("gravado") }, "NFC"),
    s("g", { "clip-path": url("recorte") }, s("rect", { class: "varredura", x: "0", y: "0", width: "320", height: "3", fill: "#fff313" })),
  );
}
