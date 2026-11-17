# Família sugerida

Para cada código do cadastro que o motor não resolve, o Jev escolhe a classe do CATMAT que mais se parece com a descrição, ou "nenhuma". O resultado é uma `FamiliaSugerida` (`src/contrato/familia-sugerida.ts`) que só rotula. Nada aqui cria grupo nem muda uma leitura: `agrupar` continua sendo a única porta para `Unificacao`, e este módulo nunca a recebe.

`familiaSugeridaDe(codigo)` diz a família sugerida de um código da demo, ou `null` quando não há sugestão. `nomeDaClasse(classe)` dá o nome e o grupo dela, para o selo. As duas leem `dados/demo/familias-jev.json`, que o Jev preenche uma vez antes de publicar. Não há rota pública, e nenhuma visita à demo chama a TypeSafe.

## Princípios

- **O Jev escolhe entre opções fechadas.** A pergunta é um Choice entre as classes do CATMAT mais "nenhuma", com um Noul companheiro que pergunta se alguma classe serve (https://docs.typesafe.ai/patterns/companion-noul.md). O Jev nunca escreve texto.
- **A classe só sai quando as duas respostas concordam.** O Noul chega a 0,70, o Choice não escolheu "nenhuma" e a classe escolhida chega a 0,50 (`decidir.ts`). Em qualquer outro caso a sugestão é "nenhuma". Nessa resposta, `probabilidade` é a que o Noul dá a "nenhuma classe serve" (um menos o Noul), e fica baixa quando o Jev só não teve certeza.
- **O Choice tem 255 opções no máximo.** A árvore do CATMAT tem 711 classes, então o Jev recebe as classes ativas dos grupos de manutenção industrial (`GRUPOS_OFERECIDOS`). Um item de outro grupo deve terminar em "nenhuma".
- **O arquivo guarda a resposta crua** (`jev`: escolha, probabilidade e Noul) ao lado da sugestão, e um teste confere que a regra de hoje a reproduz. Mudar a regra pede rodar o comando de novo.
- **Nenhuma resposta do Jev treina um modelo** (cláusula 2.3 (b) de https://typesafe.ai/legal/mca). Os testes usam respostas gravadas em `gravacoes/` e nunca a rede.

## Comandos

A chave fica em `TYPESAFE_API_KEY`, no ambiente de quem publica. Cada resposta vai para `node_modules/.cache/familia-jev/` (ou `--cache=<pasta>`), e repetir um comando não repete a chamada.

```sh
bun run familia-jev demo        # sugere a família dos códigos sem grupo e grava dados/demo/familias-jev.json
bun run familia-jev amostrar    # sorteia a amostra pública do CATMAT e grava docs/medicao/familia-amostra.json
bun run familia-jev medir       # pergunta ao Jev cada item da amostra, grava familia-respostas.json e o relatório
bun run familia-jev relatorio   # refaz docs/medicao/familia.md sem chamar o Jev
```

A medição está em `docs/medicao/familia.md`. Ela compara a classe sugerida com a que o próprio CATMAT dá a itens públicos, e os limiares estão em `medicao/protocolo.ts`.
