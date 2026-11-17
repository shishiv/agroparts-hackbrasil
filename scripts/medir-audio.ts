/**
 * Mede o caminho do áudio numa pasta de gravações: arquivo, função `/api/audio`,
 * `falaParaTexto` e motor, o mesmo código que a página usa.
 *
 *   bun run scripts/medir-audio.ts <pasta> [--saida <arquivo.md>]
 *
 * A pasta traz os arquivos de áudio e um `falas.json` (formato em docs/medicao/audio.md).
 * A chave do Groq vem de GROQ_API_KEY, no ambiente ou em `.dev.vars`.
 */
import { basename, extname, join, resolve } from "node:path";
import type { ChaveIdentidade } from "../src/contrato";
import { onRequestPost } from "../functions/api/audio";
import { identificarPeca, textoParaConferir, transcrever, type Buscar } from "../src/entrada/audio";
import { lerManifesto, relatorio, resultadoDaLeitura, type Fala, type Medida } from "../src/entrada/medicao";
import { motor } from "../src/motor";

/** O plano grátis do Groq para o whisper-large-v3-turbo aceita 20 chamadas por minuto. */
const ESPERA_ENTRE_CHAMADAS_MS = 3100;

const TIPO_DO_ARQUIVO: ReadonlyMap<string, string> = new Map([
  [".webm", "audio/webm"],
  [".m4a", "audio/mp4"],
  [".mp4", "audio/mp4"],
  [".ogg", "audio/ogg"],
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".flac", "audio/flac"],
]);

const falhar = (mensagem: string): never => {
  console.error(mensagem);
  process.exit(1);
};

async function chaveDoGroq(): Promise<string> {
  const doAmbiente = process.env.GROQ_API_KEY;
  if (doAmbiente) return doAmbiente;
  const devVars = Bun.file(resolve(import.meta.dir, "../.dev.vars"));
  if (await devVars.exists()) {
    const achada = /^GROQ_API_KEY\s*=\s*"?([^"\n]+)"?\s*$/m.exec(await devVars.text());
    if (achada?.[1]) return achada[1].trim();
  }
  return falhar("Falta GROQ_API_KEY, no ambiente ou em .dev.vars.");
}

function chaveEsperada(fala: Fala): ChaveIdentidade {
  const leitura = motor.ler({ texto: fala.esperado, origem: { tipo: "digitado" } });
  if (leitura.decisao !== "resolve") return falhar(`${fala.arquivo}: o texto esperado "${fala.esperado}" não resolve no motor (${leitura.decisao}).`);
  return leitura.chave;
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

async function medir(pasta: string, chave: string): Promise<string> {
  const arquivoDeFalas = Bun.file(join(pasta, "falas.json"));
  if (!(await arquivoDeFalas.exists())) return falhar(`Não achei ${join(pasta, "falas.json")}.`);
  const lido = lerManifesto(await arquivoDeFalas.json());
  if (!lido.ok) return falhar(`falas.json com problema:\n- ${lido.problemas.join("\n- ")}`);
  const { manifesto } = lido;

  let tempoDaUltima: number | null = null;
  const buscar: Buscar = async (endereco, requisicao) => {
    const resposta = await onRequestPost({ request: new Request(`https://medicao.local${endereco}`, requisicao), env: { GROQ_API_KEY: chave } });
    const corpo: unknown = await resposta.clone().json();
    tempoDaUltima = typeof corpo === "object" && corpo !== null && "ms" in corpo && typeof corpo.ms === "number" ? corpo.ms : null;
    return resposta;
  };

  const medidas: Medida[] = [];
  for (const [i, fala] of manifesto.falas.entries()) {
    const esperada = chaveEsperada(fala);
    const arquivo = Bun.file(join(pasta, fala.arquivo));
    const tipo = TIPO_DO_ARQUIVO.get(extname(fala.arquivo).toLowerCase());
    if (!tipo) return falhar(`${fala.arquivo}: extensão sem tipo de áudio conhecido.`);
    if (!(await arquivo.exists())) return falhar(`Não achei ${join(pasta, fala.arquivo)}.`);
    if (i > 0) await esperar(ESPERA_ENTRE_CHAMADAS_MS);

    tempoDaUltima = null;
    const resultado = await transcrever(new Blob([await arquivo.arrayBuffer()], { type: tipo }), buscar);
    if (!resultado.ok) {
      medidas.push({ fala, ouvido: null, campo: null, resultado: { tipo: "sem-texto", falha: resultado.falha }, ms: tempoDaUltima });
    } else {
      const campo = textoParaConferir(resultado.transcricao);
      const { leitura } = identificarPeca(resultado.transcricao, campo, false);
      medidas.push({ fala, ouvido: resultado.transcricao.texto, campo, resultado: resultadoDaLeitura(leitura, esperada), ms: resultado.transcricao.ms });
    }
    console.error(`${basename(fala.arquivo)}: ${medidas.at(-1)?.resultado.tipo}`);
  }
  return relatorio(manifesto, medidas);
}

const [pasta, flagSaida, saida] = process.argv.slice(2);
if (!pasta || (flagSaida !== undefined && (flagSaida !== "--saida" || !saida))) {
  falhar("Uso: bun run scripts/medir-audio.ts <pasta> [--saida <arquivo.md>]");
}
const texto = await medir(resolve(pasta ?? "."), await chaveDoGroq());
if (saida) await Bun.write(resolve(saida), `${texto}\n`);
console.log(texto);
