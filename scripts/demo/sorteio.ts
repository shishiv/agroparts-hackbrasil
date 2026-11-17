/** Gerador pseudoaleatório com semente fixa (mulberry32): a mesma semente dá a mesma sequência em qualquer motor de JavaScript. */
export class Sorteio {
  private estado: number;

  constructor(semente: number) {
    this.estado = semente >>> 0;
  }

  /** Número em [0, 1). */
  proximo(): number {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Inteiro em [minimo, maximo], com os dois extremos incluídos. */
  inteiro(minimo: number, maximo: number): number {
    return minimo + Math.floor(this.proximo() * (maximo - minimo + 1));
  }

  chance(probabilidade: number): boolean {
    return this.proximo() < probabilidade;
  }

  escolher<T>(lista: readonly T[]): T {
    const item = lista[this.inteiro(0, lista.length - 1)];
    if (item === undefined) throw new Error("não há o que escolher numa lista vazia");
    return item;
  }

  /** Escolhe um item com chance proporcional ao peso. */
  escolherComPeso<T>(itens: readonly (readonly [T, number])[]): T {
    const total = itens.reduce((soma, [, peso]) => soma + peso, 0);
    let ponto = this.proximo() * total;
    for (const [item, peso] of itens) {
      ponto -= peso;
      if (ponto < 0) return item;
    }
    const ultimo = itens.at(-1);
    if (!ultimo) throw new Error("não há o que escolher numa lista vazia");
    return ultimo[0];
  }

  embaralhar<T>(lista: readonly T[]): T[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = this.inteiro(0, i);
      const a = copia[i] as T;
      copia[i] = copia[j] as T;
      copia[j] = a;
    }
    return copia;
  }
}
