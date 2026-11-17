# Medição da foto

Modelo: `us.openai.gpt-6-luna` (Bedrock, Converse, us-east-1). Medido em 17/11/2026, 11:23 (Brasília) com `bun run scripts/medir-foto.ts chamar`. Esta parte do arquivo sai de `bun run scripts/medir-foto.ts relatorio` sobre `docs/medicao/foto-resultados.json`; o que vem depois da última linha deste bloco é escrito à mão.

## O que estes números valem

- **12 fotos públicas** da Wikimedia Commons (créditos em `public/exemplos/CREDITOS.txt`), 9 com texto na peça e 3 sem texto legível. **Nenhuma foto do Myke ainda.** Os rolamentos são antigos, abertos ou de outra série. Nenhum é um 6310-2Z C3 de moenda, e é esse o tipo de foto que o produto vai receber.
- O texto certo de cada foto (`public/exemplos/verdade.json`) foi lido por Claude Opus 5.5, ampliando a foto, e conferido com a descrição do autor na Commons. Nenhuma pessoa conferiu. Onde a peça tem marca que a foto não deixa ler, a marca está em `ambiguo` e o modelo não é punido por ela.
- A amostra é pequena: uma foto a mais ou a menos muda a taxa em 8 pontos. Serve para achar o tipo de erro, não para prometer uma taxa.
- Cada foto foi lida 2 vezes, na mesma ordem, com o mesmo pedido. A segunda leitura mostra o quanto o modelo repete a si mesmo, já que ele não aceita `temperature`.

## Resultado

| O que se mede | Passada 1 | Passada 2 |
|---|---:|---:|
| Designação inteira no texto lido | 2 de 7 | 3 de 7 |
| **Chave certa**: o motor resolve o texto lido e a chave é a da designação | **0 de 1** | **0 de 1** |
| Fotos com palavra que não está na peça | 7 de 12 (11 palavras, 32 caracteres) | 7 de 12 (18 palavras, 55 caracteres) |
| Fotos com palavra lida torta | 5 de 12 (5 palavras) | 3 de 12 (4 palavras) |
| Fotos sem texto em que o modelo escreveu alguma palavra | 0 de 3 | 0 de 3 |
| Palavras da peça lidas exatamente | 34 de 49 | 28 de 49 |
| Mesmas palavras que na primeira passada | - | 5 de 12 |
| Chamadas que falharam | 0 | 0 |

O que o motor faz com o texto lido, foto a foto:

| Desfecho | Passada 1 | Passada 2 |
|---|---:|---:|
| chave certa | 0 | 0 |
| chave errada (par falso possível) | 0 | 0 |
| o motor manda para revisão | 0 | 0 |
| o motor recusa | 1 | 1 |
| o motor resolve sem a peça ter chave esperada (par falso possível) | 0 | 0 |
| a peça não tem chave esperada, e o motor não resolve | 11 | 11 |

## Tempo e custo por foto

|  | Passada 1 | Passada 2 |
|---|---:|---:|
| Tempo da chamada ao Bedrock, mediana | 1594 ms | 1664 ms |
| Tempo da chamada, máximo | 2586 ms | 2164 ms |

- O tempo é o da chamada ao Bedrock em us-east-1 vista da máquina que mediu, sem o Cloudflare no meio. O que a pessoa espera soma a ida da foto à função e a volta.
- Custo médio por foto nova (a imagem inteira cobrada como escrita de cache), sobre a primeira passada: **US$ 0,00033**. Mil fotos custam US$ 0,32868. Preços por milhão de tokens: entrada 0.11, escrita de cache 0.1375, leitura de cache 0.011, saída 0.55 (cartão do modelo na AWS, geo US, 17/11/2026).
- A mesma foto outra vez é lida do cache da AWS e custa menos. Por isso a conta usa só a primeira passada, e trata como escrita a única foto que uma chamada anterior já tinha posto no cache.

## Foto a foto, passada 1

