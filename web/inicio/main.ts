import "./base.css";
import "./placa.css";
import { rodape } from "./casca";
import { montarInicio } from "./inicio";

const raiz = document.getElementById("app");
if (!raiz) throw new Error("a página não tem #app");
montarInicio(raiz, (endereco) => location.assign(endereco));
raiz.after(rodape());
