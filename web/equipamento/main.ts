import "./estilo.css";
import { entradasRegistradas } from "../entrada";
import { rodape, topo } from "../inicio/casca";
import { patrimonioDoCaminho } from "./carregar";
import { montarEquipamento } from "./pagina";

const raiz = document.getElementById("app");
if (!raiz) throw new Error("a página não tem #app");
raiz.before(topo());
raiz.after(rodape());
void montarEquipamento(raiz, patrimonioDoCaminho(location.pathname), {
  buscar: (endereco) => fetch(endereco),
  ir: (endereco) => location.assign(endereco),
  escutar: window,
  entradas: entradasRegistradas,
});
