import type { ItemCatmat } from "../baixar-catmat";
import type { AtributoJson, LeituraJson } from "../../src/exportacao";
import {
  CODIGO_SEM_TEXTO,
  CONTRADICOES,
  DUPLICATAS,
  EQUIPAMENTOS,
  ESTOQUE_FIXO,
  OUTRAS_PECAS_DO_CENARIO,
  OUTROS_ROLAMENTOS,
  PARTES,
  PRIMEIRO_DIA,
  ULTIMO_DIA,
  type EquipamentoDoCenario,
  type ParteDoCenario,
} from "./cenario";
import { campoDe, conferirParte, type Catmat } from "./catmat";
import { Sorteio } from "./sorteio";
import { ESTILOS_DE_USINA, descreverParte } from "./textos";

export const FAMILIA_DO_EXEMPLO = "rolamento-rigido-de-esferas";
export const PRIMEIRO_CODIGO = 10001;

export interface MaterialDaUsina {
  codigo: string;
  descricao: string;
  unidade: string;
  sku: string | null;
  /** Peça do cenário a que o código pertence; só os códigos de decisão resolve têm. */
  parte: string | null;
  leitura: LeituraJson;
}

export interface EquipamentoDaUsina {
  patrimonio: string;
  tag: string;
  nome: string;
  area: string;
}

export interface TrocaDaUsina {
  ordem: string;
  data: string;
  patrimonio: string;
  tipo: "preventiva" | "corretiva" | "preditiva" | "outra";
  descricaoOrdem: string;
  codigo: string;
  descricaoMaterial: string;
  quantidade: number;
  unidade: string;
  posicao: string | null;
}

export interface SaldoDaUsina {
  codigo: string;
  quantidade: number;
  unidade: string;
  endereco: string | null;
}

export interface UsinaDemo {
  equipamentos: EquipamentoDaUsina[];
  materiais: MaterialDaUsina[];
  trocas: TrocaDaUsina[];
  estoque: SaldoDaUsina[];
}

interface CodigoPlanejado {
  descricao: string;
  unidade: string;
  sku: string | null;
  parte: string | null;
  leitura: LeituraJson;
  /** Id do cenário (`pNN` e índice, `rNN`, `cNN`, `oNN`, `xNN`, `t01`). */
  id: string;
  /** Peça de que a usina costuma lançar este código quando não é um código da própria peça. */
  deParte: string | null;
}

function ordenarPorCodigo<T extends { codigo: string }>(lista: T[]): T[] {
  return lista.sort((a, b) => (a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0));
}

function localizar(texto: string, trecho: string, nome: string, valor: string): AtributoJson[] {
  const inicio = texto.indexOf(trecho);
  if (inicio < 0) throw new Error(`"${trecho}" não está em "${texto}"`);
  return [{ nome, valor, trecho: { inicio, fim: inicio + trecho.length } }];
}

function itemDaPeca(catmat: Catmat, pdm: number, indice: number): ItemCatmat {
  const ativos = catmat.outrasPecas
    .filter((i) => i.codigoPdm === pdm && i.statusItem)
    .sort((a, b) => a.codigoItem - b.codigoItem);
  const item = ativos[indice];
  if (!item) throw new Error(`o CATMAT baixado não tem o ${indice + 1}º item ativo do PDM ${pdm}`);
  return item;
}

