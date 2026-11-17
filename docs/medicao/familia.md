# Família sugerida pelo Jev

Acerto da classe do CATMAT que o Jev sugere para um código que o motor não resolve como rolamento, medido contra a classe que o próprio CATMAT dá a itens públicos. Protocolo `medicao-familia-1`.

## Protocolo

Escrito e commitado antes da primeira chamada ao Jev sobre a amostra. O arquivo `src/familia/medicao/protocolo.ts` guarda os mesmos números, e este texto sai dele.

**O que o Jev recebe.** A descrição de um item. Duas perguntas na mesma chamada: um Choice entre 231 classes do CATMAT (as classes ativas dos grupos listados em `GRUPOS_OFERECIDOS`, em `src/familia/classes.ts`) mais "nenhuma", e um Noul companheiro que pergunta se alguma dessas classes serve. O modelo é o `jev-1.14.0`, pinado em `MODELO_DO_JEV`, porque os limiares valem para ele e um alias muda sem aviso.

**Regra.** A sugestão é uma classe só quando o Noul é de 0,70 ou mais, o Choice não escolheu "nenhuma" e a probabilidade da classe escolhida é de 0,50 ou mais (`regra-1`). Nos outros casos a resposta é "nenhuma". A pergunta teve duas versões, e as duas só rodaram nos 24 códigos do cadastro da demo, que não fazem parte da amostra. A segunda manda escolher pela peça que o texto nomeia, e não pelo material nem pelo equipamento, e é a que vale aqui. A regra e a pergunta não mudam depois da amostra.

**Amostra.** 230 itens públicos do CATMAT, consultados em 2026-11-17: 10 por classe, em 20 classes oferecidas e 3 classes que o Jev não recebe. O sorteio pega os itens ativos da classe, sem sinal de dado pessoal e com descrição diferente, e ordena por um hash de `familia-jev-hackbrasil-2026` e do código do item (`sortearItens`, em `src/familia/medicao/amostra.ts`). A amostra está em `docs/medicao/familia-amostra.json`.

**O que é certo.** Para um item de classe oferecida, a classe que o próprio CATMAT lhe dá. Para um item das 3 classes não oferecidas (30 itens), "nenhuma".

