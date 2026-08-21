# Contexto

Esta é a Fase 3 do sistema (backend já implementado e testado; front-end
web ainda não). Um colaborador fotografa o próprio cartão de ponto
mecânico e manda via WhatsApp; um workflow n8n (arquivo
`workflow-ponto-whatsapp.json`, nesta mesma pasta) recebe a foto, chama a
API da Anthropic (Claude, visão) para extrair os dados, e envia o
resultado para o backend. **O RH sempre revisa e confirma antes de
qualquer dado virar registro oficial** — nada é gravado automaticamente em
`RegistroPonto`.

**Status: os endpoints de backend (seções 1 e 2) já estão implementados e
testados (12/12 testes passando) — o que falta é só a tela de front-end
(seção 3).** As seções 1 e 2 abaixo foram atualizadas para descrever o
contrato real implementado (que difere um pouco do que foi originalmente
especificado), para servir de referência exata ao construir a tela.

# 1. Endpoint que recebe do n8n — IMPLEMENTADO

`POST /extracoes-pendentes`, autenticado por API key (header `x-api-key`
validado contra `N8N_WEBHOOK_SECRET`) — já em produção, testado ponta a
ponta com o workflow n8n real.

Corpo recebido do n8n:
```json
{
  "telefoneOrigem": "553492516070",
  "fotoUrl": "https://...",
  "nomeExtraidoCartao": "Márcia Ferreira da Cunha",
  "cpfExtraidoCartao": "042.329.836-43",
  "dadosExtraidosJson": "{...json com os dias extraídos...}"
}
```
Lógica (implementada): busca `Colaborador` por `telefone`; se não achar,
cria com `status: SEM_IDENTIFICACAO`; se achar, compara nome/CPF
(normalizado) e marca `conferenciaOk`, sempre associando o
`colaboradorId`; salva com `status: PENDENTE`.

# 2. Endpoints para o RH revisar a fila — IMPLEMENTADOS

Todos protegidos por JWT + role (ADMIN/RH).

- **`GET /extracoes-pendentes?status=`** — lista a fila (status opcional:
  `PENDENTE`, `CONFIRMADA`, `REJEITADA`, `SEM_IDENTIFICACAO`), com o
  `colaborador` incluído (quando houver) e `dadosExtraidosJson` já
  parseado para exibição direta.

- **`POST /extracoes-pendentes/:id/confirmar`** — ⚠️ **contrato diferente
  do que o front-end vai exibir na tela**, importante ler com atenção:

  ```json
  {
    "registros": [
      { "dataHora": "2026-08-03T07:58:00", "tipo": "ENTRADA_1" },
      { "dataHora": "2026-08-03T11:43:00", "tipo": "SAIDA_1" },
      { "dataHora": "2026-08-03T13:20:00", "tipo": "ENTRADA_2" },
      { "dataHora": "2026-08-03T17:09:00", "tipo": "SAIDA_2" }
    ]
  }
  ```
  Ou seja: **um item por batida** (mesmo formato de `POST
  /registros-ponto`, reaproveitando a mesma lógica de criação), não um
  item por dia com 4 campos de horário. A tela do RH vai exibir/editar por
  **dia** (mais natural de ler um cartão de ponto), então o **front-end é
  responsável por converter** a tabela editada (dias → 4 horários cada)
  para esse array de batidas antes de enviar — dias/horários que
  estiverem `null` na tabela simplesmente não geram entrada no array.
  Cria os `RegistroPonto` numa transação atômica, marca a
  `ExtracaoPendente` como `CONFIRMADA`, grava `revisadoPor`/`revisadoEm`.
  Retorna 409 se a extração já foi revisada (`CONFIRMADA`/`REJEITADA`), e
  400 se tentar confirmar sem colaborador vinculado.

- **`POST /extracoes-pendentes/:id/rejeitar`** — body
  `{ "motivoRejeicao": "..." }`. Marca `REJEITADA`, não cria nenhum
  `RegistroPonto`.

- **`POST /extracoes-pendentes/:id/vincular-colaborador`** — só para
  `SEM_IDENTIFICACAO`; recebe o `colaboradorId` escolhido pelo RH,
  recalcula `conferenciaOk` comparando com nome/CPF já extraídos, e move
  o registro para `PENDENTE` (aí sim pode ser confirmado).

# 3. Tela no front-end: "Fila do WhatsApp" — A IMPLEMENTAR

Nova tela (menu lateral), estilo caixa de entrada:

- Lista de pendências (`GET /extracoes-pendentes?status=PENDENTE`), com
  foto em miniatura, nome do colaborador (ou "Não identificado" em
  destaque se `SEM_IDENTIFICACAO`), e um badge de alerta se
  `conferenciaOk === false` (telefone e cartão não batem — precisa ficar
  visualmente óbvio, é o caso que mais precisa de atenção humana).
- Ao clicar numa pendência: abre uma **tabela editável por dia** (dia,
  entrada1, saída1, entrada2, saída2, observação) a partir do
  `dadosExtraidosJson` — mesmo componente/padrão da tela de "Lançamento
  por foto" manual (reaproveitar se possível).
- **Antes de chamar `confirmar`**: converter a tabela por dia para o array
  `registros: [{dataHora, tipo}]` descrito na seção 2 — combinar cada
  `data` extraída com o horário de cada campo preenchido, mapeando
  `entrada1→ENTRADA_1`, `saida1→SAIDA_1`, `entrada2→ENTRADA_2`,
  `saida2→SAIDA_2`; campos `null` na tabela não entram no array.
- Botões "Confirmar e lançar" (chama `confirmar` com o array convertido) e
  "Rejeitar" (abre campo de motivo, chama `rejeitar`).
- Para os casos `SEM_IDENTIFICACAO`: mostrar um seletor de colaborador
  para o RH vincular manualmente (`vincular-colaborador`) antes de
  liberar o botão de confirmar.

# 4. Não fazer nesta fase

- Não implementar nenhuma lógica de resposta automática complexa pelo
  WhatsApp além da mensagem de confirmação simples que o workflow n8n já
  envia ("recebemos, RH vai conferir"). Qualquer interação adicional
  (colaborador perguntar status, etc.) fica para uma fase futura.
- Não tentar validar duplicidade de foto/dia de forma automática nesta
  fase — se o mesmo dia for enviado duas vezes, deixar como duas entradas
  na fila e o RH decide (é raro e mais simples resolver manualmente por
  enquanto do que criar lógica de deduplicação).

# 5. Observações finais

- O role usado nos endpoints protegidos ficou `ADMIN/RH` (decisão já
  tomada pelo Claude Code na implementação) — se o projeto usa só `ADMIN`
  em outras telas, confirme qual role o usuário logado do RH realmente
  tem antes de montar as chamadas autenticadas desta tela.
- O campo da mídia no payload da Zernio já foi confirmado com um teste
  real (`message.attachments[0].url`, `message.sender.id` para o
  telefone) — o workflow n8n já está ajustado e validado ponta a ponta,
  não há mais nada pendente de confirmação nesse lado.
