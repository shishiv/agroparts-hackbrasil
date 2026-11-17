import type {
  CadastroMaterial,
  ChaveIdentidade,
  CodigoLegado,
  DefinicaoDeFamilia,
  Fragmentacao,
  Grupo,
  NaoVazia,
  SkuUsina,
  Unificacao,
  VeredictoDoSku,
} from "../contrato";
import { FAMILIAS } from "../motor/familias";

export interface SkuDiagnosticado {
  veredicto: VeredictoDoSku;
  /** Todos os códigos do cadastro com este SKU, em ordem de código. */
  codigos: NaoVazia<CodigoLegado>;
}

export interface Diagnostico {
  /** Um por SKU que aparece no cadastro, em ordem de SKU. Código sem SKU fica de fora. */
  skus: readonly SkuDiagnosticado[];
  /** Um por grupo com códigos em mais de um SKU, na ordem dos grupos. */
  fragmentacoes: readonly Fragmentacao[];
}

export interface Resumo {
  coerentes: number;
  misturas: number;
  inconclusivos: number;
  fragmentacoes: number;
}

const porTexto = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function naoVazia<T>(itens: readonly T[]): NaoVazia<T> | null {
  const [primeiro, ...resto] = itens;
  return primeiro === undefined ? null : [primeiro, ...resto];
}

function duasOuMais<T>(itens: readonly T[]): readonly [T, T, ...T[]] | null {
  const [primeiro, segundo, ...resto] = itens;
  return primeiro === undefined || segundo === undefined ? null : [primeiro, segundo, ...resto];
}

/** Os atributos que formam a chave do grupo, como o texto de um código dele os leu. Atributo não lido fica de fora. */
function atributosDaChaveDoGrupo(
  grupo: Grupo,
  unificacao: Unificacao,
  familias: readonly DefinicaoDeFamilia[],
): ReadonlyMap<string, string> {
  const familia = familias.find((f) => f.id === grupo.familia);
  if (!familia) throw new Error(`a família ${grupo.familia} do grupo ${grupo.chave} não está no registro do motor`);
  const leitura = unificacao.leituras.get(grupo.codigos[0]);
  if (leitura?.decisao !== "resolve") {
    throw new Error(`o código ${grupo.codigos[0]} está no grupo ${grupo.chave} sem leitura resolve`);
  }
  const valores = new Map<string, string>();
  for (const nome of familia.atributosDaChave) {
    const lidos = new Set(leitura.atributos.filter((a) => a.nome === nome).map((a) => a.valor));
    if (lidos.size > 0) valores.set(nome, [...lidos].sort(porTexto).join("+"));
  }
  return valores;
}

/** Os atributos da chave em que pelo menos dois dos grupos têm valor diferente, ou um lê e o outro não. */
function atributosQueDiferem(grupos: readonly Grupo[], unificacao: Unificacao): NaoVazia<string> {
  const perfis = grupos.map((g) => atributosDaChaveDoGrupo(g, unificacao, FAMILIAS));
  const nomes = new Set(perfis.flatMap((perfil) => [...perfil.keys()]));
  const diferem = [...nomes].filter((nome) => new Set(perfis.map((perfil) => perfil.get(nome) ?? null)).size > 1);
  const lista = naoVazia(diferem);
  if (!lista) throw new Error(`os grupos ${grupos.map((g) => g.chave).join(", ")} têm chaves diferentes e nenhum atributo diferente`);
  return lista;
}

function veredictoDoSku(sku: SkuUsina, codigos: NaoVazia<CodigoLegado>, unificacao: Unificacao): VeredictoDoSku {
  const grupos = new Map<ChaveIdentidade, Grupo>();
  const semChave: CodigoLegado[] = [];
  for (const codigo of codigos) {
    const grupo = unificacao.grupoDe(codigo);
    if (grupo) grupos.set(grupo.chave, grupo);
    else semChave.push(codigo);
  }

  const doSku = [...grupos.values()];
  const varios = duasOuMais(doSku);
  if (varios) {
    const [a, b, ...resto] = varios;
    return { tipo: "mistura", sku, chaves: [a.chave, b.chave, ...resto.map((g) => g.chave)], atributosQueDiferem: atributosQueDiferem(varios, unificacao) };
  }
  const sem = naoVazia(semChave);
  if (sem) return { tipo: "inconclusivo", sku, semChave: sem };
  const [unico] = doSku;
  if (!unico) throw new Error(`o SKU ${sku} não tem código`);
  return { tipo: "coerente", sku, chave: unico.chave };
}

function fragmentacoesDoCadastro(skuDe: ReadonlyMap<CodigoLegado, SkuUsina>, unificacao: Unificacao): Fragmentacao[] {
  const fragmentadas: Fragmentacao[] = [];
  for (const grupo of unificacao.grupos.values()) {
    const skus = duasOuMais([...new Set(grupo.codigos.flatMap((c) => skuDe.get(c) ?? []))].sort(porTexto));
    if (skus) fragmentadas.push({ grupo, skus });
  }
  return fragmentadas;
}

/**
 * Compara o SKU que a usina deu a cada código com os grupos que o motor formou.
 *
 * - Mistura: o SKU tem códigos de dois ou mais grupos, mesmo que também tenha códigos sem grupo.
 * - Inconclusivo: não é mistura e tem código sem grupo (revisa ou recusa), que pode ou não ser a mesma peça.
 * - Coerente: todos os códigos do SKU estão no mesmo grupo.
 * - Fragmentação: um grupo com códigos em dois ou mais SKUs.
 *
 * Só lê. Nem o SKU nem o grupo mudam.
 */
export function diagnosticar(cadastro: readonly CadastroMaterial[], unificacao: Unificacao): Diagnostico {
  const codigosPorSku = new Map<SkuUsina, CodigoLegado[]>();
  const skuDe = new Map<CodigoLegado, SkuUsina>();
  for (const { codigo, sku } of cadastro) {
    if (sku === null) continue;
    skuDe.set(codigo, sku);
    const codigos = codigosPorSku.get(sku);
    if (codigos) codigos.push(codigo);
    else codigosPorSku.set(sku, [codigo]);
  }

  const skus: SkuDiagnosticado[] = [];
  for (const [sku, codigos] of [...codigosPorSku].sort(([a], [b]) => porTexto(a, b))) {
    const ordenados = naoVazia(codigos.toSorted(porTexto));
    if (ordenados) skus.push({ veredicto: veredictoDoSku(sku, ordenados, unificacao), codigos: ordenados });
  }
  return { skus, fragmentacoes: fragmentacoesDoCadastro(skuDe, unificacao) };
}

export function resumir({ skus, fragmentacoes }: Diagnostico): Resumo {
  const conta = (tipo: VeredictoDoSku["tipo"]) => skus.filter((s) => s.veredicto.tipo === tipo).length;
  return {
    coerentes: conta("coerente"),
    misturas: conta("mistura"),
    inconclusivos: conta("inconclusivo"),
    fragmentacoes: fragmentacoes.length,
  };
}