function planejarCodigos(catmat: Catmat, sorteio: Sorteio): CodigoPlanejado[] {
  const planejados: CodigoPlanejado[] = [];
  const textosUsados = new Set<string>();

  for (const parte of PARTES) {
    const item = conferirParte(parte, catmat.rolamentos.get(parte.item));
    for (let i = 0; i < parte.codigos; i++) {
      let texto = descreverParte(parte, item, "catmat", sorteio);
      for (let tentativa = 0; i > 0 && textosUsados.has(texto.texto); tentativa++) {
        if (tentativa > 50) throw new Error(`peça ${parte.id}: não achei texto novo para o código ${i + 1}`);
        texto = descreverParte(parte, item, sorteio.escolher(ESTILOS_DE_USINA), sorteio);
      }
      textosUsados.add(texto.texto);
      planejados.push({
        id: `${parte.id}.${i}`,
        descricao: texto.texto,
        unidade: parte.unidades?.[i] ?? "UN",
        sku: parte.skus[i] ?? null,
        parte: parte.id,
        deParte: null,
        leitura: {
          decisao: "resolve",
          familia: FAMILIA_DO_EXEMPLO,
          chave: `exemplo|${parte.serie}|${parte.vedacao}|${parte.folga}`,
          rotulo: `Rolamento ${parte.serie}-${parte.vedacao}${parte.folga === "C3" ? " C3" : ""}`,
          atributos: texto.atributos,
        },
      });
    }
  }

  for (const d of DUPLICATAS) {
    const parte = PARTES.find((p) => p.id === d.deParte);
    const atributos: AtributoJson[] = [];
    if (parte && d.traz.includes("serie")) atributos.push(...localizar(d.texto, parte.serie, "serie", parte.serie));
    if (d.traz.includes("folga")) atributos.push(...localizar(d.texto, "C3", "folga", "C3"));
    planejados.push({
      id: d.id,
      descricao: d.texto,
      unidade: "UN",
      sku: d.sku,
      parte: null,
      deParte: d.deParte,
      leitura: {
        decisao: "revisa",
        familia: d.motivo === "designacao-ausente" ? null : FAMILIA_DO_EXEMPLO,
        pendencias: [d.motivo],
        atributos,
      },
    });
  }

  for (const c of CONTRADICOES) {
    const parte = PARTES.find((p) => p.id === c.deParte);
    planejados.push({
      id: c.id,
      descricao: c.texto,
      unidade: "UN",
      sku: c.sku,
      parte: null,
      deParte: c.deParte,
      leitura: {
        decisao: "recusa",
        motivo: "contradicao",
        detalhe: c.detalhe,
        atributos: parte ? localizar(c.texto, parte.serie, "serie", parte.serie) : [],
      },
    });
  }

  for (const o of OUTROS_ROLAMENTOS) {
    const item = catmat.rolamentos.get(o.item);
    if (!item?.statusItem) throw new Error(`rolamento ${o.id}: item ${o.item} ausente ou inativo no CATMAT baixado`);
    const tipo = campoDe(item.descricaoItem, "CARACTERÍSTICAS ADICIONAIS");
    if (!tipo || /RÍGIDO/.test(tipo)) throw new Error(`rolamento ${o.id}: o item ${o.item} é rígido ou não diz o tipo`);
    planejados.push({
      id: o.id,
      descricao: item.descricaoItem,
      unidade: "UN",
      sku: o.sku,
      parte: null,
      deParte: null,
      leitura: {
        decisao: "recusa",
        motivo: "fora-das-familias",
        detalhe: `rolamento de esferas ${tipo.toLowerCase()}, não rígido`,
        atributos: [],
      },
    });
  }

  for (const x of OUTRAS_PECAS_DO_CENARIO) {
    const item = itemDaPeca(catmat, x.pdm, x.indice);
    planejados.push({
      id: x.id,
      descricao: item.descricaoItem,
      unidade: x.unidade,
      sku: x.sku,
      parte: null,
      deParte: null,
      leitura: {
        decisao: "recusa",
        motivo: "fora-das-familias",
        detalhe: `${item.nomePdm.toLowerCase()}, classe ${item.codigoClasse} do CATMAT`,
        atributos: [],
      },
    });
  }

  planejados.push({
    id: CODIGO_SEM_TEXTO.id,
    descricao: "",
    unidade: "UN",
    sku: CODIGO_SEM_TEXTO.sku,
    parte: null,
    deParte: CODIGO_SEM_TEXTO.deParte,
    leitura: { decisao: "recusa", motivo: "sem-texto", detalhe: "descrição vazia no cadastro", atributos: [] },
  });
  return planejados;
}

function numerarCodigos(planejados: CodigoPlanejado[], sorteio: Sorteio): Map<string, string> {
  const codigoDe = new Map<string, string>();
  let proximo = PRIMEIRO_CODIGO;
  for (const planejado of sorteio.embaralhar(planejados)) {
    codigoDe.set(planejado.id, String(proximo));
    proximo += sorteio.inteiro(1, 7);
  }
  return codigoDe;
}

const NUMERO_DE_DIAS = Math.round(
  (Date.UTC(ULTIMO_DIA.ano, ULTIMO_DIA.mes - 1, ULTIMO_DIA.dia) -
    Date.UTC(PRIMEIRO_DIA.ano, PRIMEIRO_DIA.mes - 1, PRIMEIRO_DIA.dia)) /
    86_400_000,
);

function dataDoDia(deslocamento: number): string {
  return new Date(Date.UTC(PRIMEIRO_DIA.ano, PRIMEIRO_DIA.mes - 1, PRIMEIRO_DIA.dia + deslocamento))
    .toISOString()
    .slice(0, 10);
}

