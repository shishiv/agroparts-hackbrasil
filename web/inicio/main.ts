import "./placa.css";
import { rodape } from "./casca";
import { h } from "./dom";
import { montarHistoria } from "./historia";
import { montarInicio } from "./inicio";

const raiz = document.getElementById("app");
if (!raiz) throw new Error("a página não tem #app");
montarInicio(raiz, (endereco) => location.assign(endereco));
// A história entra no fim do palco: no celular fica depois das placas, no computador ocupa a coluna da esquerda.
const historia = h("section", { class: "historia", hidden: true });
raiz.append(historia);
raiz.after(rodape());
void montarHistoria(historia, (endereco) => fetch(endereco));
