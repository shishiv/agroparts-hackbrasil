# Motor

`ler(entrada)` lê um texto e conclui resolve, revisa ou recusa. `unificar(cadastro)` lê o texto de cada código do cadastro e entrega as leituras a `agrupar`, que é a única porta para `Unificacao`. O motor não faz rede, não usa segredo e roda igual no Bun e no navegador.

## Princípios

- **Só uma regra junta.** Dois códigos entram no mesmo grupo quando a leitura de cada um tem a mesma chave. Semelhança de texto nunca junta.
- **Na dúvida, uma pessoa.** Faltou informação, sobrou informação ou duas informações se contradizem: o texto não ganha chave. Um par falso é pior do que um par que ficou de fora.
- **Cada atributo guarda o trecho que o prova**, em posições do texto original. Um atributo que o texto não escreve (a folga normal) tem trecho vazio, logo depois do que veio antes.
- **A chave não depende de localidade.** Nada em `src/motor/` usa `localeCompare`, `Intl` ou `toLocale*`. A normalização é `toUpperCase` mais uma tabela própria de acentos, uma unidade para cada unidade do original. `fontes.test.ts` falha se alguém usar.

## Famílias

Cada família é uma entrada de `familias/index.ts`, com os atributos que formam a chave. O motor entrega o texto à primeira família que não o recusa como fora das famílias.

**Rolamento rígido de esferas** (`familias/rolamento-rigido-de-esferas/`). A chave é série, vedação e folga. As regras que decidem o que cada rótulo quer dizer estão em `dados/gabarito/regras-de-rotulagem.md`. O motor acrescenta estas, para não juntar peças diferentes:

- **Palavra desconhecida manda o texto para revisão.** Uma palavra que o motor não conhece pode ser o que muda a peça: inox, isolado, com anel de trava, um kit, outro rolamento. Vale para o texto inteiro. O campo de aplicação do CATMAT ("TIPO USO", "TIPO DE USO", "APLICAÇÃO") aceita, além das palavras comuns, só as de equipamento que `explicacao.ts` lista ("MOTORES ELÉTRICOS", "MÁQUINAS EM GERAL", "AR CONDICIONADO"). Um sinal fora do alfabeto latino, inclusive o acento solto de um texto decomposto, também conta como desconhecido.
- **O texto tem de abrir como rolamento**, com uma marca ou com a própria designação. "POLIA COM ROLAMENTO 6205 ZZ" cita a designação sem ser o rolamento.
- **Código de vedação ou de folga solto** ("ROL 6310 BOMBA C3"), vedação escrita duas vezes ("Z Z"), sufixo colado em letras ("ZZNR") e "E" ou outra ligação colada por hífen ("-2Z-E") mandam o texto para revisão.
- **Duas leituras possíveis** ("6232Z" é 6232 com Z, ou 623 com 2Z) mandam o texto para revisão.
- **O furo escrito** (`60X130X31`, `FURO 30MM`, `DIÂMETRO INTERNO: 50 MM`) tem de bater com o furo da designação. Medida que o motor não entende não é ignorada: vira palavra desconhecida.
- **Vedação aberta** só vale quando o texto não fala de vedação, blindagem, lados nem material de vedação, e "ABERTO" no campo de aplicação ("MOTOR ABERTO") não conta.
- **"2 PLACAS DE VEDAÇÃO"** quer dizer vedação dos dois lados. Com um código de um lado só, o texto se contradiz.
- **Furo de até 200 mm.** Código de furo acima de 40 não é designação desta família.

O motor é mais cauteloso que o gabarito nos textos do CATMAT que o próprio CATMAT cortou no meio de uma palavra ("BLINDAGEM D", "COM A"): o gabarito os resolve, o motor os manda para revisão. O placar lista cada um.

O motor usa regex com índices de grupo (flag `d`): precisa de Chrome 90, Firefox 88 ou Safari 15. Em versão mais antiga o módulo não carrega.

O que a chave não olha: diâmetro externo e largura, gaiola, tolerância, fabricante.

## Mudar uma regra

Mude `VERSAO_REGRAS` em `unificar.ts` e rode `bun run placar`. O placar grava a versão, os pares falsos juntados, o acordo com o gabarito e uma impressão de todas as leituras. O teste de navegador calcula o placar de novo e confere que sai o mesmo arquivo.