| Foto | Texto lido | Palavra torta | Palavra inventada | Designação lida | Desfecho |
|---|---|---|---|---|---|
| zkl-ur-6304.jpg | ZKL / UR / 6204 / C3 SR / CY | 6204 (era 6304) | C3, SR | não | a peça não tem chave esperada, e o motor não resolve |
| fag-6304-rsr-lado-a.jpg | [ilegível] | - | - | sem designação | a peça não tem chave esperada, e o motor não resolve |
| fag-6304-rsr-lado-b.jpg | FAG / 6304 FSR | FSR (era RSR) | FAG | não | a peça não tem chave esperada, e o motor não resolve |
| nsk-608z.jpg | JAPAN / 608 / USTV | 608 (era 608Z) | USTV | não | o motor recusa |
| fag-6207-re17.jpg | GERMANY / R·F·E / 17 / FAG / 6207 / 17 / FAG / 6207 | - | F | sim | a peça não tem chave esperada, e o motor não resolve |
| nachi-6203-c3.jpg | 6203 C3 / NACHI | - | - | sim | a peça não tem chave esperada, e o motor não resolve |
| rkw-6203-c3-m7.jpg | 6203 / RKW / M7 | - | - | não | a peça não tem chave esperada, e o motor não resolve |
| gpz-207-caixa.jpg | GPZ / BEARINGS / GPZ 207 162071 / EXPORTED BY / STANK/IMPORT / MADE IN USSR | - | 162071, STANK, IMPORT | não | a peça não tem chave esperada, e o motor não resolve |
| skf-129-ha.jpg | FABRIQUE EN SUÈDE / SKF / N° 629 / SWEDEN | 629 (era 129) | N | sem designação | a peça não tem chave esperada, e o motor não resolve |
| hoffmann-330-v4.jpg | MTY / ENGLAND / HOFFMANN / 350 / A 4 | 350 (era 330) | A, 4 | sem designação | a peça não tem chave esperada, e o motor não resolve |
| sem-texto-bmw.jpg | [ilegível] | - | - | sem designação | a peça não tem chave esperada, e o motor não resolve |
| sem-texto-solaris.jpg | [ilegível] | - | - | sem designação | a peça não tem chave esperada, e o motor não resolve |

## Foto a foto, passada 2

| Foto | Texto lido | Palavra torta | Palavra inventada | Designação lida | Desfecho |
|---|---|---|---|---|---|
| zkl-ur-6304.jpg | ZKL / UR 6017 / C3 SR / CY | - | 6017, C3, SR | não | a peça não tem chave esperada, e o motor não resolve |
| fag-6304-rsr-lado-a.jpg | [ilegível] | - | - | sem designação | a peça não tem chave esperada, e o motor não resolve |
| fag-6304-rsr-lado-b.jpg | FAG / 6304 2RSR | 2RSR (era RSR) | FAG | não | a peça não tem chave esperada, e o motor não resolve |
| nsk-608z.jpg | JAPAN / 608Z / TSL V3 | - | TSL, V3 | sim | o motor recusa |
| fag-6207-re17.jpg | GERMANY / R·F / 17 / R·F / FAG / 6207 / 17 / [ilegível] | - | F, F | sim | a peça não tem chave esperada, e o motor não resolve |
| nachi-6203-c3.jpg | 6203 C3 / NACHI | - | - | sim | a peça não tem chave esperada, e o motor não resolve |
| rkw-6203-c3-m7.jpg | 6203 / RKW / M7 | - | - | não | a peça não tem chave esperada, e o motor não resolve |
| gpz-207-caixa.jpg | GPZ / BEARINGS / GPZ 207.162071 / EXPORTED BY / STANKIMPORT / MADE IN USSR | STANKIMPORT (era STANKOIMPORT) | 162071 | não | a peça não tem chave esperada, e o motor não resolve |
| skf-129-ha.jpg | FAMOUS / ENGLAND / MADE IN / CHINA / 6203 / 4H | - | FAMOUS, ENGLAND, CHINA, 6203, 4H | sem designação | a peça não tem chave esperada, e o motor não resolve |
| hoffmann-330-v4.jpg | M.TY / ENGLAND / HOFMANN / 3504 A 3 | TY (era MTY), HOFMANN (era HOFFMANN) | M, 3504, A, 3 | sem designação | a peça não tem chave esperada, e o motor não resolve |
| sem-texto-bmw.jpg | [ilegível] | - | - | sem designação | a peça não tem chave esperada, e o motor não resolve |
| sem-texto-solaris.jpg | [ilegível] | - | - | sem designação | a peça não tem chave esperada, e o motor não resolve |

## Como repetir

```sh
aws configure export-credentials --profile firstmate-workers --format env-no-export > .dev.vars   # fora do git
bun run scripts/medir-foto.ts chamar --limite 24 --passadas 2
bun run scripts/medir-foto.ts relatorio
```

Para medir fotos do Myke: ponha os JPEG numa pasta com um `verdade.json` no formato de `public/exemplos/verdade.json` (texto certo em `linhas`, o que a foto não deixa ler em `ambiguo`, a designação que o almoxarifado digitaria em `designacao`) e rode os dois comandos com `--pasta <pasta>`. `chamar` se recusa a passar de `--limite` chamadas.
<!-- fim do gerado -->

