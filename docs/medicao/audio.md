# Medição do áudio

Medido em 17/11/2026, 11:22 (Brasília), sobre o motor `motor-1`. O caminho medido é o da página: o arquivo de áudio, `functions/api/audio.ts` (Groq, `whisper-large-v3-turbo`, `language=pt`, `temperature=0`, prompt de vocabulário), `falaParaTexto` e `motor.ler`. Uma fala conta como certa quando o motor resolve a mesma chave da designação escrita em `esperado`, sem a pessoa corrigir o campo.

## As falas desta medição são sintetizadas

As 10 falas gravadas pelo Myke ainda não existem. As falas abaixo são de máquina (Piper, vozes pt_BR faber, cadu e jeff, de conjuntos de voz com licença CC0), em `dados/audio/sinteticas/`. Servem para achar o que quebra no caminho. Não dizem como o Groq entende a voz, o sotaque, a pressa e a oficina do Myke.

| conjunto | pasta | certas | chave errada | foram para a pessoa |
|---|---|---:|---:|---:|
| limpas | `dados/audio/sinteticas/limpas` | 5 de 10 | 0 | 5 |
| com ruído, 10 dB abaixo da voz | `dados/audio/sinteticas/com-ruido` | 3 de 10 | 0 | 7 |

Nenhuma das 20 falas resolveu a peça errada. O que o caminho não entendeu foi para a pessoa, que corrige o campo antes de confirmar.

## O que limita o número

- **A transcrição.** Das 5 falas limpas que falharam, 4 saíram com dígito ou letra trocado: `Rolamento 6, 2Z, 5, 2RS`, `62A5`, `6,3A5 dos RCH` e "cê três" ouvido como `ZZ`. Das 7 com ruído, 6 são assim. O modelo escreveu os números sempre em algarismos: em nenhuma das 20 transcrições veio "seis" ou "zê" por extenso. A troca por soletração de `src/entrada/fala.ts` não rodou nestes dados, e só tem teste de unidade.
- **O motor só lê texto que abre como rolamento** (`src/motor/README.md`). A fala 05 começa com "preciso de um rolamento". O modelo transcreveu certo (`Preciso de um rolamento 6204, 2Z, C3.`) e o motor recusa. A pessoa apaga o começo no campo. É o único caso, em cada conjunto, em que a transcrição estava certa e a fala falhou.
- **`falaParaTexto` tira a vírgula entre os códigos.** O modelo põe vírgula a cada pausa (`Rolamento 6304, ZZ, C3.`), e o motor lê a vírgula como fim da designação: `Rolamento 6310, 2Z, C3.` vai para revisão, e sem a vírgula resolve (`src/entrada/fala.test.ts`).
- **Sem pausa na fala**, números e letras ditos por extenso ficam colados (`seis dois zero cinco dois erre esse` vira `62052RS`). O motor manda para uma pessoa. Não há como separar sem conhecer a família.

## Controles

- **Sem o prompt**, nas mesmas 20 falas: 4 de 10 nas limpas e 2 de 10 com ruído, 0 chaves erradas. Com o prompt: 5 e 3. A diferença é de uma fala em 10, o que não separa do acaso. O prompt ficou porque a tarefa o pede e porque o modelo escreveu "Colamento" em 4 transcrições sem ele (1 limpa, 3 com ruído) e em nenhuma com ele.
- **O prompt não traz designação inteira.** No piloto (6 falas que não entram nesta medição), um prompt com `6205 2RS, 6310 ZZ C3` fez a fala "seis zero zero dois, dois erre esse agá" sair como `Rolamento 6002 2RS, 6310 ZZ C3.`: o modelo copiou do prompt uma peça que ninguém disse. Com o prompt de vocabulário atual isso não apareceu nas 20 falas.
- **Silêncio e ruído puro.** Com o prompt, o Whisper devolve a última frase dele (`Folga C3.`) como se fosse fala; sem o prompt devolve `E aí`. A função devolve texto vazio quando o texto é uma frase do prompt, e a página diz "Não ouvi nada." O `E aí` sem prompt não seria pego.
- **Repetição.** Duas rodadas de cada conjunto, com `temperature=0`: transcrições idênticas e o mesmo k.

## O que o número não mede

- Voz de máquina: sem sotaque, sem pressa, sem mão suja, sem capacete.
- O ruído é rosa e sintético, 10 dB abaixo da voz. Não é uma moenda.
- Os arquivos vêm do `ffmpeg` (webm com Opus, mp4 com AAC), não do `MediaRecorder` de um celular. O mp4 fragmentado que o Safari grava não foi testado.
- Dez falas por conjunto. Uma fala a mais ou a menos muda o k em 10 pontos.
- As falas e o que se espera delas foram escritos antes da primeira transcrição, e nada foi ajustado depois de ver o resultado. O ajuste de `falaParaTexto` e do prompt veio de 6 falas de piloto, fora deste conjunto.

## Como medir as gravações do Myke

