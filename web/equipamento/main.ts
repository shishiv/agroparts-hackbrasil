import "./estilo.css";
import { entradasRegistradas } from "../entrada";
import { maquinasDaDemo, montarCasca } from "../inicio/casca";
import { patrimonioDoCaminho } from "./carregar";
import { montarEquipamento } from "./pagina";

const raiz = document.getElementById("app");
if (!raiz) throw new Error("a página não tem #app");
const patrimonio = patrimonioDoCaminho(location.pathname);
const conhecida = maquinasDaDemo().find((m) => m.patrimonio === patrimonio);
montarCasca(raiz, { tipo: "maquina", patrimonio }, ["Usina Modelo", "Máquinas", conhecida ? conhecida.nome : patrimonio || "Máquina"]);
void montarEquipamento(raiz, patrimonio, {
  buscar: (endereco) => fetch(endereco),
  ir: (endereco) => location.assign(endereco),
  escutar: window,
  entradas: entradasRegistradas,
});