type TipoDeOrdem = TrocaDaUsina["tipo"];

function descreverOrdem(tipo: TipoDeOrdem, equipamento: EquipamentoDoCenario, sorteio: Sorteio): string {
  const nome = equipamento.nome.toLowerCase();
  const equipe = sorteio.escolher(["Equipe mecânica A", "Equipe mecânica B", "Equipe mecânica C"]);
  const modelos: Record<TipoDeOrdem, readonly string[]> = {
    preventiva: [
      `Preventiva: troca programada de rolamentos, ${nome}`,
      `Revisão do plano de lubrificação e troca de componentes, ${nome} (${equipe})`,
      `Preventiva de entressafra, ${nome}`,
    ],
    corretiva: [
      `Corretiva: ruído no mancal, ${nome}`,
      `Corretiva: aquecimento acima do limite, ${nome} (${equipe})`,
      `Corretiva: vibração alta, ${nome}`,
      `Parada não programada, ${nome} (${equipe})`,
    ],
    preditiva: [
      `Preditiva: análise de vibração indicou desgaste, ${nome}`,
      `Preditiva: termografia fora do padrão, ${nome} (${equipe})`,
    ],
    outra: [`Inspeção de rotina, ${nome}`, `Ajuste e reaperto, ${nome} (${equipe})`],
  };
  return sorteio.escolher(modelos[tipo]);
}

function sortearTipo(sorteio: Sorteio): TipoDeOrdem {
  return sorteio.escolherComPeso<TipoDeOrdem>([
    ["preventiva", 50],
    ["corretiva", 35],
    ["preditiva", 10],
    ["outra", 5],
  ]);
}

interface Visita {
  dia: number;
  equipamento: EquipamentoDoCenario;
}

function sortearVisitas(sorteio: Sorteio): Visita[] {
  const visitas: Visita[] = [];
  for (const equipamento of EQUIPAMENTOS) {
    for (let dia = sorteio.inteiro(0, 30); dia <= NUMERO_DE_DIAS; dia += sorteio.inteiro(25, 45)) {
      visitas.push({ dia, equipamento });
    }
  }
  return visitas.sort(
    (a, b) => a.dia - b.dia || (a.equipamento.patrimonio < b.equipamento.patrimonio ? -1 : 1),
  );
}

/** Peças com três códigos ou mais guardam o último só no estoque: nenhuma máquina o lança. */
function indiceDoCodigoSoEstoque(parte: ParteDoCenario): number | null {
  return parte.codigos >= 3 ? parte.codigos - 1 : null;
}

export function montarUsina(catmat: Catmat, semente: number): UsinaDemo {
  const sorteio = new Sorteio(semente);
  const planejados = planejarCodigos(catmat, sorteio);
  const codigoDe = numerarCodigos(planejados, sorteio);
  const codigoDoId = (id: string): string => {
    const codigo = codigoDe.get(id);
    if (!codigo) throw new Error(`cenário cita ${id}, que não virou código`);
    return codigo;
  };

  const materiais: MaterialDaUsina[] = ordenarPorCodigo(
    planejados.map((p) => ({
      codigo: codigoDoId(p.id),
      descricao: p.descricao,
      unidade: p.unidade,
      sku: p.sku,
      parte: p.parte,
      leitura: p.leitura,
    })),
  );

  const desviosDaPeca = (parteId: string): string[] =>
    planejados.filter((p) => p.deParte === parteId).map((p) => p.id);

  function escolherCodigo(
    alvo: string,
    semCodigos: readonly number[],
    indiceDaPosicao: number,
  ): string {
    const parte = PARTES.find((p) => p.id === alvo);
    if (!parte) return codigoDoId(alvo);
    const soEstoque = indiceDoCodigoSoEstoque(parte);
    const usaveis = Array.from({ length: parte.codigos }, (_, i) => i).filter(
      (i) => i !== soEstoque && !semCodigos.includes(i),
    );
    const habitual = usaveis[indiceDaPosicao % usaveis.length];
    const pesos: (readonly [string, number])[] = usaveis.map((i) => [
      `${parte.id}.${i}`,
      i === habitual ? 50 : 30 / Math.max(1, usaveis.length - 1),
    ]);
    for (const id of desviosDaPeca(parte.id)) pesos.push([id, 3]);
    return codigoDoId(sorteio.escolherComPeso(pesos));
  }

  const trocas: TrocaDaUsina[] = [];
  const visitas = sortearVisitas(sorteio);
  visitas.forEach((visita, numero) => {
    const { equipamento } = visita;
    const escolhidas = equipamento.posicoes.filter(() => sorteio.chance(0.7));
    const [primeira] = escolhidas;
    const trocadas = primeira ? escolhidas : [sorteio.escolher(equipamento.posicoes)];
    const tipo = sortearTipo(sorteio);
    const ordem = String(100001 + numero);
    const descricaoOrdem = descreverOrdem(tipo, equipamento, sorteio);
    for (const posicao of trocadas) {
      const indice = equipamento.posicoes.indexOf(posicao);
      const codigo = escolherCodigo(posicao.alvo, posicao.semCodigos ?? [], indice);
      const material = materiais.find((m) => m.codigo === codigo);
      const outra = OUTRAS_PECAS_DO_CENARIO.find((x) => x.id === posicao.alvo);
      if (!material) throw new Error(`código ${codigo} sem material`);
      const quantidade = outra
        ? sorteio.escolher(outra.quantidades)
        : sorteio.chance(0.2)
          ? Math.max(1, posicao.quantidade - 1)
          : posicao.quantidade;
      trocas.push({
        ordem,
        data: dataDoDia(visita.dia),
        patrimonio: equipamento.patrimonio,
        tipo,
        descricaoOrdem,
        codigo,
        descricaoMaterial: material.descricao,
        quantidade,
        unidade: material.unidade,
        posicao: sorteio.chance(outra ? 0.6 : 0.7) ? posicao.posicao : null,
      });
    }
  });

  const estoque = montarEstoque(materiais, sorteio, codigoDoId);

  return {
    equipamentos: EQUIPAMENTOS.map(({ patrimonio, tag, nome, area }) => ({ patrimonio, tag, nome, area })),
    materiais,
    trocas,
    estoque,
  };
}