1. Gravar 10 falas no celular, cada uma dizendo uma peça como se falaria na usina, e pôr os arquivos numa pasta (`01.m4a` do iPhone, `01.webm` do Android; também vale `.mp4`, `.ogg`, `.mp3`, `.wav` e `.flac`). Por exemplo `dados/audio/gravadas/`.
2. Criar `falas.json` na mesma pasta:

```json
{
  "origem": "gravada",
  "descricao": "Dez falas do Myke, iPhone, na oficina.",
  "falas": [
    { "arquivo": "01.m4a", "esperado": "Rolamento 6310 2Z C3", "dito": "rolamento seis três um zero, dois zê, cê três" }
  ]
}
```

`esperado` é a designação como a usina escreveria. Tem de resolver no motor, e o script avisa quando não resolve. `dito` e `voz` são opcionais e só aparecem na tabela. Com `"origem": "gravada"` o relatório diz que as falas foram gravadas por uma pessoa.

3. Pôr a chave em `GROQ_API_KEY`, no ambiente ou em `.dev.vars` na raiz (o git ignora esse arquivo).
4. Rodar:

```sh
bun run scripts/medir-audio.ts dados/audio/gravadas --saida /tmp/gravadas.md
```

O script espera 3,1 s entre as chamadas, por causa dos 20 por minuto do plano grátis do Groq. Ele imprime o k de N, a contagem de chave errada, de falas que foram para a pessoa e de falas sem texto, o tempo, e uma linha por fala com o que o modelo escreveu, o que o campo mostra e o resultado. Colar o resultado nesta página, acima das falas sintetizadas, e trocar o aviso do começo.

A mesma medição roda nas sintéticas: `bun run scripts/medir-audio.ts dados/audio/sinteticas/limpas`.

## Como as sintéticas foram feitas

`piper-tts` 1.8.0 com as vozes `pt_BR-faber-medium`, `pt_BR-cadu-medium` e `pt_BR-jeff-medium`, a partir do campo `dito` de cada `falas.json`. Depois `ffmpeg`: webm com `libopus` a 32 kbit/s nas falas ímpares, mp4 com `aac` a 48 kbit/s nas pares. Nas de `com-ruido`, ruído rosa (`anoisesrc`) misturado com nível de 10 dB abaixo do RMS da voz.

## Custo e limites do Groq

Lidos em https://console.groq.com/docs/speech-to-text e https://console.groq.com/docs/rate-limits em 17/11/2026.

- Teto de arquivo: 25 MB no plano grátis e 100 MB no Developer. A função recusa acima de 25 MB com 413. A página para a gravação em 30 s, que dá menos de 0,5 MB a 128 kbit/s.
- `prompt`: até 224 tokens. O nosso é uma linha.
- Plano grátis para o `whisper-large-v3-turbo`: 20 chamadas por minuto, 2.000 por dia, 7.200 s de áudio por hora. Acima disso o Groq recusa com 429 e não cobra.
- **A chave desta máquina não tem o limite do plano grátis.** A resposta traz `x-ratelimit-limit-requests: 200000` e 24 chamadas seguidas não foram recusadas. A conta pode ser paga.
- Se for paga: US$ 0,04 por hora de áudio, com mínimo de 10 s por chamada. As cerca de 115 chamadas desta tarefa (piloto, gravação das respostas, 4 medições, controle, testes) dão no máximo US$ 0,013.
- Tempo da chamada ao Groq, medido dentro da função: mediana de 372 ms nas limpas e de 326 ms com ruído.

## Detalhe das 20 falas

Saída de `scripts/medir-audio.ts`, primeira rodada de cada conjunto.

### Limpas

Origem: falas SINTETIZADAS (voz de máquina, não de pessoa). Falas sintetizadas com Piper (vozes pt_BR faber, cadu e jeff), sem ruído.

**5 de 10 com a chave certa**, sem a pessoa corrigir o campo.

- Chave errada (o motor resolveu outra peça): 0
- Foram para a pessoa (revisa ou recusa): 5
- Sem texto (a transcrição falhou ou veio vazia): 0
- Tempo da chamada ao Groq: mediana 372 ms, maior 575 ms (10 chamadas)

