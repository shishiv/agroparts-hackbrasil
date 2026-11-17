# Agrupamento

`diagnosticar(cadastro, unificacao)` compara o SKU que a usina deu a cada código com os grupos que o motor formou (`unificar`). Só lê: nem o SKU nem o grupo mudam. Roda no navegador e no Bun, sem rede.

## Veredicto por SKU

- **Mistura.** O SKU tem códigos de dois ou mais grupos, mesmo que também tenha códigos sem grupo. Traz as chaves dos grupos e os atributos da chave em que eles diferem (`serie`, `vedacao`, `folga`), na ordem em que a família declara a chave. Um atributo que um grupo lê e o outro não também conta como diferente.
- **Inconclusivo.** Não é mistura e tem código sem grupo (revisa ou recusa). Esse código pode ou não ser a mesma peça, então o SKU não é declarado coerente.
- **Coerente.** Todos os códigos do SKU estão no mesmo grupo.

## Fragmentação

Um grupo com códigos em dois ou mais SKUs. Código sem SKU fica de fora de tudo: não entra em veredicto, nem na lista de SKUs de uma fragmentação (o grupo da fragmentação continua com todos os códigos dele).

## O que prova

`dados/demo/esperado-skus.json` é o que o gerador da demo plantou, a partir dos campos estruturados do CATMAT e sem passar pelo motor. `diagnosticar.test.ts` confere, SKU a SKU, o veredicto, os códigos, os grupos e os códigos sem grupo, e as fragmentações uma a uma. `web/diagnostico/tela.navegador.test.ts` confere os mesmos números no que a tela desenha.
