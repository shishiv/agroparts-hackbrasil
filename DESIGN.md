# Design da AgroParts

Regras para quem cria ou muda a interface em `web/`. Cada regra traz o porquê. As cores e os tamanhos citados são as variáveis do `:root` de `web/inicio/base.css`.

## Cor

- As telas usam fundo claro: o neutro `--fundo` (`#f1f2ef`), com as fichas brancas em `--superficie`. Nunca um palco escuro.
  Por quê: a versão escura ficou feia.
- A cor marca só um estado que pede decisão. As ações usam a tinta quase preta `--acao`. O verde `--tem` fica só no que tem no almoxarifado, e o âmbar `--ambar` só na peça guardada com outro código. O amarelo `--marca` fica na placa da marca e na placa de patrimônio. Nunca use blocos de cor chapada, bordas coloridas grossas ou números grandes coloridos.
  Por quê: a cor tem de apontar o que fazer. Cor em toda parte pesa e deixa de apontar.

## Texto

- Os textos da interface são em português do dia a dia, sem SKU, mistura, fragmentação, UN ou outra sigla interna. Quando um termo do domínio aparece, uma frase curta diz o que ele quer dizer. Os textos originais do cadastro nunca mudam.
  Por quê: o texto precisa ser legível e fácil de entender por quem não é da área.
- Toda tela mostra que é demonstração: o aviso "Demonstração" na barra e "dados fictícios" perto dos números.
  Por quê: o júri e quem mais vê a demo estão de fora da usina e não podem achar que a usina e os dados são reais.

## Tipografia

- Só o título da página é grande: Archivo largo (`--largo`) em `--t-titulo`, até cerca de 42 px. Os números dos indicadores chegam no máximo a `--t-3` (cerca de 29 px). O resto segue a escala de razão 1,2, de `--t-r1` a `--t-3`.
  Por quê: letra grande demais deixa a tela pesada e tira o foco do dado.

## Layout

- Cada tela carrega dado de verdade: indicadores, mapa, gráfico e linhas de ficha. Nunca uma tela só com título, campo e lista.
  Por quê: com pouco dado, a página parece vazia e não mostra o produto.
- As páginas ficam dentro da casca de painel: barra lateral com a usina e as máquinas, trilha, faixa de indicadores e painéis com título. Nunca uma página editorial de uma coluna.
  Por quê: o painel mostra o produto para quem trabalha na usina e também para quem está fora dela.
