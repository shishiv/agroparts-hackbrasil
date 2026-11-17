# Gabarito do motor

A decisão esperada (resolve, revisa ou recusa) e os grupos para os 520 textos públicos do CATMAT em `dados/catmat/`: os 397 itens de rolamento de esfera (padrão descritivo 11797) e as 123 outras peças (retentor, polia, correia, selo mecânico, acoplamento).

O gabarito foi feito antes de existir qualquer código em `src/motor/`. Ele não é ajustado para o motor passar. Um rótulo que se mostrar errado é corrigido num commit separado, que explica o porquê.

| Arquivo | O que tem |
|---|---|
| `regras-de-rotulagem.md` | O que cada rótulo quer dizer. |
| `rotulos.json` | Um rótulo por item (decisão, motivo, série, vedação e folga, e o trecho do texto que prova cada atributo) e os grupos. |
| `amostra-30.md` | 30 rótulos sorteados, para uma pessoa conferir. |
| `rotuladores/` | O que cada um dos dois rotuladores escreveu, sem ver o do outro. |
| `montar.ts` | Junta os dois rotuladores e confere que concordam. Escreve `rotulos.json` e `amostra-30.md`. |

## Como foi feito

Dois rotuladores, um Claude Opus 5.5 e um GPT-5.6 Sol, leram os 520 textos aplicando `regras-de-rotulagem.md`, cada um sem ver o outro. Os dois deram a mesma decisão, o mesmo motivo e os mesmos atributos nos 520 itens. Nenhum rótulo foi arbitrado. Os itens em que um deles marcou dúvida trazem o campo `duvida`.

Nenhuma pessoa revisou os rótulos ainda. A amostra de 30 está pronta para isso.

## Como o placar usa o gabarito

Um par de códigos é falso quando o motor o põe no mesmo grupo e o gabarito os põe em grupos diferentes, ou quando o gabarito não põe um deles em grupo nenhum. O placar também conta o acordo de decisão por item e a taxa de resolve por série.

## Refazer

```
bun run dados/gabarito/montar.ts
```
