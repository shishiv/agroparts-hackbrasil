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

const METAL = "#cfd4d6";
const BORDA = "#7d8689";
const GRAVADO = "#2c3235";

/** Raios das três ondas do símbolo NFC, em unidades do desenho. */
const ONDAS = [8, 16, 24] as const;
const CENTRO_DO_SIMBOLO = { x: 246, y: 66 } as const;

function onda(raio: number): SVGPathElement {
  const { x, y } = CENTRO_DO_SIMBOLO;
  const dx = raio * Math.cos(Math.PI * 0.22);
  const dy = raio * Math.sin(Math.PI * 0.22);
  const d = `M${(x + dx).toFixed(1)} ${(y - dy).toFixed(1)} A${raio} ${raio} 0 0 1 ${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`;
  return s("path", { d, fill: "none", stroke: GRAVADO, "stroke-width": "3", "stroke-linecap": "round" });
}

/** A placa de patrimônio de alumínio: número gravado e a marca da tag NFC. Desenho próprio, sem imagem de fora. */
export function desenharPlaca(patrimonio: string): SVGSVGElement {
  const parafuso = (cx: number, cy: number) => [
    s("circle", { cx: String(cx), cy: String(cy), r: "6", fill: "#aab0b3", stroke: BORDA, "stroke-width": "1.5" }),
    s("path", { d: `M${cx - 3.5} ${cy + 3.5} L${cx + 3.5} ${cy - 3.5}`, stroke: BORDA, "stroke-width": "1.5" }),
  ];
  const texto = (atributos: Record<string, string>, conteudo: string) =>
    s("text", { "font-family": "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace", "font-weight": "700", ...atributos }, conteudo);
  return s(
    "svg",
    { viewBox: "0 0 320 132", role: "img", "aria-label": `Placa de patrimônio ${patrimonio}`, class: "placa" },
    s("rect", { x: "2", y: "2", width: "316", height: "128", rx: "10", fill: METAL, stroke: BORDA, "stroke-width": "3" }),
    s("rect", { x: "8", y: "8", width: "304", height: "116", rx: "6", fill: "none", stroke: "#eef1f2", "stroke-width": "2" }),
    ...parafuso(22, 22),
    ...parafuso(298, 22),
    ...parafuso(22, 110),
    ...parafuso(298, 110),
    texto({ x: "40", y: "42", "font-size": "16", fill: "#4b5356", "letter-spacing": "2" }, "PATRIMÔNIO"),
    texto({ x: "40", y: "88", "font-size": "40", fill: GRAVADO }, patrimonio),
    s("circle", { class: "onda", cx: "259", cy: "66", r: "32", fill: "none", stroke: "#1d5a31", "stroke-width": "3" }),
    s("circle", { class: "onda segunda", cx: "259", cy: "66", r: "32", fill: "none", stroke: "#1d5a31", "stroke-width": "3" }),
    s("circle", { cx: "259", cy: "66", r: "32", fill: "#e9ecec", stroke: "#4b5356", "stroke-width": "3" }),
    s("circle", { cx: String(CENTRO_DO_SIMBOLO.x), cy: String(CENTRO_DO_SIMBOLO.y), r: "3", fill: GRAVADO }),
    ...ONDAS.map(onda),
    texto({ x: "259", y: "119", "font-size": "16", "text-anchor": "middle", fill: "#4b5356" }, "NFC"),
  );
}