**Ordem das opções.** O Jev tende a favorecer as primeiras opções de um Choice (https://docs.typesafe.ai/model-jaggedness.md). 20 itens de classes oferecidas são perguntados de novo com as classes na ordem inversa, e a decisão tem de continuar a mesma.

**O que cada resultado decide.** Uma medida passa quando o valor medido, sem o intervalo, chega ao mínimo.

| medida | o que conta | mínimo |
| --- | --- | ---: |
| precisão das sugestões | das sugestões de classe para itens de classes oferecidas, as que batem com o CATMAT | 85% |
| controles em "nenhuma" | dos itens de classes não oferecidas, os que terminam em "nenhuma" | 80% |
| cobertura | dos itens de classes oferecidas, os que recebem uma sugestão de classe | 60% |
| concordância ao inverter a ordem | dos itens repetidos, os que mantêm a mesma decisão | 85% |
| acerto por classe | dos itens da classe, os em que o Choice escolheu a classe certa | 50% (abaixo, a classe é fraca) |

- O selo de família sugerida entra na página do equipamento e na tela de diagnóstico só se a precisão e os controles passarem. Se algum falhar, o selo fica fora e este arquivo diz por quê.
- Se a cobertura não passar, o selo entra e o texto público diz que ele aparece em poucos códigos.
- Se a concordância não passar, o resultado vale só para esta ordem de opções, e o arquivo diz isso.
- Uma classe fraca fica listada. Nenhuma regra a esconde do selo, porque dez itens por classe não sustentam uma regra por classe.

## O que estes números valem

- Os itens são descrições do catálogo, que começam pelo nome padronizado da peça (por exemplo "RETENTOR, ..."). O texto livre de uma usina ("ROL 6312 C3") traz menos pista, e a precisão ali deve ser menor.
- Dez itens por classe dão um intervalo largo. O intervalo de 95% (Wilson) vem ao lado de cada número.
- É uma execução de um modelo, numa data. A TypeSafe diz que o Jev não é treinado com pedidos de clientes. O catálogo do CATMAT é público, e o modelo pode tê-lo visto no treino, o que não dá para medir daqui.
- A medição não treina nenhum classificador com as respostas do Jev (cláusula 2.3 (b) de https://typesafe.ai/legal/mca).

## Resultado

Modelo `jev-1.14.0`, 250 pedidos distintos ao Jev, 4312957 tokens de entrada (cerca de US$ 0,181 pela tabela de preços). O SDK pode ter repetido um pedido por erro de rede, e isso não entra na conta.

O selo de família sugerida não entra, porque a precisão ou os controles não passaram.

| medida | k de n | acerto (intervalo de 95%) | mínimo | resultado |
|---|---|---|---:|---|
| precisão das sugestões | 147 de 167 | 88,0% (82% a 92%) | 85% | passou |
| controles em "nenhuma" | 21 de 30 | 70,0% (52% a 83%) | 80% | não passou |
| cobertura | 167 de 200 | 83,5% (78% a 88%) | 60% | passou |
| concordância ao inverter a ordem | 16 de 20 | 80,0% (58% a 92%) | 85% | não passou |

Escolha do Choice sem a regra: 159 de 200 itens de classes oferecidas na classe certa (79,5% (73% a 85%)). Nas 30 amostras de classes não oferecidas, 21 terminaram em "nenhuma".

### Por classe

| classe | nome | tipo | itens | escolha certa | sugestões | sugestões certas | em nenhuma | marca |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 3020 | ENGRENAGENS, POLIAS, COROAS DENTADAS E CORRENTES DE TRANSMIS | oferecida | 10 | 10 | 10 | 10 | 0 |  |
| 3030 | CORREAME, CORREIAS DE TRANSMISSÃO, CORREIAS DOS VENTILADORES | oferecida | 10 | 10 | 10 | 10 | 0 |  |
| 3040 | EQUIPAMENTOS DIVERSOS DE TRANSMISSÃO DE FORÇA | oferecida | 10 | 6 | 7 | 4 | 3 |  |
| 3110 | ROLAMENTOS ANTIFRICÇÃO NÃO MONTADOS | oferecida | 10 | 8 | 8 | 8 | 2 |  |
| 3120 | MANCAIS NÃO MONTADOS | oferecida | 10 | 10 | 8 | 8 | 2 |  |
| 3130 | ROLAMENTOS E MANCAIS MONTADOS | oferecida | 10 | 6 | 8 | 6 | 2 |  |
| 4010 | CORRENTES E CABOS DE AÇO | oferecida | 10 | 10 | 10 | 10 | 0 |  |
| 4320 | BOMBAS MANUAIS E MECÂNICAS | oferecida | 10 | 2 | 0 | 0 | 10 | fraca |
| 4710 | CANOS E TUBOS | oferecida | 10 | 10 | 10 | 10 | 0 |  |
| 4720 | MANGUEIRAS E TUBULAÇÕES FLEXÍVEIS | oferecida | 10 | 10 | 10 | 10 | 0 |  |
| 4810 | VÁLVULAS ACIONADAS POR FORÇA MOTRIZ | oferecida | 10 | 7 | 9 | 6 | 1 |  |
| 4820 | VÁLVULAS NÃO ACIONADAS POR FORÇA MOTRIZ | oferecida | 10 | 4 | 7 | 3 | 3 | fraca |
| 5305 | PARAFUSOS SEM PORCA | oferecida | 10 | 10 | 8 | 8 | 2 |  |
| 5306 | PARAFUSOS COM PORCA | oferecida | 10 | 7 | 10 | 7 | 0 |  |
| 5330 | GAXETAS E OUTROS MATERIAIS PARA VEDAÇÃO | oferecida | 10 | 9 | 9 | 8 | 1 |  |
| 5360 | MOLAS DE ARAME, PLANAS E HELICOIDAIS | oferecida | 10 | 10 | 10 | 10 | 0 |  |
| 5365 | ANÉIS, BUCHAS E ESPAÇADORES | oferecida | 10 | 3 | 6 | 2 | 4 | fraca |
| 6105 | MOTORES ELÉTRICOS | oferecida | 10 | 9 | 9 | 9 | 1 |  |
| 6145 | FIOS E CABOS ELÉTRICOS | oferecida | 10 | 9 | 9 | 9 | 1 |  |
| 9150 | ÓLEOS E GRAXAS PARA CORTE, LUBRIFICAÇÃO E SISTEMAS HIDRÁULIC | oferecida | 10 | 9 | 9 | 9 | 1 |  |
| 7110 | MOBILIÁRIO PARA ESCRITÓRIO | fora | 10 |  | 0 |  | 10 |  |
| 7510 | ARTIGOS PARA ESCRITÓRIO | fora | 10 |  | 2 |  | 8 |  |
| 7930 | COMPOSTOS E PREPARADOS PARA LIMPEZA E POLIMENTO | fora | 10 |  | 7 |  | 3 |  |

Classes fracas: 4320, 4820, 5365.

### Onde o Choice errou

| esperada | escolhida | vezes |
| --- | --- | ---: |
| 4320 BOMBAS MANUAIS E MECÂNICAS | 4310 BOMBAS E COMPRESSORES A VÁCUO | 8 |
| 5365 ANÉIS, BUCHAS E ESPAÇADORES | 4730 ACESSÓRIOS E FERRAGENS ESPECIAIS PARA MANGUEIRAS, CANOS | 6 |
| 4810 VÁLVULAS ACIONADAS POR FORÇA MOTRIZ | 4820 VÁLVULAS NÃO ACIONADAS POR FORÇA MOTRIZ | 3 |
| 5306 PARAFUSOS COM PORCA | 5305 PARAFUSOS SEM PORCA | 3 |
| 3040 EQUIPAMENTOS DIVERSOS DE TRANSMISSÃO DE FORÇA | 4510 DISPOSITIVOS E ACESSÓRIOS PARA INSTALAÇÕES HIDRÁULICAS | 2 |
| 3110 ROLAMENTOS ANTIFRICÇÃO NÃO MONTADOS | nenhuma | 2 |
| 3130 ROLAMENTOS E MANCAIS MONTADOS | 3120 MANCAIS NÃO MONTADOS | 2 |
| 4820 VÁLVULAS NÃO ACIONADAS POR FORÇA MOTRIZ | 4730 ACESSÓRIOS E FERRAGENS ESPECIAIS PARA MANGUEIRAS, CANOS | 2 |

Classes sugeridas para os itens que deviam terminar em "nenhuma": 6810 PRODUTOS QUÍMICOS (7); 8040 ADESIVOS (2).

### A probabilidade da escolha

| probabilidade da escolha | itens | escolha certa | acerto |
| --- | --- | ---: | ---: |
| 0,0 a 0,5 | 24 | 10 | 41,7% |
| 0,5 a 0,8 | 78 | 57 | 73,1% |
| 0,8 a 1,0 | 98 | 92 | 93,9% |

### Ordem das opções

Dos 20 itens repetidos com as opções na ordem inversa, 18 mantiveram a classe escolhida e 16 mantiveram a decisão. A classe certa foi escolhida em 13 na ordem normal e em 12 na inversa.