## O que a medição mostrou (17/11/2026)

- **O modelo troca dígito.** Em 5 das 12 fotos ele leu uma palavra torta: 6304 saiu 6204 e, na segunda passada, 6017; 330 saiu 350; 129 saiu 629. Um dígito trocado vira outra designação válida, que o motor lê sem reclamar. Quem protege é a pessoa que confere o texto antes de confirmar, e é por isso que o campo editável não é opcional.
- **Ele completa o que a peça não diz.** Na FAG, "RSR" saiu "FSR" e depois "2RSR". No NSK, a segunda passada trouxe "TSL V3" que não existe na peça. Na segunda passada da SKF ele escreveu "FAMOUS ENGLAND MADE IN CHINA 6203 4H", que não tem nada a ver com a foto. Uma palavra a mais manda o motor para revisão: "608Z" sozinho resolve, e "608Z TSL V3" vira "sufixo desconhecido".
- **Ele não repete a si mesmo.** Só 5 das 12 fotos saem com as mesmas palavras nas duas passadas. Como o modelo recusa `temperature` (ver abaixo), não há como fixar a resposta. Ler duas vezes e mostrar a divergência à pessoa não foi construído.
- **Foto sem texto não vira texto inventado.** Nas 3 fotos sem texto, as duas passadas devolveram só `[ilegível]` (6 de 6).
- **Sufixo some mais do que aparece.** O Z do 608Z saiu da primeira passada e o C3 do RKW 6203 C3 ficou de fora nas duas. Sem o sufixo, o motor manda para revisão, que é o comportamento certo, mas a pessoa terá de completar à mão.
- **Quase nenhuma foto tem chave possível.** O motor só resolve a designação de 1 das 12 fotos (o NSK 608Z). Os outros rolamentos são abertos ("6203 C3" sem marca de vedação), têm vedação que o motor não conhece ("RSR") ou não são rolamento rígido de esferas. Por isso "chave certa" fica em 0 de 1, e esse número não diz quase nada. Um número que diga algo precisa de fotos de rolamentos 2Z e 2RS de verdade, como os da moenda, e hoje só o Myke tem essas fotos.
- **A ordem das linhas muda o que o motor faz.** O modelo devolve as linhas na ordem que quiser. "JAPAN / 608Z" é recusado ("fora das famílias") porque o motor exige que o texto abra com marca ou designação, e "608Z" sozinho resolve. O NSK 608Z da passada 2 tem a designação certa e foi recusado por abrir com "JAPAN". Quem arruma isso é o motor ou a tela de conferência, que não são desta fatia.
- **Custo e tempo não são problema.** Cerca de US$ 0,0003 por foto e 1,6 s de mediana na chamada ao Bedrock.

## Onde o pedido do desenho não valeu

- **Temperatura 0.** O `us.openai.gpt-6-luna` responde 400 a qualquer `temperature` ("This model doesn't support the temperature field"), e um relato público indica que isso vale em todos os níveis de raciocínio (https://github.com/maximhq/bifrost/issues/7701). O pedido vai sem ela.
- **Teto de 300 tokens.** Mantido, mas com o raciocínio padrão o modelo gasta os 300 tokens pensando e devolve `stopReason: max_tokens` sem texto (medido na primeira chamada de verdade). O pedido leva `additionalModelRequestFields.reasoning.effort = "none"`, campo que o cartão do modelo na AWS descreve para a Converse. Com ele, uma foto gasta de 8 a 32 tokens de saída.
- **O que a AWS cobra pela imagem.** A foto de 1600 px conta de 1240 a 2550 tokens, conforme a foto, e a AWS a cobra como escrita de cache implícito (US$ 0,1375 por milhão) na primeira vez e como leitura (US$ 0,011) nas seguintes. Uma foto nova do celular sempre paga a escrita.

## O que não foi medido

- Fotos do Myke, de rolamentos de moenda, sujos, a ângulo e com luz ruim.
- A foto sem a redução para 1600 px, e a redução com a rotação do EXIF de um celular de verdade. A redução tem teste de navegador com imagens geradas, e a rotação é a do `createImageBitmap(..., { imageOrientation: "from-image" })`, sem teste.
- O caminho completo celular, Cloudflare e função. O que existe é a função rodando no runtime local das Pages (`wrangler pages dev`) e respondendo 200 a uma foto do exemplo.
- A proteção contra abuso da rota (decisão 7 do desenho). A função recusa corpo acima de 3,75 MB e tipo que não seja JPEG, e nada mais.
