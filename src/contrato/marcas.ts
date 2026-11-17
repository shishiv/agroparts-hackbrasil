declare const marca: unique symbol;

export type Marca<T, M extends string> = T & { readonly [marca]: M };

export type CodigoLegado = Marca<string, "CodigoLegado">;
export type NumeroPatrimonio = Marca<string, "NumeroPatrimonio">;
export type NumeroOrdem = Marca<string, "NumeroOrdem">;
export type ChaveIdentidade = Marca<string, "ChaveIdentidade">;
export type SkuUsina = Marca<string, "SkuUsina">;
export type DataISO = Marca<string, "DataISO">;

export type NaoVazia<T> = readonly [T, ...T[]];
