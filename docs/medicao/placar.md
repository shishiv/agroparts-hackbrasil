# Placar do motor

Versão das regras: `motor-1`. Gabarito: `gabarito-1`, 520 textos públicos do CATMAT.

## O que estes números valem

- Os mesmos textos do CATMAT serviram para montar as listas de palavras do motor (`PALAVRAS_DE_APLICACAO` e `FRASE_CONHECIDA`, em `src/motor/familias/rolamento-rigido-de-esferas/`). Os números abaixo são medidos sobre o conjunto usado para ajustar o motor, não sobre textos nunca vistos.
- No cadastro de uma usina real, a taxa de resolve deve ser menor que a deste placar.
- O item 622950 (rolamento inox) foi corrigido de resolve para revisa depois da primeira versão do motor. A correção deixou o rótulo mais difícil para o motor, não mais fácil.

Impressão das leituras: `13defe7d90f0cc`. É a mesma no Bun e no navegador do teste: o resumo inclui chave, atributos e trechos de cada leitura.

## Pares falsos juntados: 0

Um par é falso quando o motor põe dois códigos no mesmo grupo e o gabarito não os põe no mesmo grupo.

Pares verdadeiros juntados: 33 de 38.

## Decisão do motor contra o gabarito

| gabarito \ motor | resolve | revisa | recusa |
|---|---:|---:|---:|
| resolve | 179 | 7 | 0 |
| revisa | 0 | 75 | 0 |
| recusa | 0 | 0 | 259 |

Mesma decisão, mesmo motivo e mesma peça: 513 de 520 (98,7%).

Resolvidos errado (o motor resolve e o gabarito não resolve, ou resolve outra peça): 0.

Mandados para revisão a mais (o gabarito resolve e o motor manda para uma pessoa): 7.

- item 290385: o gabarito diz `resolve 6211 Z C3`, o motor diz `revisa/sufixo-desconhecido`
- item 314234: o gabarito diz `resolve 6306 ZZ CN`, o motor diz `revisa/sufixo-desconhecido`
- item 474207: o gabarito diz `resolve 6811 2RS CN`, o motor diz `revisa/sufixo-desconhecido`
- item 601352: o gabarito diz `resolve 6001 ZZ C3`, o motor diz `revisa/sufixo-desconhecido`
- item 601353: o gabarito diz `resolve 6018 2RS CN`, o motor diz `revisa/sufixo-desconhecido`
- item 605430: o gabarito diz `resolve 6305 ZZ CN`, o motor diz `revisa/sufixo-desconhecido`
- item 605431: o gabarito diz `resolve 6302 ZZ CN`, o motor diz `revisa/sufixo-desconhecido`

## Por motivo

| motivo | gabarito | motor |
|---|---:|---:|
| recusa/contradicao | 14 | 14 |
| recusa/fora-das-familias | 245 | 245 |
| resolve | 186 | 179 |
| revisa/designacao-ausente | 2 | 2 |
| revisa/duas-leituras | 1 | 1 |
| revisa/sufixo-desconhecido | 72 | 79 |

## Taxa de resolve por série

Conta os textos em que o motor achou uma designação da série. Os que o motor diz que são de outro tipo de rolamento ou de outra peça não entram.

| série | textos | resolve | revisa | recusa | taxa de resolve |
|---|---:|---:|---:|---:|---:|
| 60xx | 48 | 29 | 16 | 3 | 60,4% |
| 62xx | 90 | 63 | 21 | 6 | 70,0% |
| 63xx | 78 | 43 | 32 | 3 | 55,1% |
| 64xx | 5 | 3 | 1 | 1 | 60,0% |
| 68xx | 9 | 8 | 1 | 0 | 88,9% |
| 69xx | 6 | 6 | 0 | 0 | 100,0% |
| 6xx (miniatura) | 24 | 15 | 8 | 1 | 62,5% |
| 160xx | 3 | 3 | 0 | 0 | 100,0% |
| 618xx | 3 | 3 | 0 | 0 | 100,0% |
| 619xx | 2 | 1 | 1 | 0 | 50,0% |
| 622xx | 3 | 3 | 0 | 0 | 100,0% |
| 623xx | 1 | 1 | 0 | 0 | 100,0% |
| 630xx | 1 | 1 | 0 | 0 | 100,0% |