| arquivo | dito | o modelo escreveu | campo | esperado | resultado |
|---|---|---|---|---|---|
| 01.webm | rolamento seis três um zero, dois zê, cê três | `Rolamento 6310, 2Z, ZZ.` | `Rolamento 6310 2Z ZZ` | `Rolamento 6310 2Z C3` | pessoa: revisa (sufixo-desconhecido) |
| 02.m4a | rolamento seis dois zero cinco, dois erre esse | `Rolamento 6, 2Z, 5, 2RS.` | `Rolamento 6 2Z 5 2RS` | `Rolamento 6205 2RS` | pessoa: revisa (designacao-ausente) |
| 03.webm | rolamento seis zero zero três, zê zê | `Rolamento 6003, ZZ.` | `Rolamento 6003 ZZ` | `Rolamento 6003 ZZ` | certa |
| 04.m4a | rolamento de esferas seis três zero seis, dois erre esse, cê três | `Rolamento de esferas 6306, 2RS, C3.` | `Rolamento de esferas 6306 2RS C3` | `Rolamento de esferas 6306 2RS C3` | certa |
| 05.webm | preciso de um rolamento seis dois zero quatro, dois zê, cê três | `Preciso de um rolamento 6204, 2Z, C3.` | `Preciso de um rolamento 6204 2Z C3` | `Rolamento 6204 2Z C3` | pessoa: recusa (fora-das-familias) |
| 06.m4a | rolamento sessenta e dois zero cinco, dois erre esse | `Rolamento 62A5, 2RS.` | `Rolamento 62A5 2RS` | `Rolamento 6205 2RS` | pessoa: revisa (designacao-ausente) |
| 07.webm | rolamento seis mil trezentos e dez, dois zê, cê três | `Rolamento 6310, 2Z, C3.` | `Rolamento 6310 2Z C3` | `Rolamento 6310 2Z C3` | certa |
| 08.m4a | rolamento seis dois zero um, zê zê, cê três | `Rolamento 6201, ZZ, C3.` | `Rolamento 6201 ZZ C3` | `Rolamento 6201 ZZ C3` | certa |
| 09.webm | rolamento seis três zero cinco, dois erre esse agá | `Rolamento 6,3A5 dos RCH.` | `Rolamento 6,3A5 dos RCH` | `Rolamento 6305 2RSH` | pessoa: revisa (designacao-ausente) |
| 10.m4a | rolamento seis zero zero seis, erre esse | `Rolamento 6006RS.` | `Rolamento 6006RS` | `Rolamento 6006 RS` | certa |

### Com ruído

Origem: falas SINTETIZADAS (voz de máquina, não de pessoa). As mesmas falas sintetizadas, com ruído rosa 10 dB abaixo da voz (relação sinal-ruído de 10 dB), para imitar a oficina.

**3 de 10 com a chave certa**, sem a pessoa corrigir o campo.

- Chave errada (o motor resolveu outra peça): 0
- Foram para a pessoa (revisa ou recusa): 7
- Sem texto (a transcrição falhou ou veio vazia): 0
- Tempo da chamada ao Groq: mediana 326 ms, maior 469 ms (10 chamadas)

| arquivo | dito | o modelo escreveu | campo | esperado | resultado |
|---|---|---|---|---|---|
| 01.webm | rolamento seis três um zero, dois zê, cê três | `Rolamento 6310, 2Z, ZZ.` | `Rolamento 6310 2Z ZZ` | `Rolamento 6310 2Z C3` | pessoa: revisa (sufixo-desconhecido) |
| 02.m4a | rolamento seis dois zero cinco, dois erre esse | `Rolamento 6-2A5, 2RS.` | `Rolamento 6-2A5 2RS` | `Rolamento 6205 2RS` | pessoa: revisa (designacao-ausente) |
| 03.webm | rolamento seis zero zero três, zê zê | `Rolamento 6, 0Z3, 2Z.` | `Rolamento 6 0Z3 2Z` | `Rolamento 6003 ZZ` | pessoa: revisa (designacao-ausente) |
| 04.m4a | rolamento de esferas seis três zero seis, dois erre esse, cê três | `Rolamento de esferas 6306, 2RS, C3.` | `Rolamento de esferas 6306 2RS C3` | `Rolamento de esferas 6306 2RS C3` | certa |
| 05.webm | preciso de um rolamento seis dois zero quatro, dois zê, cê três | `Preciso de um rolamento 6204-2Z, C3.` | `Preciso de um rolamento 6204-2Z C3` | `Rolamento 6204 2Z C3` | pessoa: recusa (fora-das-familias) |
| 06.m4a | rolamento sessenta e dois zero cinco, dois erre esse | `Rolamento 62RS.` | `Rolamento 62RS` | `Rolamento 6205 2RS` | pessoa: revisa (designacao-ausente) |
| 07.webm | rolamento seis mil trezentos e dez, dois zê, cê três | `Rolamento 6310, 2Z, C3.` | `Rolamento 6310 2Z C3` | `Rolamento 6310 2Z C3` | certa |
| 08.m4a | rolamento seis dois zero um, zê zê, cê três | `Rolamento 6201, ZZ, C3.` | `Rolamento 6201 ZZ C3` | `Rolamento 6201 ZZ C3` | certa |
| 09.webm | rolamento seis três zero cinco, dois erre esse agá | `Rolamento 6,3 a 5, 2Z, ZZ.` | `Rolamento 6,3 a 5 2Z ZZ` | `Rolamento 6305 2RSH` | pessoa: revisa (designacao-ausente) |
| 10.m4a | rolamento seis zero zero seis, erre esse | `Rolamento 6Z6. R. S.` | `Rolamento 6Z6 R S` | `Rolamento 6006 RS` | pessoa: revisa (designacao-ausente) |
