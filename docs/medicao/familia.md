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

Ainda não medido.
