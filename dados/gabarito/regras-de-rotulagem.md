# Regras de rotulagem do gabarito

Estas regras definem o que cada rótulo do gabarito quer dizer. Elas foram escritas, e os rótulos feitos, antes de existir qualquer linha de `src/motor/`. Os rótulos são lidos pelo texto do item e por nada mais: nem pelo código do item no CATMAT, nem pelos campos de nome, grupo e classe do arquivo, nem pelo resto do catálogo.

## O que é rotulado

Cada item de `dados/catmat/rolamento-de-esfera-pdm-11797.json` e de `dados/catmat/outras-pecas.json`, pelo campo `descricaoItem`. Itens inativos entram: o texto continua sendo um texto.

## A família

A família é rolamento rígido de esferas de uma carreira, com designação métrica da série 6 (ISO 15). A designação base tem uma destas formas:

| Forma | Exemplos |
|---|---|
| 4 dígitos: 60dd, 62dd, 63dd, 64dd, 68dd, 69dd | 6001, 6204, 6310, 6409, 6809, 6908 |
| 5 dígitos: 160dd, 161dd, 618dd, 619dd, 622dd, 623dd, 630dd | 16009, 61801, 61903, 62206, 62305, 63006 |
| 3 dígitos (miniatura): 604 a 609, 623 a 629, 633 a 639 | 608, 626, 629, 635 |

Ponto de milhar dentro da designação não muda a designação: `16.003` é `16003`.

Qualquer outra referência não é da família, mesmo que o item seja um rolamento de esferas: autocompensador (1206, 2203, 22213K), contato angular (3309, 7205-B), duas carreiras (4210A), agulhas (NK 10/12 TN, RNA 4905), cilíndrico (NU 209E), mancal com inserto (UCR 209, GRAE 20 NPPB), polegadas (RMS 18, CRL 22A) e as referências de fabricante que não seguem a série 6 (2351-020-159, 793, 8006).

## O que define a peça

Três atributos. Dois itens são a mesma peça quando os três coincidem.

**Série.** Os dígitos da designação base.

**Vedação.** Um destes valores, lido do código que o texto escreve junto da designação:

| Valor | Códigos que o texto pode escrever |
|---|---|
| `ZZ` (duas blindagens metálicas) | ZZ, 2Z |
| `Z` (uma blindagem metálica) | Z |
| `2RS` (duas vedações de borracha) | 2RS, 2RS1, 2RSH, 2-RS1 |
| `RS` (uma vedação de borracha) | RS, RS1, RSH |
| `ABERTO` | só quando o texto diz com palavras: "ABERTO", "S/ BLINDAGEM", "SEM BLINDAGEM", "SEM VEDAÇÃO", "S/ VEDAÇÃO" |

Os códigos podem vir colados, separados por espaço, hífen ou barra: `6312ZZ`, `6312-2Z/C3`, `6205-2-RS1`, `6211 ZZC3`.

As palavras "BLINDAGEM DUPLA", "VEDAÇÃO DUPLA", "BLINDADO" e "VEDAÇÃO" sozinhas não determinam a vedação: só confirmam ou contradizem o código. Sem código nem palavra de aberto, a vedação é desconhecida.

Qualquer outro sufixo é desconhecido: U, VV, 2ZR, ZR, NR, N, K, M, J, E, DDU, LLU, LLB, 2RZ, 2RSL, TN9, EKTN9 e os que não estão na tabela acima. Nome de fabricante (SKF, FAG, NSK, NTN, KOYO, TIMKEN, NACHI, INA) depois da referência não é sufixo.

**Folga.** `C1`, `C2`, `C3`, `C4`, `C5` ou `CN`. Vem de um código junto da referência (`C3`, `ZZC3`, `2Z/C3`, `-C3`) ou da expressão "FOLGA C3". Folga que o texto não escreve é `CN` (normal): `6312 ZZ` e `6312 ZZ CN` são a mesma peça.

## As três decisões

