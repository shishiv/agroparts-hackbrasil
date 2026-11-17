# AgroParts

O celular encosta na placa de patrimônio de uma máquina e mostra o histórico de manutenção dela já unificado: a mesma peça com códigos diferentes somada numa só, e o que existe no almoxarifado sob outro código. Foto e áudio viram texto e entram no mesmo motor, e o Jev entra por último. Projeto do time ki tal na Hack Brasil 2026. Licença AGPL 3.0 (`LICENSE`). Os termos estão em `CONTEXT.md`.

## O que é público e o que é inventado

| O quê | Onde | Origem |
|---|---|---|
| Descrições de rolamento de esferas (PDM 11797), outras peças de manutenção, árvore de grupos e classes | `dados/catmat/` | Público. Catálogo CATMAT, baixado da API de Dados Abertos do Compras.gov.br por `bun run baixar-catmat`. A data da consulta está em cada arquivo. |
| Usina Modelo (fictícia): equipamentos, números de patrimônio, ordens, trocas, estoque, SKUs, códigos de material | `dados/demo/*.csv` | Inventado, gerado por `bun run gerar-demo` com semente fixa. Nenhum dado de usina, de pessoa ou de empresa real. |
| Texto de cada código de material | `dados/demo/materiais.csv` | Misto. Parte é a descrição do CATMAT, copiada como está. O resto é a mesma peça escrita de outro jeito, inventado sobre os campos do CATMAT. |
| Gabarito da demo | `dados/demo/esperado-*.json` | Inventado junto com o cenário, a partir dos campos estruturados do CATMAT (série, vedação, folga). Nunca sai do motor. |

Fornecedor, órgão comprador e preço das compras públicas não entram. O teste de `scripts/gerar-demo.test.ts` falha se algum texto da demo tiver formato de CPF, CNPJ, e-mail, telefone ou 11 dígitos seguidos.

## O gabarito da demo

- Mesma peça: mesma série, mesma vedação (`ZZ` = `2Z`, `2RS` = `2RS1`) e mesma folga (sem código de folga é normal; `C3`).
- Revisa: texto sem marca de vedação, sem designação, ou com duas designações.
- Recusa: texto contraditório, outra família (rolamento que não é rígido, ou peça que não é rolamento) ou descrição vazia.
- `esperado-particao.json` tem a decisão de cada código e os grupos. `unificacao-de-exemplo.json` traz chaves, rótulos e trechos provisórios. `esperado-skus.json` traz misturas e fragmentações plantadas.

## Rotas

| Rota | Arquivos |
|---|---|
| `/` | `web/index.html`, `web/inicio/main.ts` |
| `/e/<patrimônio>` | `web/equipamento/index.html`, `web/equipamento/main.ts`. `public/_redirects` reescreve tudo que está sob `/e/` para `/equipamento/`, e `vite.config.ts` faz o mesmo no `dev` e no `preview`. Por isso o JSON de cada máquina não pode ficar sob `/e/`. |
| `/diagnostico` | `web/diagnostico/index.html`, `web/diagnostico/main.ts` |

## Comandos

```sh
bun install
bun test                 # testes do Bun
bun run typecheck
bun run build            # site estático em dist/
bun run preview          # rotas /, /e/<patrimônio>, /diagnostico
bun run preview:pages    # idem com as Pages Functions, local e sem conta no Cloudflare
bun run gerar-demo       # refaz dados/demo/
bun run baixar-catmat    # baixa de novo dados/catmat/
bunx playwright install chromium && bun run test:navegador   # ou CHROMIUM_PATH=<chrome>
```

`bun run placar`, `gerar-paginas` e `familia-jev` apontam para arquivos que as próximas fatias preenchem.

## Pastas

- `src/contrato/`: tipos e marcas, sem lógica.
- `src/unificacao/agrupar.ts`: a única função que monta `Unificacao`.
- `src/exportacao/`: lê os quatro CSV e os JSON da demo na fronteira; só ela cria valores marcados.
- `web/`: páginas. `web/entrada/index.ts` registra foto e áudio.
- `functions/api/`: funções do Cloudflare Pages, só para foto e áudio.
- `scripts/`: gerador da demo, download do CATMAT e scripts das fatias seguintes.
