import "./estilo.css";
import materiaisDaDemo from "../../dados/demo/materiais.csv?raw";
import { topo } from "../inicio/casca";
import { montarDiagnostico } from "./tela";

const raiz = document.getElementById("app");
if (!raiz) throw new Error("a página não tem #app");
raiz.before(topo());
montarDiagnostico(raiz, materiaisDaDemo);
