import type { ClasseCatmat, CodigoLegado, FamiliaSugerida } from "../contrato";
import arquivoBruto from "../../dados/demo/familias-jev.json";
import { validarArquivoDeFamilias, type ClasseDoArquivo } from "./arquivo";

const lido = validarArquivoDeFamilias(arquivoBruto);
if (!lido.ok) {
  const [primeiro] = lido.erros;
  throw new Error(`dados/demo/familias-jev.json ilegível: ${primeiro.coluna} ${primeiro.problema}`);
}
const arquivo = lido.valor;

/**
 * A família que o Jev sugeriu para um código da demo, ou `null` quando não há sugestão:
 * o motor resolveu o código como rolamento, o código não tem descrição ou não está no cadastro da demo.
 * A sugestão só rotula. Quem junta códigos num grupo continua sendo `agrupar`.
 */
export function familiaSugeridaDe(codigo: CodigoLegado): FamiliaSugerida | null {
  const sugestao = arquivo.sugestoes.get(codigo);
  if (!sugestao) return null;
  const { jev: _jev, ...familia } = sugestao;
  return familia;
}

/** Nome e grupo da classe, para quem for desenhar o selo. `null` para uma classe que nenhuma sugestão usa. */
export function nomeDaClasse(classe: ClasseCatmat): ClasseDoArquivo | null {
  return arquivo.classes.get(classe) ?? null;
}