**resolve.** O texto traz uma designação da família, a vedação está determinada e nada no texto contradiz isso. O rótulo traz série, vedação e folga, e a prova de cada um: o trecho literal do texto.

**revisa.** O texto parece ser da família, mas falta algo ou há mais de uma resposta. Vai a uma pessoa. O motivo é um destes:

- `sufixo-desconhecido`: há designação da família, mas a vedação não está determinada (sem código de vedação, ou com sufixo fora da tabela). Também entra aqui o texto que traz um qualificador que muda a peça e que série, vedação e folga não dizem: material inoxidável, cerâmico ou plástico (INOX, CERÂMICA, PLÁSTICO, NYLON, POLIAMIDA), híbrido, isolado, com flange, de alta temperatura. O rolamento inox 6202 2RS não é o 6202 2RS comum.
- `designacao-ausente`: é um rolamento de esferas e o texto não traz nenhuma referência de fabricante, só palavras ("ROLAMENTO DE ESFERA, NOME: ROLAMENTO DE ESFERA", "ROLAMENTO P/ MANCAL BOMBA DE CALDO").
- `duas-leituras`: o texto traz duas designações diferentes, ou a mesma designação com configurações diferentes, como alternativas ("6308 2RS OU 6309 2RS", "6312 ZZ C3 / 6310 ZZ C3").

**recusa.** O texto não deve virar chave. O motivo é um destes:

- `sem-texto`: a descrição está vazia ou só tem espaços.
- `fora-das-familias`: não é rolamento rígido de esferas da família. Cobre outra peça (retentor, polia, correia, selo mecânico, acoplamento), outro tipo de rolamento, e rolamento cuja referência não é uma designação da família. "ROLAMENTADA" (polia rolamentada) não é rolamento. Referência de veículo ou de fabricante que não segue a série 6 é fora da família, não revisa.
- `contradicao`: a designação é da família, mas o texto afirma coisas que não podem ser verdade juntas:
  - dois códigos de vedação diferentes na mesma referência (`ZZ` e `2RS`);
  - duas folgas diferentes na mesma referência (`C3` e `C4`);
  - código de borracha (`2RS`, `RS`) junto de "METÁLICO" ou "BLINDAGEM METÁLICA";
  - código metálico (`ZZ`, `Z`) junto de "BORRACHA", "NBR" ou "NITRÍLICA";
  - código de uma vedação (`Z`, `RS`) junto de "DUPLA" ou "AMBOS" referindo-se à vedação, ou código de duas (`ZZ`, `2RS`) junto de "SIMPLES" ou "UM DOS LADOS";
  - diâmetro interno escrito diferente do da designação;
  - designação da família junto de palavras de outro tipo de rolamento (autocompensador, contato angular, agulhas, cônico, duas carreiras).

## Diâmetro interno da designação

Para conferir o diâmetro interno escrito no texto ("DIÂMETRO INTERNO: 60 MM" ou o primeiro número de "60X130X31"):

- 4 dígitos, os dois últimos `dd`: `00` dá 10 mm, `01` dá 12, `02` dá 15, `03` dá 17, e de `04` em diante é `dd` vezes 5.
- 5 dígitos: o mesmo, com os dois últimos dígitos.
- 3 dígitos (miniatura): o último dígito, em mm.

## Ordem quando mais de uma coisa vale

1. `sem-texto`.
2. Sem designação da família: `fora-das-familias`, ou `designacao-ausente` se o texto não traz nenhuma referência.
3. `contradicao`.
4. `duas-leituras`.
5. `sufixo-desconhecido`.
6. `resolve`.

## Grupos

Os itens `resolve` com a mesma série, a mesma vedação e a mesma folga formam um grupo. Itens `revisa` e `recusa` não entram em grupo. Um grupo pode ter um item só.

## Como os rótulos foram feitos

Dois rotuladores leram os textos sem ver o trabalho um do outro. Onde discordaram, valeu o que estas regras dizem. O arquivo `rotulos.json` registra, item a item, se os dois concordaram ou se o rótulo foi corrigido depois, e `correcoes.json` diz por quê.
