export interface RegistroCsv {
  /** Linha física onde o registro começa, contando o cabeçalho como linha 1. */
  numero: number;
  campos: string[];
}

export type CsvLido =
  | { ok: true; registros: RegistroCsv[] }
  | { ok: false; linha: number; problema: string };

const SEPARADOR = ";";

/** CSV da usina: separador `;`, aspas duplas para campos com `;`, aspas ou quebra de linha. */
export function lerCsv(texto: string): CsvLido {
  const fonte = texto.startsWith("\uFEFF") ? texto.slice(1) : texto;
  const registros: RegistroCsv[] = [];
  let campos: string[] = [];
  let campo = "";
  let linhaAtual = 1;
  let linhaDoRegistro = 1;
  let entreAspas = false;
  let campoComAspas = false;

  const fecharCampo = () => {
    campos.push(campoComAspas ? campo : campo.trim());
    campo = "";
    campoComAspas = false;
  };
  const fecharRegistro = () => {
    fecharCampo();
    const vazio = campos.length === 1 && campos[0] === "";
    if (!vazio) registros.push({ numero: linhaDoRegistro, campos });
    campos = [];
  };

  for (let i = 0; i < fonte.length; i++) {
    const c = fonte[i];
    if (entreAspas) {
      if (c === '"') {
        if (fonte[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreAspas = false;
          const proximo = fonte[i + 1];
          if (proximo !== undefined && proximo !== SEPARADOR && proximo !== "\n" && proximo !== "\r") {
            return { ok: false, linha: linhaAtual, problema: "texto depois das aspas que fecham o campo" };
          }
        }
      } else {
        if (c === "\n") linhaAtual++;
        campo += c;
      }
      continue;
    }
    if (c === '"' && campo.trim() === "" && !campoComAspas) {
      entreAspas = true;
      campoComAspas = true;
      campo = "";
    } else if (c === SEPARADOR) {
      fecharCampo();
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && fonte[i + 1] === "\n") i++;
      fecharRegistro();
      linhaAtual++;
      linhaDoRegistro = linhaAtual;
    } else {
      campo += c;
    }
  }
  if (entreAspas) {
    return { ok: false, linha: linhaDoRegistro, problema: "aspas abertas e nunca fechadas" };
  }
  if (campo !== "" || campos.length > 0 || campoComAspas) fecharRegistro();
  return { ok: true, registros };
}
