# Gabarito do motor

A decisão esperada (resolve, revisa ou recusa) e os grupos para os 520 textos públicos do CATMAT em `dados/catmat/`: os 397 itens de rolamento de esfera (padrão descritivo 11797) e as 123 outras peças (retentor, polia, correia, selo mecânico, acoplamento).

O gabarito foi feito antes de existir qualquer código em `src/motor/`. Ele não é ajustado para o motor passar. Um rótulo que se mostrar errado é corrigido num commit separado, que explica o porquê.

| Arquivo | O que tem |
|---|---|
| `regras-de-rotulagem.md` | O que cada rótulo quer dizer. |
| `rotulos.json` | Um rótulo por item (decisão, motivo, série, vedação e folga, e o trecho do texto que prova cada atributo) e os grupos. |
| `amostra-30.md` | 30 rótulos sorteados, conferidos contra catálogos públicos de fabricantes. |
| `rotuladores/` | O que cada um dos dois rotuladores escreveu, sem ver o do outro. |
| `correcoes.json` | Os rótulos corrigidos depois, cada um com o porquê. |
| `montar.ts` | Junta os dois rotuladores, confere que concordam e aplica `correcoes.json`. Escreve `rotulos.json` e `amostra-30.md`. |

## Como foi feito

Dois rotuladores, um Claude Opus 5.5 e um GPT-5.6 Sol, leram os 520 textos aplicando `regras-de-rotulagem.md`, cada um sem ver o outro. Os dois deram a mesma decisão, o mesmo motivo e os mesmos atributos nos 520 itens. Os itens em que um deles marcou dúvida trazem o campo `duvida`.

Um rótulo foi corrigido depois do primeiro commit do gabarito, num commit só dele: `correcoes.json` guarda o item e o porquê, e `montar.ts` aplica a correção por cima do que os rotuladores escreveram.

## Conferência contra catálogo público

Conferido contra catálogo público, não revisado por pessoa. Nenhuma pessoa revisou os 520 rótulos. Os 30 de `amostra-30.md` foram conferidos por um agente de IA contra tabelas públicas de fabricantes: o catálogo de rolamentos da SKF e o da NTN para os rolamentos (diâmetro interno, externo e largura, vedação e folga), e catálogos de correia e de selo mecânico para as peças que não são rolamento. O resultado de cada item, com a página de cada fonte, está em `docs/medicao/conferencia-amostra.md`.

Isso confere os 30 da amostra. Os outros 490 rótulos só têm a concordância dos dois rotuladores. Um rótulo que a conferência mostre errado é corrigido em `correcoes.json`, com o motivo e a fonte, e o placar é rodado de novo.

## Como o placar usa o gabarito

Um par de códigos é falso quando o motor o põe no mesmo grupo e o gabarito os põe em grupos diferentes, ou quando o gabarito não põe um deles em grupo nenhum. O placar também conta o acordo de decisão por item e a taxa de resolve por série.

## Refazer

```
bun run dados/gabarito/montar.ts
```
