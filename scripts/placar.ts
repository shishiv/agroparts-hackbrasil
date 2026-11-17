import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { lerGabarito } from "../src/motor/gabarito";
import { calcularPlacar, formatarPlacar } from "../src/motor/placar";

const RAIZ = fileURLToPath(new URL("../", import.meta.url));
export const ARQUIVO_DO_GABARITO = `${RAIZ}dados/gabarito/rotulos.json`;
export const ARQUIVO_DO_PLACAR = `${RAIZ}docs/medicao/placar.md`;

async function principal(): Promise<void> {
  const lido = lerGabarito(await readFile(ARQUIVO_DO_GABARITO, "utf8"));
  if (!lido.ok) {
    for (const e of lido.erros) console.error(`${e.arquivo} ${e.coluna}: ${e.problema}`);
    process.exit(1);
  }
  const placar = calcularPlacar(lido.valor);
  await mkdir(`${RAIZ}docs/medicao`, { recursive: true });
  await writeFile(ARQUIVO_DO_PLACAR, formatarPlacar(placar), "utf8");
  const iguais = placar.textos - placar.divergencias.length;
  console.log(
    `Placar gravado em docs/medicao/placar.md: ${placar.paresFalsos.length} pares falsos juntados, ${iguais} de ${placar.textos} decisões iguais ao gabarito.`,
  );
  if (placar.paresFalsos.length > 0) process.exit(1);
}

if (import.meta.main) await principal();
