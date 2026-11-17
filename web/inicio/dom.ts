export type Filho = Node | string | null | false | undefined;

export type Atributos = Readonly<Record<string, string | boolean | undefined>>;

/** Monta um elemento sem `innerHTML`: todo texto entra como texto, nunca como HTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  atributos: Atributos = {},
  ...filhos: readonly Filho[]
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === false) continue;
    elemento.setAttribute(nome, valor === true ? "" : valor);
  }
  for (const filho of filhos) {
    if (filho) elemento.append(filho);
  }
  return elemento;
}
