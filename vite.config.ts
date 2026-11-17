import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";

const daRaiz = (caminho: string) => fileURLToPath(new URL(caminho, import.meta.url));

const ROTAS: readonly (readonly [RegExp, string])[] = [
  [/^\/e\/[^?#]+/, "/equipamento/index.html"],
  [/^\/diagnostico(?=[?#]|$)/, "/diagnostico/index.html"],
];

/**
 * Em produção, o Cloudflare Pages resolve `/diagnostico` pela pasta e
 * `public/_redirects` manda tudo que está sob `/e/` para `/equipamento/`.
 * Este plugin dá o mesmo resultado no `dev` e no `preview`.
 */
function rotasDoSite(): Plugin {
  const trocar = (requisicao: IncomingMessage, _resposta: ServerResponse, seguir: () => void) => {
    for (const [padrao, destino] of ROTAS) {
      if (requisicao.url && padrao.test(requisicao.url)) {
        requisicao.url = requisicao.url.replace(padrao, destino);
        break;
      }
    }
    seguir();
  };
  return {
    name: "rotas-do-site",
    configureServer: (servidor) => void servidor.middlewares.use(trocar),
    configurePreviewServer: (servidor) => void servidor.middlewares.use(trocar),
  };
}

export default defineConfig({
  root: daRaiz("./web"),
  publicDir: daRaiz("./public"),
  appType: "mpa",
  plugins: [rotasDoSite()],
  build: {
    outDir: daRaiz("./dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        inicio: daRaiz("./web/index.html"),
        equipamento: daRaiz("./web/equipamento/index.html"),
        diagnostico: daRaiz("./web/diagnostico/index.html"),
        naoEncontrada: daRaiz("./web/404.html"),
      },
    },
  },
});
