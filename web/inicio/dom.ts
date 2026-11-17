export type Filho = Node | string | null | false | undefined;

export type Atributos = Readonly<Record<string, string | boolean | undefined>>;

function preencher<E extends Element>(elemento: E, atributos: Atributos, filhos: readonly Filho[]): E {
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === false) continue;
    elemento.setAttribute(nome, valor === true ? "" : valor);
  }
  for (const filho of filhos) {
    if (filho) elemento.append(filho);
  }
  return elemento;
}

/** Monta um elemento sem `innerHTML`: todo texto entra como texto, nunca como HTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  atributos: Atributos = {},
  ...filhos: readonly Filho[]
): HTMLElementTagNameMap[K] {
  return preencher(document.createElement(tag), atributos, filhos);
}

/** O mesmo que `h`, para elementos de SVG. */
export function s<K extends keyof SVGElementTagNameMap>(
  tag: K,
  atributos: Atributos = {},
  ...filhos: readonly Filho[]
): SVGElementTagNameMap[K] {
  return preencher(document.createElementNS("http://www.w3.org/2000/svg", tag), atributos, filhos);
}
