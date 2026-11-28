# AgroParts

Quando a mesma peça de manutenção tem vários códigos no cadastro da usina, o estoque fica escondido e o histórico de troca da máquina se parte. A AgroParts soma os códigos que são a mesma peça e mostra o resultado na página da máquina, aberta pela placa de patrimônio (na demo, o toque na placa é simulado). Projeto da Hack Brasil 2026.

Demo: [agroparts-hackbrasil.pages.dev](https://agroparts-hackbrasil.pages.dev). Os dados da demo são de uma usina fictícia.

## O problema

O rolamento 6309 ZZ C3 da bomba de caldo B-104 (patrimônio 004512) tem três códigos em `dados/demo/materiais.csv`:

| Código | Texto no cadastro |
|---|---|
| 10059 | `ROL. 6309-2Z C3 45X100X25` |
| 10066 | `ROL 6309 ZZ-C3` |
| 10165 | texto longo do CATMAT, que termina em `REFERÊNCIA FABRICANTE 2: 6309 ZZ C3` |

Isso tem dois efeitos:

- **Estoque escondido.** A bomba troca esse rolamento com os códigos 10066 e 10165, e `dados/demo/estoque.csv` não tem linha para nenhum dos dois. As 3 unidades estão sob o 10059, no endereço B-05-1, um código que nenhuma troca de `dados/demo/consumo.csv` usa.
- **Histórico partido.** `dados/demo/consumo.csv` tem 12 trocas dessa peça na bomba, 7 sob o 10165 e 5 sob o 10066. Nenhum dos dois códigos mostra sozinho as 12 trocas e as 22 unidades.

O erro contrário também acontece: o SKU da usina pode juntar peças diferentes. O gerador da demo planta 5 SKUs que misturam peças, entre 22 SKUs (`resumo` em `dados/demo/esperado-skus.json`). O ROL-6210 de `dados/demo/materiais.csv` junta rolamentos 6210 com vedação e folga diferentes.

## Para quem

- **Manutenção.** O mecânico abre a página da máquina e vê as trocas de cada peça somadas, sem depender do código que o último colega usou.
- **Almoxarifado.** O almoxarife vê se a usina tem a peça sob outro código do mesmo grupo, e o endereço dela.

Hoje o motor soma só o rolamento rígido de esferas. As outras peças aparecem na página da máquina sem soma.

## A solução

A AgroParts lê a exportação da usina (equipamentos, materiais, consumo e estoque) e não substitui o CMMS. Os termos estão em `CONTEXT.md`.

- **Página da máquina.** A placa de patrimônio abre `/e/<patrimônio>`. A página soma as trocas por peça, mostra o saldo dos códigos que a máquina usa e o saldo sob outro código.
- **Motor.** Lê o texto de cada código e conclui `resolve`, `revisa` ou `recusa`. Só uma regra junta dois códigos: os dois têm a mesma chave de identidade. A semelhança de texto nunca junta. Na dúvida, o texto vai para uma pessoa. O motor não faz rede e roda igual no Bun e no navegador (`src/motor/README.md`).
- **Diagnóstico.** `/diagnostico/` compara os SKUs da usina com os grupos do motor e marca mistura, fragmentação, coerência ou inconclusivo.
- **Foto e voz.** A página da máquina lê o texto de uma foto da peça ou de uma fala. A pessoa confere o texto antes de ele entrar no motor.

Regra de "mesma peça" do rolamento rígido de esferas, a única família com regra no motor (`src/motor/familias/index.ts`):

- Mesma série, mesma vedação (`ZZ` = `2Z`, `2RS` = `2RS1`) e mesma folga. Sem código de folga, a folga é a normal. `C3` é outra folga.
- Revisa: texto sem marca de vedação, sem designação ou com duas designações.
- Recusa: texto contraditório, outra família (rolamento que não é rígido, ou peça que não é rolamento) ou descrição vazia.

As outras peças ficam na página da máquina em "Códigos que não entram nas somas". O que a chave não olha, como diâmetro externo, largura e fabricante, está em `src/motor/README.md`.

## Demo e rotas

| Rota | Link | O que mostra |
|---|---|---|
| `/` | https://agroparts-hackbrasil.pages.dev/ | Campo de número e três placas de patrimônio desenhadas. Tocar numa placa abre a página da máquina. |
| `/e/004512` | https://agroparts-hackbrasil.pages.dev/e/004512 | A bomba de caldo B-104. O rolamento 6309 ZZ C3 aparece com 12 trocas e 22 UN. Os códigos 10066 e 10165 não têm saldo, e o 10059 tem saldo 3 UN no endereço B-05-1. |
| `/diagnostico/` | https://agroparts-hackbrasil.pages.dev/diagnostico/ | 69 códigos e 22 SKUs. Dos SKUs, 5 são misturas, 8 coerentes e 9 inconclusivos. Há 2 fragmentações, grupos que estão em mais de um SKU. |

Os números das duas últimas linhas vêm de `dados/demo/consumo.csv`, `dados/demo/estoque.csv`, `dados/demo/materiais.csv` e `dados/demo/esperado-skus.json`. `web/diagnostico/tela.navegador.test.ts` confere que a tela mostra os números de `esperado-skus.json`.

Arquivos de cada rota:

| Rota | Arquivos |
|---|---|
| `/` | `web/index.html`, `web/inicio/main.ts`. |
| `/e/<patrimônio>` | `web/equipamento/index.html`, `web/equipamento/main.ts`. A página baixa só `/maquinas/<patrimônio>.json`. `/grupos.json` é o índice de grupos com saldo. `public/_redirects` reescreve tudo que está sob `/e/` para `/equipamento/`, e `vite.config.ts` faz o mesmo no `dev` e no `preview`. Por isso o JSON de cada máquina não pode ficar sob `/e/`. |
| `/diagnostico` | `web/diagnostico/index.html`, `web/diagnostico/main.ts`. |

### Tag NFC: na demo, simulada

A demo não tem tag NFC física, e a compra das tags para metal ficou para depois. Na página inicial, três placas de patrimônio desenhadas em SVG (004512, 004504 e 004540) simulam o toque. Tocar numa delas mostra a leitura e abre `/e/<patrimônio>`, o mesmo endereço que a tag gravaria. A tela diz "Demonstração: simula o toque na tag NFC". O site não lê tag nenhuma e não usa Web NFC. O número digitado abre o mesmo endereço. O código está em `web/inicio/toque.ts` e `web/inicio/placa.ts`.

## Como executar

Precisa do [Bun](https://bun.sh).

```sh
bun install
bun run dev              # servidor do Vite com as três rotas; o endereço sai no terminal
```

Os comandos do projeto:

```sh
bun test                 # testes do Bun
bun run typecheck
bun run build            # site estático em dist/
bun run preview          # rotas /, /e/<patrimônio>, /diagnostico (depois do build)
bun run preview:pages    # idem com as Pages Functions, local e sem conta no Cloudflare
bun run deploy           # build e publicação em https://agroparts-hackbrasil.pages.dev (ver "Publicar")
bun run gerar-demo       # refaz dados/demo/
bun run baixar-catmat    # baixa de novo dados/catmat/
bun run placar           # mede o motor contra dados/gabarito/ e grava docs/medicao/placar.md
bun run conferencia-amostra   # grava docs/medicao/conferencia-amostra.md a partir do JSON ao lado
bun run familia-jev      # comandos do Jev; precisa de TYPESAFE_API_KEY, ver src/familia/README.md
bunx playwright install chromium && bun run test:navegador   # ou CHROMIUM_PATH=<chrome>
```

`bun run gerar-paginas [pasta]` grava os JSON das máquinas e `/grupos.json` (padrão `dist/`). O `bun run build` e o `bun run dev` já fazem isso pelo plugin de `scripts/gerar-paginas.ts`.

`bun run dev` não serve `functions/api/`. Foto e voz só funcionam em `bun run build` seguido de `bun run preview:pages`, com as chaves da seção "Publicar" em `.dev.vars`. Sem as chaves, a busca por número e o diagnóstico funcionam e a foto mostra "leitura de foto indisponível".

### Publicar

O projeto Pages `agroparts-hackbrasil` tem produção no branch `main`. Com `CLOUDFLARE_EMAIL` e `CLOUDFLARE_API_KEY` (ou `CLOUDFLARE_API_TOKEN`) da conta no ambiente, `bun run deploy` faz o build e publica `dist/` com as funções de `functions/api/`.

As funções leem estas variáveis, gravadas como segredo do projeto e nunca no repositório:

| Variável | Função |
|---|---|
| `GROQ_API_KEY` | `/api/audio`, que transcreve a fala com `whisper-large-v3-turbo` no Groq. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `/api/foto`, que lê a foto com `us.openai.gpt-6-luna` no Bedrock. Sem elas a página mostra "leitura de foto indisponível". |

Para gravar uma: `printf %s "$VALOR" | bunx wrangler pages secret put NOME --project-name agroparts-hackbrasil`. O segredo vale a partir da próxima publicação. O `.dev.vars` que o git ignora recebe as mesmas variáveis para o teste local.

## O que foi medido

| O quê | Resultado | O que o número vale | Arquivo |
|---|---|---|---|
| Motor contra 520 textos públicos do CATMAT | 513 de 520 com a mesma decisão do gabarito (98,7%) e 0 pares falsos juntados | Os mesmos textos serviram para ajustar o motor. Numa usina real, a taxa de resolve deve ser menor. | `docs/medicao/placar.md` |
| Voz, 20 falas | Peça certa em 5 de 10 falas limpas e 3 de 10 com ruído. Nenhuma peça errada. | As falas são de voz de máquina. As que o motor não entendeu vão para a pessoa corrigir. | `docs/medicao/audio.md` |
| Foto, 12 fotos públicas | O texto lido traz a designação inteira em 2 das 7 fotos que têm designação, na primeira passada. O motor acerta a chave em 0 de 1 foto que tem chave esperada, e não erra nenhuma. | Amostra pequena. Os rolamentos são antigos, abertos ou de outra série. | `docs/medicao/foto.md` |

O gabarito dos 520 textos (`dados/gabarito/README.md`) foi rotulado por dois agentes de IA e nenhuma pessoa o revisou. Um agente de IA conferiu 30 rótulos contra catálogos públicos de fabricantes: 29 conferem e 1 ficou sem tabela para conferir (`docs/medicao/conferencia-amostra.md`).

## O Jev ficou fora da demo

O Jev é um modelo da TypeSafe que escolhe uma resposta entre opções fechadas. Neste projeto ele sugere a classe do CATMAT para um código que o motor não resolve. Ele só rotula e nunca cria grupo (`src/familia/README.md`).

A sugestão não aparece em nenhuma página da demo, e nenhuma visita à demo chama a TypeSafe. O motivo está em `docs/medicao/familia.md`. O protocolo `medicao-familia-1` foi escrito antes da primeira chamada ao Jev sobre a amostra. Ele diz que o selo de família sugerida, o rótulo que a página da máquina e o diagnóstico mostrariam, só entra se a precisão das sugestões e os controles em "nenhuma" chegarem ao mínimo de cada um. Com 230 itens públicos do CATMAT, o resultado foi este:

| Medida | Resultado | Mínimo | Veredito |
|---|---|---:|---|
| Precisão das sugestões | 147 de 167 (88,0%) | 85% | passou |
| Controles em "nenhuma" | 21 de 30 (70,0%) | 80% | não passou |
| Concordância ao inverter a ordem das opções | 16 de 20 (80,0%) | 85% | não passou |

Os controles são 30 itens de classes que o Jev não recebe, e a resposta certa é "nenhuma". Em 9 deles ele sugeriu uma classe. O selo exige as duas primeiras medidas acima do mínimo, e os controles ficaram em 70,0% contra 80%. A terceira medida só limita o resultado a esta ordem de opções. O código, a medição e as respostas gravadas continuam em `src/familia/` e `docs/medicao/familia-respostas.json`.

## Origem

A ideia veio de um projeto anterior do time. Todo o código deste repositório foi escrito a partir de 16/11/2026.

## Dados: o que é público e o que é inventado

| O quê | Onde | Origem |
|---|---|---|
| Descrições de rolamento de esferas (PDM 11797), outras peças de manutenção, árvore de grupos e classes | `dados/catmat/` | Público. Catálogo CATMAT, baixado da API de Dados Abertos do Compras.gov.br por `bun run baixar-catmat`. A data da consulta está em cada arquivo. |
| Usina Modelo (fictícia): equipamentos, números de patrimônio, ordens, trocas, estoque, SKUs, códigos de material | `dados/demo/*.csv` | Inventado, gerado por `bun run gerar-demo` com semente fixa. Nenhum dado de usina, de pessoa ou de empresa real. |
| Texto de cada código de material | `dados/demo/materiais.csv` | Misto. Parte é a descrição do CATMAT, copiada como está. O resto é a mesma peça escrita de outro jeito, inventado sobre os campos do CATMAT. |
| Gabarito do motor: decisão esperada para os textos do CATMAT | `dados/gabarito/` | Rotulado por dois agentes sobre os textos públicos. Uma amostra de 30 rótulos foi conferida contra catálogos públicos de fabricantes, não revisada por pessoa. Ver `dados/gabarito/README.md`. |
| Gabarito da demo | `dados/demo/esperado-particao.json`, `dados/demo/esperado-skus.json`, `dados/demo/unificacao-de-exemplo.json` | Inventado junto com o cenário, a partir dos campos estruturados do CATMAT (série, vedação, folga). Nada disso vem da saída do motor. `esperado-skus.json` traz as misturas e fragmentações plantadas, e `unificacao-de-exemplo.json` traz chaves, rótulos e trechos provisórios. |
| Sugestões do Jev para códigos da demo | `dados/demo/familias-jev.json` | Resposta do Jev gravada em 17/11/2026. Nenhuma página lê este arquivo. |
| Fotos de exemplo | `public/exemplos/` | Públicas, da Wikimedia Commons, com autor e licença em `public/exemplos/CREDITOS.txt`. |
| Fontes Archivo e IBM Plex Mono | `public/fontes/` | SIL Open Font License 1.1, com os créditos em `public/fontes/CREDITOS.txt`. |
| Falas de exemplo | `dados/audio/sinteticas/` | Voz de máquina, gerada com o Piper a partir de conjuntos de voz com licença CC0. Ver `docs/medicao/audio.md`. |

Fornecedor, órgão comprador e preço das compras públicas não entram. O teste de `scripts/gerar-demo.test.ts` falha se algum texto da demo tiver formato de CPF, CNPJ, e-mail, telefone ou 11 dígitos seguidos.

## Pastas

- `src/contrato/`: tipos e marcas, sem lógica.
- `src/unificacao/agrupar.ts`: a única função que monta `Unificacao`.
- `src/motor/`: `ler` e `unificar`. Ver `src/motor/README.md`.
- `src/agrupamento/`: o diagnóstico dos SKUs contra os grupos do motor.
- `src/exportacao/`: lê os quatro CSV e os JSON da demo na fronteira. Só ela cria valores marcados.
- `src/historico/`: monta o histórico unificado de cada equipamento e o JSON que a página baixa.
- `src/entrada/`: leva o texto de foto e de fala ao motor.
- `src/familia/`: a família sugerida pelo Jev, fora da demo.
- `web/`: páginas. `web/entrada/index.ts` registra foto e áudio.
- `functions/api/`: funções do Cloudflare Pages, só para foto e áudio.
- `scripts/`: gerador da demo, download do CATMAT, medições e geração das páginas.

## Como contribuir

Antes de criar ou mudar a interface, leia DESIGN.md.

## Licença

AGPL-3.0 (GNU Affero General Public License, versão 3). O texto está em `LICENSE`.
