import { describe, expect, it } from "vitest";
import type { Leitura } from "../contrato";
import { FAMILIAS } from "./familias";
import { ler } from "./ler";

const lerTexto = (texto: string): Leitura => ler({ texto, origem: { tipo: "digitado" } });

/** `resolve 6312 ZZ C3`, `revisa sufixo-desconhecido` ou `recusa contradicao`. */
function resumo(leitura: Leitura): string {
  if (leitura.decisao === "resolve") {
    const valor = (nome: string) => leitura.atributos.find((a) => a.nome === nome)?.valor;
    return `resolve ${valor("serie")} ${valor("vedacao")} ${valor("folga")}`;
  }
  if (leitura.decisao === "revisa") return `revisa ${leitura.pendencias.join("+")}`;
  return `recusa ${leitura.motivo}`;
}

describe("ler: o que resolve, com a peça que o texto prova", () => {
  const CASOS: readonly (readonly [string, string])[] = [
    ["ROL 6312-2Z/C3 60X130X31 SKF", "resolve 6312 ZZ C3"],
    ["ROLAMENTO RIGIDO DE ESFERAS 6312 ZZ - 60X130X31 MM - 1 CARREIRA", "resolve 6312 ZZ CN"],
    ["rolamento 6312-2z c3 nsk", "resolve 6312 ZZ C3"],
    ["ROLAM. 6308 2Z/C3 FAG", "resolve 6308 ZZ C3"],
    ["ROL RIG ESF 6204-2RS1", "resolve 6204 2RS CN"],
    ["rolamento rigido de esferas 6309-2rs1 skf", "resolve 6309 2RS CN"],
    ["ROLAMENTO 6205-2-RS1", "resolve 6205 2RS CN"],
    ["ROLAMENTO 6205 2RSH", "resolve 6205 2RS CN"],
    ["ROLAMENTO 6205-RS", "resolve 6205 RS CN"],
    ["ROLAMENTO 6205 RS1", "resolve 6205 RS CN"],
    ["ROLAMENTO 6211 ZZC3", "resolve 6211 ZZ C3"],
    ["ROLAMENTO 6211 ZC3", "resolve 6211 Z C3"],
    ["ROLAMENTO 6217ZZ-C3", "resolve 6217 ZZ C3"],
    ["ROLAMENTO 6204-2Z/C4", "resolve 6204 ZZ C4"],
    ["ROLAMENTO 6224 ABERTO", "resolve 6224 ABERTO CN"],
    ["ROLAMENTO 6224 S/ BLINDAGEM", "resolve 6224 ABERTO CN"],
    ["ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , REFERÊNCIA FABRICANTE: 6205 ZZ , FOLGA C3", "resolve 6205 ZZ C3"],
    ["ROLAMENTO 16.003-2Z SKF", "resolve 16003 ZZ CN"],
    ["ROLAMENTO 61801 2RS", "resolve 61801 2RS CN"],
    ["ROLAMENTO 62206-2RS", "resolve 62206 2RS CN"],
    ["ROLAMENTO 626ZZ", "resolve 626 ZZ CN"],
    ["ROLAMENTO 6409 ZZ", "resolve 6409 ZZ CN"],
    ["6310-2Z C3", "resolve 6310 ZZ C3"],
    ["SKF 6310-2Z/C3", "resolve 6310 ZZ C3"],
    ["ROLAMENTO 6205 ZZ 1 UN", "resolve 6205 ZZ CN"],
    ["ROLAMENTO 6202RS", "resolve 6202 RS CN"],
    ["ROLAMENTO DE ESFERA, TIPO USO: MOTORES ELÉTRICOS WEG, BRASIL E SIMILARES , REFERÊNCIA FABRICANTE: 6204 ZZ", "resolve 6204 ZZ CN"],
    ["ROLAMENTO DE ESFERA, TIPO USO: MOTOR, FOLGA C3 , REFERÊNCIA FABRICANTE 1: 6310 ZZ", "resolve 6310 ZZ C3"],
    ["ROLAMENTO DE ESFERA, CARACTERISTICAS  ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS, REFERÊNCIA FABRICANTE: 6205 2RS", "resolve 6205 2RS CN"],
    ["ROLAMENTO 6205 ZZ 12 UN", "resolve 6205 ZZ CN"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6004ZZ , CARACTERÍSTICAS ADICIONAIS: 2 PLACAS DE VEDAÇÃO, 1 CARREIRA DE ESFERAS", "resolve 6004 ZZ CN"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6309ZZ , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS; CARGA DIN. APRO", "resolve 6309 ZZ CN"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6204 ZZ , MATERIAL: AÇO", "resolve 6204 ZZ CN"],
    ["ROLAMENTO DE ESFERA, CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS; CARGA DIN. APRO , REFERÊNCIA FABRICANTE: 6309ZZ", "resolve 6309 ZZ CN"],
  ];
  for (const [texto, esperado] of CASOS) {
    it(`${texto} -> ${esperado}`, () => {
      expect(resumo(lerTexto(texto))).toBe(esperado);
    });
  }

  it("guarda o trecho do texto original que prova cada atributo", () => {
    const texto = "Rol. 6312-2Z/C3 60X130X31 SKF";
    const leitura = lerTexto(texto);
    if (leitura.decisao !== "resolve") throw new Error(resumo(leitura));
    const provas = leitura.atributos.map((a) => [a.nome, a.valor, texto.slice(a.trecho.inicio, a.trecho.fim)]);
    expect(provas).toEqual([
      ["serie", "6312", "6312"],
      ["vedacao", "ZZ", "2Z"],
      ["folga", "C3", "C3"],
    ]);
    expect(leitura.chave).toBe("rolamento-rigido-de-esferas|6312|ZZ|C3");
    expect(leitura.rotulo).toBe("Rolamento 6312 ZZ C3");
  });

  it("aponta o trecho na posição do texto original, mesmo com acento e minúsculas", () => {
    const texto = "Rolamento rígido, ref. 6205-2rs1 SKF";
    const leitura = lerTexto(texto);
    if (leitura.decisao !== "resolve") throw new Error(resumo(leitura));
    const vedacao = leitura.atributos.find((a) => a.nome === "vedacao");
    expect(texto.slice(vedacao?.trecho.inicio, vedacao?.trecho.fim)).toBe("2rs1");
  });

  it("escreve a folga normal como trecho vazio logo depois da vedação, porque o texto não a escreve", () => {
    const texto = "ROL 6312 ZZ 60X130X31";
    const leitura = lerTexto(texto);
    if (leitura.decisao !== "resolve") throw new Error(resumo(leitura));
    const folga = leitura.atributos.find((a) => a.nome === "folga");
    expect(folga?.valor).toBe("CN");
    expect(folga?.trecho).toEqual({ inicio: 11, fim: 11 });
    expect(texto.slice(0, 11)).toBe("ROL 6312 ZZ");
  });

  it("dá a cada família atributos que cobrem os da chave", () => {
    const leitura = lerTexto("ROL 6312 ZZ C3");
    if (leitura.decisao !== "resolve") throw new Error(resumo(leitura));
    const [familia] = FAMILIAS.filter((f) => f.id === leitura.familia);
    const nomes = leitura.atributos.map((a) => a.nome);
    expect(familia?.atributosDaChave.every((nome) => nomes.includes(nome))).toBe(true);
  });
});

describe("ler: o que vai a uma pessoa", () => {
  const CASOS: readonly (readonly [string, string])[] = [
    ["ROL 6312 C3", "revisa sufixo-desconhecido"],
    ["ROLAMENTO RIGIDO 6309", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 2ZR", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6306 VV C3", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6204 U", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 2RS2", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6006LLUC3", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6314 C3/EQ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205, BLINDAGEM UM DOS LADOS", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6202 2RS INOX", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ ALTA TEMPERATURA", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ FLANGEADO", "revisa sufixo-desconhecido"],
    ["ROL 6312 ABERTO C3", "revisa sufixo-desconhecido"],
    ["ROL 6310 BOMBA CALDO C3", "revisa sufixo-desconhecido"],
    ["ROL C3 6205 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO, ROTAÇÃO: 6.250 RPM", "revisa designacao-ausente"],
    ["ROL 6205 ZZ BOMBA DE CALDO", "revisa sufixo-desconhecido"],
    ["1 POLIA C/ ROLAMENTO 6205 ZZ", "revisa sufixo-desconhecido"],
    ["SKF MANCAL 6205 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO EXTRATOR 6205 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ - ANEL INTERNO", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ COM ANEL DE TRAVA", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ (NR)", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ SKF/HT", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205ZZNR ABERTO", "revisa sufixo-desconhecido"],
    ["ROL W 6205 2RS", "revisa sufixo-desconhecido"],
    ["ROL F-625ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO SKF E2 6205-2Z", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6316 ZZ C3 INSOCOAT", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 2RS ZIRCONIA", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 2RS P/ ALTAS TEMPERATURAS", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ FLANGEADA", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ + RETENTOR", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205ZZ E ROLAMENTO6206ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ OU 2205", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6312 ZZ FOLGA C 3", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 Z Z", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 EQUIVALENTE A 6205 2RS", "revisa sufixo-desconhecido"],
    ["ROLAMENTO NOTA FISCAL: NF-6205-ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ 30/62/16", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6202 2RS , MATERIAL: EM AÇO INOXIDÁVEL", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6232Z", "revisa duas-leituras"],
    ["ROLAMENTO 6082RS", "revisa duas-leituras"],
    ["ROLAMENTO 6262Z", "revisa duas-leituras"],
    ["ROLAMENTO 6052Z C3", "revisa duas-leituras"],
    ["ROLAMENTO 6082-RS1", "revisa duas-leituras"],
    ["ROLAMENTO 6262RSH", "revisa duas-leituras"],
    ["ROLAMENTO 6205 ZZ, TIPO USO: INOX", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6310 ZZ, APLICAÇÃO: MOENDA C3", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ, TIPO USO: 2RS", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ, TIPO USO: ABERTO", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, TIPO USO: MOTOR, INOX AISI 440C , REFERÊNCIA FABRICANTE 1: 6310 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ, CARACTERISTICAS ADICIONAIS: ZZC3", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ, CARACTERISTICAS ADICIONAIS: DDU", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, CARACTERISTICAS ADICIONAIS: POLIA ROLAMENTADA, REFERENCIA FABRICANTE 1: 6205 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6205 2RS, CARACTERÍSTICAS ADICIONAIS: AÇO 440C", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6205 2RS, CARACTERÍSTICAS ADICIONAIS: VEDAÇÃO EM VITON", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, CARACTERÍSTICAS ADICIONAIS: SUBSTITUI O 6205 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ \uff29\uff2e\uff2f\uff38", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ IN\u00adOX", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ \u4e0d\u9508\u94a2", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ \u00d830MM", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ, DIAMETRO INTERNO 1: 30 MM", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6205 ZZ, DIÂMETRO INTERNO: 30.0 MM", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6203 2RS, DIÂMETRO INTERNO: 5/8 POL", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205-2Z-E", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6205 ZZ, CARACTERÍSTICAS ADICIONAIS: 25X52X15,30X62X16", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ, FOLGA C3 / 6205 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205 ZZ / C3", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, TIPO USO: NR , REFERÊNCIA FABRICANTE: 6205 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, TIPO USO: MOTOR ZZC4, REFERENCIA FABRICANTE 1: 6205 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO DE ESFERA, TIPO USO: MOTOR ABERTO , REFERÊNCIA FABRICANTE: 6205", "revisa sufixo-desconhecido"],
    ["ROL, TIPO USO: 6205 ZZ COM ANEL ELASTICO", "revisa sufixo-desconhecido"],
    ["ROLAMENTO, TIPO USO: EIXO DE 30 MM , REFERÊNCIA FABRICANTE: 6205 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO AXIAL 6205 ZZ", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6205-2Z E", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 16.003-2Z SKF E", "revisa sufixo-desconhecido"],
    ["ROLAMENTO 6232-RS1", "revisa duas-leituras"],
    ["ROLAMENTO DE ESFERA, TIPO USO: MOTORES ELE\u0301TRICOS , REFERENCIA FABRICANTE: 6201 2RS1 , CARACTERISTICAS ADICIONAIS: META\u0301LICO E BLINDADO", "revisa sufixo-desconhecido"],
    ["ROLAMENTO P/ MANCAL BOMBA DE CALDO", "revisa designacao-ausente"],
    ["ROLAMENTO DE ESFERA, NOME: ROLAMENTO DE ESFERA", "revisa designacao-ausente"],
    ["ROL 6312 ZZ C3 / 6310 ZZ C3", "revisa duas-leituras"],
    ["ROLAMENTO 6308 2RS OU 6309 2RS", "revisa duas-leituras"],
    ["ROLAMENTO 6206 2RS1 – SKF/ 6206 DDU - NSK", "revisa duas-leituras"],
    ["ROLAMENTO 6205 ZZ / 6205 2RS", "revisa duas-leituras"],
  ];
  for (const [texto, esperado] of CASOS) {
    it(`${texto} -> ${esperado}`, () => {
      expect(resumo(lerTexto(texto))).toBe(esperado);
    });
  }

  it("lê duas vezes a mesma designação sem ver duas leituras", () => {
    expect(resumo(lerTexto("ROLAMENTO 6312 ZZ C3 6312"))).toBe("resolve 6312 ZZ C3");
  });
});

describe("ler: o que o motor recusa", () => {
  const CASOS: readonly (readonly [string, string])[] = [
    ["", "recusa sem-texto"],
    ["   ", "recusa sem-texto"],
    ["ROL 6205 ZZ 2RS C3", "recusa contradicao"],
    ["ROLAMENTO 6308 ZZ C3 C4", "recusa contradicao"],
    ["ROLAMENTO 6209-2RS, BLINDAGEM METÁLICA", "recusa contradicao"],
    ["ROLAMENTO 6205 ZZ, VEDAÇÃO NBR", "recusa contradicao"],
    ["ROLAMENTO 6017 Z, BLINDAGEM DUPLA", "recusa contradicao"],
    ["ROLAMENTO 608 ZZ, UMA BLINDAGEM", "recusa contradicao"],
    ["ROLAMENTO 6205 ZZ S/ BLINDAGEM", "recusa contradicao"],
    ["ROLAMENTO 6205 Z DUPLA BLINDAGEM", "recusa contradicao"],
    ["ROLAMENTO 6205 Z DUPLO", "recusa contradicao"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6205 Z , CARACTERÍSTICAS ADICIONAIS: 2 PLACAS DE VEDAÇÃO", "recusa contradicao"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 6205 ZZ , CARACTERÍSTICAS ADICIONAIS: 1 PLACA", "recusa contradicao"],
    ["ROLAMENTO RIGIDO DE DOIS CARREIRA DE ESFERAS 6205 ZZ", "recusa contradicao"],
    ["ROLAMENTO 6205 Z DOIS LADOS", "recusa contradicao"],
    ["ROLAMENTO 6205 ZZ SIMPLES", "recusa contradicao"],
    ["ROLAMENTO 6205 2RS UMA VEDACAO", "recusa contradicao"],
    ["ROLAMENTO 6205 ABERTO DE UM LADO", "recusa contradicao"],
    ["ROLAMENTO 6205 ABERTO BLINDAGEM DUPLA", "recusa contradicao"],
    ["ROLAMENTO 6205 SEM VEDACAO, BLINDAGEM DUPLA", "recusa contradicao"],
    ["ROLAMENTO 6205 ABERTO NBR", "recusa contradicao"],
    ["ROLAMENTO 6205 ZZ CARREIRA DUPLA", "recusa contradicao"],
    ["ROLAMENTO 6205 ZZ 2 CARREIRA", "recusa contradicao"],
    ["ROLAMENTO 6205 Z BLINDADO DOS DOIS LADOS", "recusa contradicao"],
    ["ROLAMENTO 6205 ZZ FURO 30MM", "recusa contradicao"],
    ["ROLAMENTO 6205 ZZ 30 X 62 X 16", "recusa contradicao"],
    ["ROLAMENTO 6312 ZZ 50 X 110 X 27", "recusa contradicao"],
    ["ROLAMENTO 6312 ZZ, DIÂMETRO INTERNO: 50 MM", "recusa contradicao"],
    ["ROL 6210 ZZ 60X130X31", "recusa contradicao"],
    ["ROLAMENTO 6309 ZZ AUTOCOMPENSADOR", "recusa contradicao"],
    ["RETENTOR, NOME: RETENTOR DE GRAXA", "recusa fora-das-familias"],
    ["POLIA, MATERIAL: ALUMÍNIO , CARACTERÍSTICAS ADICIONAIS: ROLAMENTADA, COM PLACAS OSCILANTES", "recusa fora-das-familias"],
    ["POLIA COM ROLAMENTO 6205 ZZ", "recusa fora-das-familias"],
    ["MANCAL P/ ROLAMENTO 6205 ZZ", "recusa fora-das-familias"],
    ["MANCAL P/ ROLAMENTO BOMBA DE CALDO", "recusa fora-das-familias"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: UCR 209", "recusa fora-das-familias"],
    ["ROLAMENTO DE ESFERA, REFERÊNCIA FABRICANTE: 3309", "recusa fora-das-familias"],
    ["ROLAMENTO 22213K", "recusa fora-das-familias"],
    ["ROLAMENTO 7205-B CONTATO ANGULAR", "recusa fora-das-familias"],
    ["ROLAMENTO 1206 EKTN9 AUTOCOMPENSADOR DE ESFERAS", "recusa fora-das-familias"],
    ["ROLAMENTO 63206 LLB/2A", "recusa fora-das-familias"],
    ["ROLAMENTO 6082 RS", "recusa fora-das-familias"],
    ["ROLAMENTO 6082", "recusa fora-das-familias"],
    ["ROLAMENTO 6085Z", "recusa fora-das-familias"],
    ["ROLAMENTO 63282RS", "recusa fora-das-familias"],
    ["CORREIA TRANSMISSÃO, MATERIAL: BORRACHA , TIPO: B 58", "recusa fora-das-familias"],
  ];
  for (const [texto, esperado] of CASOS) {
    it(`${JSON.stringify(texto)} -> ${esperado}`, () => {
      expect(resumo(lerTexto(texto))).toBe(esperado);
    });
  }

  it("diz o que se contradiz", () => {
    const leitura = lerTexto("ROLAMENTO 6312 ZZ, DIÂMETRO INTERNO: 50 MM");
    if (leitura.decisao !== "recusa") throw new Error(resumo(leitura));
    expect(leitura.detalhe).toBe("furo escrito de 50 mm, mas a designação 6312 tem 60 mm");
  });
});

describe("ler: a mesma peça escrita de jeitos diferentes tem a mesma chave, e peças diferentes não", () => {
  const chaveDe = (texto: string): string => {
    const leitura = lerTexto(texto);
    if (leitura.decisao !== "resolve") throw new Error(`${texto}: ${resumo(leitura)}`);
    return leitura.chave;
  };

  it("junta as grafias de uma peça", () => {
    const grafias = [
      "ROL 6312-2Z/C3",
      "ROLAMENTO RIGIDO DE ESFERAS 6312 ZZ C3 - 60X130X31 MM - 1 CARREIRA",
      "rolamento 6312zz-c3 koyo",
      "ROLAM. 6312 2Z C3 SKF",
      "ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , REFERÊNCIA FABRICANTE: 6312ZZ C3 , DIÂMETRO INTERNO: 60 MM",
    ];
    expect(new Set(grafias.map(chaveDe)).size).toBe(1);
  });

  it("separa o que difere em série, vedação ou folga", () => {
    const pecas = [
      "ROL 6312 ZZ C3",
      "ROL 6312 ZZ",
      "ROL 6312 2RS C3",
      "ROL 6312 Z C3",
      "ROL 6312 RS C3",
      "ROL 6312 C3 ABERTO",
      "ROL 6311 ZZ C3",
      "ROL 6212 ZZ C3",
      "ROL 6012 ZZ C3",
      "ROL 62206 ZZ C3",
      "ROL 6206 ZZ C3",
      "ROL 6312 ZZ C4",
    ];
    expect(new Set(pecas.map(chaveDe)).size).toBe(pecas.length);
  });
});
