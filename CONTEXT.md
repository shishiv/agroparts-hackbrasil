# Glossário

**Usina:** a empresa cliente. Na demo, uma usina fictícia.
**Equipamento:** máquina que a usina controla como ativo, identificada pelo número de patrimônio.
**Tag do equipamento:** código curto da máquina na usina, como B-104. Não é a tag NFC da placa.
**Placa de patrimônio:** placa física que a usina já fixa no equipamento, com o número gravado e uma tag NFC que abre a página do equipamento.
**Número de patrimônio:** número gravado na placa; abre a página quando digitado.
**Tag NFC para metal:** etiqueta NFC com camada de ferrite, que funciona colada em metal.
**Página do equipamento:** página aberta pela placa, com o histórico unificado do equipamento. Só lê.
**Posição:** lugar da peça no equipamento, quando a exportação do CMMS informa.
**Ordem de manutenção:** registro do CMMS de um serviço num equipamento.
**Troca:** baixa de material numa ordem de manutenção de um equipamento.
**CMMS:** sistema de manutenção da usina. A AgroParts lê a exportação dele e não o substitui.
**Exportação da usina:** os arquivos que a usina exporta do CMMS e do ERP: equipamentos, materiais, consumo e estoque.
**Código legado:** código de material da usina, com a descrição original. Nunca é alterado.
**Leitura:** conclusão do motor sobre um texto: resolve, revisa ou recusa.
**Resolve:** leitura completa e sem contradição. Só ela tem chave.
**Revisa:** leitura com pendência. Vai a uma pessoa.
**Recusa:** leitura com contradição, fora das famílias conhecidas ou sem texto.
**Atributo:** propriedade lida do texto, com o trecho que a sustenta.
**Família:** tipo de peça com regra própria de leitura e de chave, como rolamento rígido de esferas.
**Chave de identidade:** atributos que definem a peça dentro da família.
**Grupo:** códigos legados com a mesma chave. Um grupo é uma peça.
**Histórico unificado:** trocas de um equipamento somadas por grupo.
**SKU da usina:** rótulo que a usina já dá aos códigos no próprio cadastro.
**Mistura:** SKU da usina que junta códigos de grupos diferentes.
**Fragmentação:** grupo cujos códigos estão em mais de um SKU da usina.
**Estoque:** saldo de cada código legado no almoxarifado.
**Saldo sob outro código:** saldo de um código do mesmo grupo que o equipamento não costuma usar.
**Entrada:** texto que chega ao motor: digitado, do cadastro, lido de foto ou ouvido de áudio.
**Origem:** de onde veio a entrada e se uma pessoa confirmou o texto.
**Parecido, sem prova:** semelhança de texto entre códigos. Nunca junta grupo.
**Jev:** modelo da TypeSafe que escolhe a família entre opções fechadas. Não cria grupo.
**Placar:** medição do motor contra um gabarito público feito antes da medição.
**Dados de demonstração:** usina, equipamentos, ordens e estoque inventados sobre textos públicos do CATMAT e de compras públicas.
