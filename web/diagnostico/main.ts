import "./estilo.css";
import materiaisDaDemo from "../../dados/demo/materiais.csv?raw";
import { montarCasca } from "../inicio/casca";
import { montarDiagnostico } from "./tela";

const raiz = document.getElementById("app");
if (!raiz) throw new Error("a página não tem #app");
montarCasca(raiz, { tipo: "cadastro" }, ["Usina Modelo", "Cadastro de peças"]);
montarDiagnostico(raiz, materiaisDaDemo);
