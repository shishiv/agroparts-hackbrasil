# Conferência da amostra de 30 rótulos contra catálogos públicos

Protocolo `conferencia-amostra-1`, feito em 2026-11-17 sobre o gabarito `gabarito-1`.

Conferido contra catálogo público, não revisado por pessoa. Feito por um agente de IA que leu os catálogos.

Os 30 rótulos são os de `dados/gabarito/amostra-30.md`. Para cada rolamento, o diâmetro interno (d), o externo (D) e a largura (B) escritos no texto foram comparados com a tabela de um fabricante, e a série, a vedação e a folga foram lidas nas definições de sufixo do mesmo catálogo. Para as peças que não são rolamento, a conferência só confirma que o item não é um rolamento rígido de esferas da série 6.

Os dados de cada item estão em `docs/medicao/conferencia-amostra.json`, e este arquivo sai dele com `bun run conferencia-amostra`.

## Resultado

| resultado | itens |
|---|---:|
| confere | 29 |
| não confere | 0 |
| não deu para conferir | 1 |

## Divergências

Nenhum rótulo divergiu. O gabarito não mudou.

## Sem tabela para conferir

- item 319042: O 16011 mede 55x90x11 mm, igual ao texto. Mas o SKF e a NTN listam o 16011 só aberto, sem versão ZZ. A vedação ZZ do texto não tem tabela de fabricante para conferir. Uma loja lista o 16011-2Z, o que não é tabela de fabricante. O rótulo segue o texto e não muda.

## O que esta conferência não prova

- Ela confere o que um catálogo diz sobre a referência. As regras de rotulagem (por exemplo, tratar LLU como sufixo desconhecido) continuam sendo escolhas do gabarito.
- Os rótulos de recusa por contradição dependem de o texto dizer "metálico e blindado" junto de um código de borracha. O catálogo confirma o que cada código quer dizer, e não o que o texto quis dizer.
- Os catálogos consultados são o da SKF e o da NTN. Um rolamento que só outro fabricante lista (como o 16011 ZZ) fica sem tabela para conferir.

## Fontes

