import "./placa.css";
import { montarCasca } from "./casca";
import { montarInicio } from "./inicio";
import { usinaDaDemo } from "./usina";
import { iniciarVisita, passosDaVisita } from "./visita";

const raiz = document.getElementById("app");
if (!raiz) throw new Error("a página não tem #app");
montarCasca(raiz, { tipo: "visao" }, ["Usina Modelo", "Visão geral"]);
montarInicio(raiz, (endereco) => location.assign(endereco));

const visitar = () => iniciarVisita(passosDaVisita(usinaDaDemo()));
document.querySelector("[data-visita]")?.addEventListener("click", visitar);
if (new URLSearchParams(location.search).has("visita")) visitar();