function endereco(sorteio: Sorteio): string | null {
  if (sorteio.chance(0.15)) return null;
  const rua = sorteio.escolher(["A", "B", "C", "D"]);
  const prateleira = String(sorteio.inteiro(1, 12)).padStart(2, "0");
  return `${rua}-${prateleira}-${sorteio.inteiro(1, 4)}`;
}

/**
 * Saldo de propósito sob o código "errado": o código de só estoque da peça
 * guarda as unidades, e as máquinas lançam os outros.
 */
function montarEstoque(
  materiais: readonly MaterialDaUsina[],
  sorteio: Sorteio,
  codigoDoId: (id: string) => string,
): SaldoDaUsina[] {
  const saldos: SaldoDaUsina[] = [];
  const unidadeDe = new Map(materiais.map((m) => [m.codigo, m.unidade]));
  const guardar = (codigo: string, quantidade: number, onde: string | null) => {
    const unidade = unidadeDe.get(codigo);
    if (!unidade) throw new Error(`estoque de código ${codigo} sem material`);
    saldos.push({ codigo, quantidade, unidade, endereco: onde });
  };

  for (const parte of PARTES) {
    const fixo = ESTOQUE_FIXO[parte.id];
    const soEstoque = indiceDoCodigoSoEstoque(parte);
    for (let i = 0; i < parte.codigos; i++) {
      const codigo = codigoDoId(`${parte.id}.${i}`);
      const dado = fixo?.[i];
      if (fixo) {
        if (!dado) throw new Error(`estoque fixo da peça ${parte.id} sem o código ${i + 1}`);
        guardar(codigo, dado.quantidade, dado.endereco);
      } else if (i === soEstoque) {
        guardar(codigo, sorteio.inteiro(2, 8), endereco(sorteio));
      } else if (soEstoque === null && i === 0 && sorteio.chance(0.7)) {
        guardar(codigo, sorteio.inteiro(2, 6), endereco(sorteio));
      } else {
        const sorte = sorteio.proximo();
        if (sorte < 0.3) guardar(codigo, 0, null);
        else if (sorte < 0.5) guardar(codigo, sorteio.inteiro(1, 4), endereco(sorteio));
      }
    }
  }

  const demais = [...OUTRAS_PECAS_DO_CENARIO.map((x) => x.id), ...OUTROS_ROLAMENTOS.map((o) => o.id)];
  for (const id of [...demais, ...DUPLICATAS.map((d) => d.id)]) {
    if (sorteio.chance(0.6)) guardar(codigoDoId(id), sorteio.inteiro(1, 6), endereco(sorteio));
  }
  return ordenarPorCodigo(saldos);
}