- `skf`: [SKF, Rolling bearings (PUB BU/P1 10000/2 EN, agosto de 2013). A página é a impressa no catálogo.](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf) Cópia do catálogo da SKF hospedada por um distribuidor. A SKF trocou esta edição pela 17000, e as medidas dos rolamentos rígidos de esferas seguem a ISO 15 nas duas.
- `ntn`: [NTN, Ball and Roller Bearings (CAT.No.2203-3/E). A página é a impressa no catálogo.](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf) Arquivo do site da NTN.
- `optibelt`: [Optibelt, VB S=C Plus, correias em V clássicas (DIN 2215 / ISO 4184). A página é a do PDF.](https://www.ilcuscinetto.it/documenti/Optibelt/Cinghie%20classiche%20VB%20Optibelt.pdf) Catálogo da Optibelt hospedado por um distribuidor.
- `johncrane`: [John Crane, instruções do selo mecânico Type 2100. A página é a do PDF.](https://www.johncrane.com/media/ajzdq3aq/iom_p_seal_2100_en_26_a4d_v0.pdf) Arquivo do site da John Crane.
- `skf-retentor`: [SKF, retentor radial 30X42X7 HMS5 V.](https://www.skf.com/sg/products/industrial-seals/power-transmission-seals/radial-shaft-seals/general-industrial-applications/productid-30X42X7%20HMS5%20V) A página carrega por JavaScript e não foi lida por máquina. O título e a descrição vieram do resultado de busca.

## Item a item

### 1. Item 250909: confere

> CORREIA TRANSMISSÃO, MATERIAL: BORRACHA , TIPO: B 42 , APLICAÇÃO: EQUIPAMENTO AR CONDICIONADO CENTRAL

- Rótulo do gabarito: `recusa/fora-das-familias`
- Referência lida: `B 42`
- B 42 é perfil de correia em V clássica (largura 17 mm, comprimento interno 1060 mm), não rolamento.
- Fonte: [optibelt](https://www.ilcuscinetto.it/documenti/Optibelt/Cinghie%20classiche%20VB%20Optibelt.pdf), p. 4: B 42

### 2. Item 317416: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , REFERÊNCIA FABRICANTE: 608 , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS , DIÂMETRO INTERNO: 8 MM, DIÂMETRO EXTERNO: 22 MM, LARGURA: 7 MM

- Rótulo do gabarito: `revisa/sufixo-desconhecido`
- Referência lida: `608`
- Medidas no catálogo: 8 x 22 x 7 mm
- O catálogo lista o 608 com 8x22x7 mm, igual ao texto, em versão aberta, 2Z e 2RSH. O texto não diz a vedação, então revisa.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 322: 608
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 348: 608-2RSH

### 3. Item 472451: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS, VEDAÇÃO DUPLA , DIÂMETRO INTERNO: 55 MM, DIÂMETRO EXTERNO: 90 MM, LARGURA: 18 MM, REFERÊNCIA FABRICANTE 1: 6011 2RS

- Rótulo do gabarito: `resolve 6011 2RS CN`
- Referência lida: `6011 2RS`
- Medidas no catálogo: 55 x 90 x 18 mm
- 6011-2RS1 mede 55x90x18 mm, igual ao texto. 2RS1 é vedação de contato de NBR nos dois lados, como "VEDAÇÃO DUPLA". Sem código de folga, a folga é Normal.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 362: 6011-2RS1
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-26 e B-27: 6011
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 320 e 321: sufixos -2Z, -2RS1, -2RSH, C3

### 4. Item 605431: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO , DE UMA CARREIRA DE  ESFERAS , BLINDAGEM D , DIÂMETRO INTERNO: 15 MM, DIÂMETRO EXTERNO: 42 MM, LARGURA: 13 MM, REFERÊNCIA FABRICANTE 2: 6302 ZZ

- Rótulo do gabarito: `resolve 6302 ZZ CN`
- Referência lida: `6302 ZZ`
- Medidas no catálogo: 15 x 42 x 13 mm
- 6302-2Z mede 15x42x13 mm, igual ao texto. ZZ (NTN) e 2Z (SKF) são as duas blindagens metálicas.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 352: 6302-2Z
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-22 e B-23: 6302

### 5. Item 472637: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO, 1 CARREIRA DE ESFERA, BLINDAGEM METÁLICA , DIÂMETRO INTERNO: 55 MM, DIÂMETRO EXTERNO: 120 MM, LARGURA: 29 MM, REFERÊNCIA FABRICANTE 2: 6311-2RS

- Rótulo do gabarito: `recusa/contradicao`
- Referência lida: `6311-2RS`
- Medidas no catálogo: 55 x 120 x 29 mm
- 6311-2RS mede 55x120x29 mm, igual ao texto. O SKF define 2RS1 como vedação de contato de NBR e 2Z como blindagem metálica: o código de borracha contradiz "BLINDAGEM METÁLICA".
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 364: 6311-2RS1
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 364: 6311-2Z
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 320 e 321: sufixos -2Z, -2RS1, -2RSH, C3

### 6. Item 366359: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE DUAS CARREIRAS COM BLINDAGEM DUPLA , DIÂMETRO INTERNO: 17 MM, DIÂMETRO EXTERNO: 40 MM, LARGURA: 16 MM, REFERÊNCIA FABRICANTE 1: 3320-SKF

- Rótulo do gabarito: `recusa/fora-das-familias`
- Referência lida: `3320`
- A referência 3320 é do rolamento de contato angular de duas carreiras 3320 A (100x215x82,6 mm), fora da série 6. As medidas do texto (17x40x16) não são as dele. A recusa vale nos dois casos.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 526: 3320 A (duas carreiras de contato angular, 100x215x82,6 mm)

### 7. Item 283526: confere

> ROLAMENTO DE ESFERA, TIPO USO: MOTORES ELÉTRICOS , REFERÊNCIA FABRICANTE: 6307 2RS1 , CARACTERÍSTICAS ADICIONAIS: METÁLICO E BLINDADO

- Rótulo do gabarito: `recusa/contradicao`
- Referência lida: `6307 2RS1`
- Medidas no catálogo: 35 x 80 x 21 mm
- 6307-2RS1 mede 35x80x21 mm. 2RS1 é vedação de contato de NBR, o que contradiz "METÁLICO E BLINDADO".
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 360: 6307-2RS1
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 320 e 321: sufixos -2Z, -2RS1, -2RSH, C3

### 8. Item 485889: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS , DIÂMETRO INTERNO: 30 MM, DIÂMETRO EXTERNO: 55 MM, LARGURA: 13 MM, REFERÊNCIA FABRICANTE 2: 6006LLUC3

- Rótulo do gabarito: `revisa/sufixo-desconhecido`
- Referência lida: `6006LLUC3`
- Medidas no catálogo: 30 x 55 x 13 mm
- 6006 mede 30x55x13 mm, igual ao texto. LLU é o código da NTN para vedação de contato nos dois lados, e C3 é folga maior que a Normal. O SKF não usa LLU. As regras tratam sufixo fora da tabela como desconhecido, então revisa.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 326: 6006
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-24 e B-25: 6006
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. A-48 a A-51 e B-17: códigos LLU e C3

### 9. Item 602539: confere

> POLIA, APLICAÇÃO: VIATURA BLINDADA M109. , CARACTERÍSTICAS ADICIONAIS: APLICADA EM ALTERNADOR . , REFERÊNCIA: UF3426 .

- Rótulo do gabarito: `recusa/fora-das-familias`
- Referência lida: `UF3426`
- UF3426 não é designação da série 6 e não consta no catálogo SKF nem no NTN. O texto diz polia de alternador.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 43: diagrama de designação básica (séries 6, 16, 62, 63, 64, 68, 69)

### 10. Item 601301: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: COM DUAS PLACAS DE VEDAÇÃO E PREENCHIMENTO COM GRA , DIÂMETRO INTERNO: 15 MM, DIÂMETRO EXTERNO: 32 MM, LARGURA: 9 MM, MATERIAL: AÇO , REFERÊNCIA FABRICANTE 2: 6002-W

- Rótulo do gabarito: `revisa/sufixo-desconhecido`
- Referência lida: `6002-W`
- Medidas no catálogo: 15 x 32 x 9 mm
- 6002 mede 15x32x9 mm, igual ao texto. O SKF usa W como prefixo de aço inoxidável e não lista -W como sufixo (p. 320), então revisa.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 324: 6002
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-22 e B-23: 6002
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 320 e 321: sufixos -2Z, -2RS1, -2RSH, C3

### 11. Item 318844: confere

> SELO MECÂNICO, MATERIAL: INOX 316 L , MATERIAL VEDAÇÃO: BORRACHA E PORCELANA , MATERIAL FACE VEDAÇÃO: PORCELANA , APLICAÇÃO: VEDAÇÃO DE ÁGUA E ÓLEO , USO: BOMBA D'ÁGUA , CARACTERÍSTICAS ADICIONAIS: UTILIZADO PARA EIXO DE 5/8 POL CABEÇA ROTATIVA 6ª

- Rótulo do gabarito: `recusa/fora-das-familias`
- Referência lida: nenhuma
- Selo mecânico tem cabeça rotativa, mola e sede estacionária, e não é rolamento. "6ª" no texto é a numeração da cabeça, não uma série ISO 15.
- Fonte: [johncrane](https://www.johncrane.com/media/ajzdq3aq/iom_p_seal_2100_en_26_a4d_v0.pdf), p. 2: Type 2100, selo mecânico com mola e sede

### 12. Item 472654: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO, UMA CARREIRA DE ESFERA, VEDAÇÃO NBR EM AMB , DIÂMETRO INTERNO: 30 MM, DIÂMETRO EXTERNO: 72 MM, LARGURA: 19 MM, REFERÊNCIA FABRICANTE 2: 6306-2RS

- Rótulo do gabarito: `resolve 6306 2RS CN`
- Referência lida: `6306-2RS`
- Medidas no catálogo: 30 x 72 x 19 mm
- 6306-2RS mede 30x72x19 mm, igual ao texto. 2RS1 é vedação de contato de NBR nos dois lados, como "VEDAÇÃO NBR EM AMBOS".
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 358: 6306-2RS1
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-24 e B-25: 6306
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 320 e 321: sufixos -2Z, -2RS1, -2RSH, C3

### 13. Item 283524: confere

> ROLAMENTO DE ESFERA, TIPO USO: MOTORES ELÉTRICOS , REFERÊNCIA FABRICANTE: 6204 2RS1 , CARACTERÍSTICAS ADICIONAIS: METÁLICO E BLINDADO

- Rótulo do gabarito: `recusa/contradicao`
- Referência lida: `6204 2RS1`
- Medidas no catálogo: 20 x 47 x 14 mm
- 6204 mede 20x47x14 mm. O SKF define 2RS1 como vedação de contato de NBR (a tabela deste tamanho lista a 2RSH, com a mesma definição), o que contradiz "METÁLICO E BLINDADO".
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 356: 6204-2RSH
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-22 e B-23: 6204
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 320 e 321: sufixos -2Z, -2RS1, -2RSH, C3

### 14. Item 311960: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , REFERÊNCIA FABRICANTE: 6318ZZ C3 , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS; BLINDAGEM DUPLA , DIÂMETRO INTERNO: 90 MM, DIÂMETRO EXTERNO: 190 MM, LARGURA: 43 MM

- Rótulo do gabarito: `resolve 6318 ZZ C3`
- Referência lida: `6318ZZ C3`
- Medidas no catálogo: 90 x 190 x 43 mm
- 6318-2Z mede 90x190x43 mm, igual ao texto. C3 é folga maior que a Normal. ZZ e "BLINDAGEM DUPLA" dizem a mesma coisa.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 368: 6318-2Z
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-30 e B-31: 6318
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 320 e 321: sufixos -2Z, -2RS1, -2RSH, C3

### 15. Item 601975: confere

> SELO MECÂNICO, MATERIAL: AÇO INOXIDÁVEL AISI 304 , MATERIAL VEDAÇÃO: BORRACHA NITRÍLICA , MATERIAL FACE VEDAÇÃO: CERÂMICA , APLICAÇÃO: VEDAÇÃO EIXOS ROTATIVOS BOMBAS DOMÉSTICAS E INDUST , USO: VEDAÇÃO , TEMPERATURA OPERAÇÃO: 35°C A 100°C °C, DIAMETRO: 7/8 POL

- Rótulo do gabarito: `recusa/fora-das-familias`
- Referência lida: nenhuma
- Selo mecânico de mola e sede cerâmica, não é rolamento.
- Fonte: [johncrane](https://www.johncrane.com/media/ajzdq3aq/iom_p_seal_2100_en_26_a4d_v0.pdf), p. 2: Type 2100, selo mecânico com mola e sede

### 16. Item 346332: confere

> ROLAMENTO DE ESFERA, TIPO USO: REFRIGERAÇÃO , REFERÊNCIA FABRICANTE: 6203-2Z , MATERIAL: AÇO

- Rótulo do gabarito: `resolve 6203 ZZ CN`
- Referência lida: `6203-2Z`
- Medidas no catálogo: 17 x 40 x 12 mm
- 6203-2Z mede 17x40x12 mm. 2Z (SKF) é blindagem nos dois lados e o texto não traz folga, então é Normal.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 354: 6203-2Z
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-22 e B-23: 6203

### 17. Item 283522: confere

> ROLAMENTO DE ESFERA, TIPO USO: MOTORES ELÉTRICOS , REFERÊNCIA FABRICANTE: 6202 2RS1 , CARACTERÍSTICAS ADICIONAIS: METÁLICO E BLINDADO

- Rótulo do gabarito: `recusa/contradicao`
- Referência lida: `6202 2RS1`
- Medidas no catálogo: 15 x 35 x 11 mm
- 6202 mede 15x35x11 mm. O SKF define 2RS1 como vedação de contato de NBR (a tabela deste tamanho lista a 2RSH), o que contradiz "METÁLICO E BLINDADO".
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 352: 6202-2RSH
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-22 e B-23: 6202
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 320 e 321: sufixos -2Z, -2RS1, -2RSH, C3

### 18. Item 472597: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS, BLINDAGEM DUPLA , DIÂMETRO INTERNO: 45 MM, DIÂMETRO EXTERNO: 68 MM, LARGURA: 12 MM, REFERÊNCIA FABRICANTE 2: 6909 ZZ

- Rótulo do gabarito: `resolve 6909 ZZ CN`
- Referência lida: `6909 ZZ`
- Medidas no catálogo: 45 x 68 x 12 mm
- 6909 mede 45x68x12 mm, igual ao texto, com versão ZZ na NTN. O catálogo SKF consultado não lista o 6909.
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-26 e B-27: 6909

### 19. Item 346382: confere

> ROLAMENTO DE ESFERA, TIPO USO: REFRIGERAÇÃO , REFERÊNCIA FABRICANTE: 6212-2Z , MATERIAL: AÇO

- Rótulo do gabarito: `resolve 6212 ZZ CN`
- Referência lida: `6212-2Z`
- Medidas no catálogo: 60 x 110 x 22 mm
- 6212-2Z mede 60x110x22 mm. 2Z é blindagem nos dois lados e o texto não traz folga, então é Normal.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 364: 6212-2Z
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-26 e B-27: 6212

### 20. Item 319042: não deu para conferir

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , REFERÊNCIA FABRICANTE: 16011 ZZ , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS, BLINDAGEM DUPLA , DIÂMETRO INTERNO: 55 MM, DIÂMETRO EXTERNO: 90 MM, ALTURA: 11 MM

- Rótulo do gabarito: `resolve 16011 ZZ CN`
- Referência lida: `16011 ZZ`
- Medidas no catálogo: 55 x 90 x 11 mm
- O 16011 mede 55x90x11 mm, igual ao texto. Mas o SKF e a NTN listam o 16011 só aberto, sem versão ZZ. A vedação ZZ do texto não tem tabela de fabricante para conferir. Uma loja lista o 16011-2Z, o que não é tabela de fabricante. O rótulo segue o texto e não muda.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 328: 16011
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-26 e B-27: 16011

### 21. Item 472542: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS, VEDAÇÃO DUPLA , DIÂMETRO INTERNO: 12 MM, DIÂMETRO EXTERNO: 37 MM, LARGURA: 12 MM, REFERÊNCIA FABRICANTE 1: 6301 2RS

- Rótulo do gabarito: `resolve 6301 2RS CN`
- Referência lida: `6301 2RS`
- Medidas no catálogo: 12 x 37 x 12 mm
- 6301-2RS mede 12x37x12 mm, igual ao texto. A tabela do SKF lista a 2RSH, vedação de contato de NBR nos dois lados.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 352: 6301-2RSH
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-22 e B-23: 6301

### 22. Item 317400: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , REFERÊNCIA FABRICANTE: 6007 , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS , DIÂMETRO INTERNO: 35 MM, DIÂMETRO EXTERNO: 62 MM, LARGURA: 14 MM

- Rótulo do gabarito: `revisa/sufixo-desconhecido`
- Referência lida: `6007`
- Medidas no catálogo: 35 x 62 x 14 mm
- 6007 mede 35x62x14 mm, igual ao texto. O texto não diz a vedação, então revisa.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 326: 6007
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-24 e B-25: 6007

### 23. Item 346379: confere

> ROLAMENTO DE ESFERA, TIPO USO: REFRIGERAÇÃO , REFERÊNCIA FABRICANTE: 6308-2Z , MATERIAL: AÇO

- Rótulo do gabarito: `resolve 6308 ZZ CN`
- Referência lida: `6308-2Z`
- Medidas no catálogo: 40 x 90 x 23 mm
- 6308-2Z mede 40x90x23 mm. 2Z é blindagem nos dois lados e o texto não traz folga, então é Normal.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 360: 6308-2Z
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-26 e B-27: 6308

### 24. Item 472641: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS, FOLGA C3 , DIÂMETRO INTERNO: 45 MM, DIÂMETRO EXTERNO: 85 MM, LARGURA: 19 MM, REFERÊNCIA FABRICANTE 2: 6209-C3

- Rótulo do gabarito: `revisa/sufixo-desconhecido`
- Referência lida: `6209-C3`
- Medidas no catálogo: 45 x 85 x 19 mm
- 6209 mede 45x85x19 mm, igual ao texto. C3 é folga maior que a Normal. O texto não diz a vedação, então revisa.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 328: 6209
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-26 e B-27: 6209
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 320 e 321: sufixos -2Z, -2RS1, -2RSH, C3

### 25. Item 612238: confere

> RETENTOR, MATERIAL: BORRACHA NITRILICA NBR , MODELO: 00847BAG , DIÂMETRO INTERNO: 30 MM, DIÂMETRO EXTERNO: 42 MM, ALTURA: 7 MM

- Rótulo do gabarito: `recusa/fora-das-familias`
- Referência lida: `00847BAG`
- Retentor é anel de vedação de eixo de borracha. 30x42x7 mm é medida de retentor, e coincide com a do rolamento 61806, mas o texto diz retentor, de borracha nitrílica, com modelo 00847BAG, que não é designação de rolamento.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 326: 61806
- Fonte: [skf-retentor](https://www.skf.com/sg/products/industrial-seals/power-transmission-seals/radial-shaft-seals/general-industrial-applications/productid-30X42X7%20HMS5%20V): 30X42X7 HMS5 V (retentor radial)

### 26. Item 472642: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO, UMA CARREIRA DE ESFERA , DIÂMETRO INTERNO: 45 MM, DIÂMETRO EXTERNO: 85 MM, LARGURA: 19 MM, REFERÊNCIA FABRICANTE 2: 6209 U

- Rótulo do gabarito: `revisa/sufixo-desconhecido`
- Referência lida: `6209 U`
- Medidas no catálogo: 45 x 85 x 19 mm
- 6209 mede 45x85x19 mm, igual ao texto. O SKF não lista U entre os sufixos de rolamento rígido de esferas (p. 320), então revisa.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 328: 6209
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-26 e B-27: 6209
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 320 e 321: sufixos -2Z, -2RS1, -2RSH, C3

### 27. Item 472514: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , CARACTERÍSTICAS ADICIONAIS: RÍGIDO, UMA CARREIRA DE ESFERA , DIÂMETRO INTERNO: 80 MM, DIÂMETRO EXTERNO: 140 MM, LARGURA: 26 MM, REFERÊNCIA FABRICANTE 1: 6216

- Rótulo do gabarito: `revisa/sufixo-desconhecido`
- Referência lida: `6216`
- Medidas no catálogo: 80 x 140 x 26 mm
- 6216 mede 80x140x26 mm, igual ao texto. O texto não diz a vedação, então revisa.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 332: 6216
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-28 e B-29: 6216

### 28. Item 317406: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , REFERÊNCIA FABRICANTE: 6303 , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA DE ESFERAS , DIÂMETRO INTERNO: 17 MM, DIÂMETRO EXTERNO: 47 MM, LARGURA: 14 MM

- Rótulo do gabarito: `revisa/sufixo-desconhecido`
- Referência lida: `6303`
- Medidas no catálogo: 17 x 47 x 14 mm
- 6303 mede 17x47x14 mm, igual ao texto. O texto não diz a vedação, então revisa.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 324: 6303
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-22 e B-23: 6303

### 29. Item 346336: confere

> ROLAMENTO DE ESFERA, TIPO USO: REFRIGERAÇÃO , REFERÊNCIA FABRICANTE: 6207-2Z , MATERIAL: AÇO

- Rótulo do gabarito: `resolve 6207 ZZ CN`
- Referência lida: `6207-2Z`
- Medidas no catálogo: 35 x 72 x 17 mm
- 6207-2Z mede 35x72x17 mm. 2Z é blindagem nos dois lados e o texto não traz folga, então é Normal.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 358: 6207-2Z
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-24 e B-25: 6207

### 30. Item 310597: confere

> ROLAMENTO DE ESFERA, TIPO USO: MÁQUINAS EM GERAL , REFERÊNCIA FABRICANTE: 6224 , CARACTERÍSTICAS ADICIONAIS: RÍGIDO DE UMA CARREIRA S/ BLINDAGEM , DIÂMETRO INTERNO: 120 MM, DIÂMETRO EXTERNO: 215 MM, LARGURA: 40 MM

- Rótulo do gabarito: `resolve 6224 ABERTO CN`
- Referência lida: `6224`
- Medidas no catálogo: 120 x 215 x 40 mm
- 6224 mede 120x215x40 mm, igual ao texto, listado aberto no SKF e na NTN. "S/ BLINDAGEM" diz aberto.
- Fonte: [skf](https://tflbearing.com/wp-content/uploads/2021/10/SKF-rolling-bearings-catalogue.pdf), p. 334: 6224
- Fonte: [ntn](https://www.ntnglobal.com/en/products/catalog/pdf/2203E.pdf), p. B-32 e B-33: 6224
