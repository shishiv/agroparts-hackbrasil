interface Ambiente {
  GROQ_API_KEY?: string;
}

interface Contexto {
  request: Request;
  env: Ambiente;
}

const TRANSCRICAO_DO_GROQ = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODELO = "whisper-large-v3-turbo";

/** Vocabulário, sem designação inteira: um exemplo completo apareceria na resposta quando a fala fosse curta ou confusa. */
const PROMPT = "Rolamento rígido de esferas. Vedação 2RS, 2Z, ZZ. Folga C3.";

/** Teto de arquivo do plano grátis do Groq: https://console.groq.com/docs/speech-to-text. */
const TETO_DO_ARQUIVO = 25 * 1024 * 1024;

const EXTENSAO_DO_TIPO: ReadonlyMap<string, string> = new Map([
  ["audio/webm", "webm"],
  ["audio/mp4", "m4a"],
  ["audio/x-m4a", "m4a"],
  ["audio/ogg", "ogg"],
  ["audio/mpeg", "mp3"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/flac", "flac"],
]);

const resposta = (status: number, corpo: Record<string, unknown>, cabecalhos: HeadersInit = {}): Response =>
  Response.json(corpo, { status, headers: { "cache-control": "no-store", ...cabecalhos } });

/** Com silêncio ou só ruído, o Whisper devolve a última frase do prompt como se fosse fala. */
function ecoDoPrompt(texto: string): boolean {
  const frase = texto.trim().toLowerCase().replace(/\.+$/, "");
  return frase !== "" && PROMPT.toLowerCase().split(/\.\s*/).includes(frase);
}

function textoDaResposta(corpo: unknown): string | null {
  if (typeof corpo !== "object" || corpo === null || !("text" in corpo)) return null;
  return typeof corpo.text === "string" ? corpo.text : null;
}

/** Recebe a gravação no corpo da requisição e devolve `{ texto, modelo, ms }`. A chave do Groq fica aqui, no servidor. */
export const onRequestPost = async ({ request, env }: Contexto): Promise<Response> => {
  const chave = env.GROQ_API_KEY;
  if (!chave) return resposta(503, { erro: "sem-chave" });

  const tipo = (request.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  const extensao = EXTENSAO_DO_TIPO.get(tipo);
  if (!extensao) return resposta(415, { erro: "formato" });

  if (Number(request.headers.get("content-length")) > TETO_DO_ARQUIVO) return resposta(413, { erro: "arquivo-grande" });
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) return resposta(400, { erro: "arquivo-vazio" });
  if (bytes.byteLength > TETO_DO_ARQUIVO) return resposta(413, { erro: "arquivo-grande" });

  const formulario = new FormData();
  formulario.set("file", new File([bytes], `fala.${extensao}`, { type: tipo }));
  formulario.set("model", MODELO);
  formulario.set("language", "pt");
  formulario.set("temperature", "0");
  formulario.set("response_format", "json");
  formulario.set("prompt", PROMPT);

  const inicio = Date.now();
  let groq: Response;
  try {
    groq = await fetch(TRANSCRICAO_DO_GROQ, { method: "POST", headers: { authorization: `Bearer ${chave}` }, body: formulario });
  } catch {
    return resposta(502, { erro: "groq" });
  }
  if (groq.status === 429) {
    const repetirEm = groq.headers.get("retry-after");
    return resposta(429, { erro: "limite" }, repetirEm ? { "retry-after": repetirEm } : {});
  }
  if (!groq.ok) return resposta(502, { erro: "groq", status: groq.status });

  const texto = textoDaResposta(await groq.json().catch(() => null));
  if (texto === null) return resposta(502, { erro: "groq" });
  return resposta(200, { texto: ecoDoPrompt(texto) ? "" : texto.trim(), modelo: MODELO, ms: Date.now() - inicio });
};
