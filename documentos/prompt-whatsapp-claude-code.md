# Contexto

Esta é a Fase 3 do sistema (backend e front-end web já existem). Agora um
colaborador pode fotografar o próprio cartão de ponto mecânico e mandar
via WhatsApp; um workflow n8n (arquivo `workflow-ponto-whatsapp.json`,
nesta mesma pasta) recebe a foto, chama a API da Anthropic (Claude, visão)
para extrair os dados, e envia o resultado para o backend. **O RH sempre
revisa e confirma antes de qualquer dado virar registro oficial** — nada é
gravado automaticamente em `RegistroPonto`.

O schema já tem os models necessários (`schema.prisma` atualizado, nesta
pasta): `Colaborador.telefone` (para identificar quem mandou a foto) e
`ExtracaoPendente` (fila de revisão).

# 1. Endpoint que recebe do n8n

`POST /extracoes-pendentes` (autenticado por API key simples, não JWT de
usuário — quem chama é o workflow n8n, não um usuário logado; usar um
header tipo `x-api-key` validado contra uma variável de ambiente
`N8N_WEBHOOK_SECRET`).

Corpo esperado (é o que o workflow n8n envia):
```json
{
  "telefoneOrigem": "5534999999999",
  "fotoUrl": "https://...",
  "nomeExtraidoCartao": "Márcia Ferreira da Cunha",
  "cpfExtraidoCartao": "042.329.836-43",
  "dadosExtraidosJson": "{...json com os dias extraídos...}"
}
```

Lógica do endpoint:
1. Buscar `Colaborador` cujo `telefone` bata com `telefoneOrigem`.
2. Se não encontrar: criar a `ExtracaoPendente` com
   `status: SEM_IDENTIFICACAO`, `colaboradorId: null`.
3. Se encontrar: comparar `nomeExtraidoCartao`/`cpfExtraidoCartao` com os
   dados do colaborador encontrado. Se baterem (ou forem muito parecidos —
   considerar comparação simples ignorando maiúsculas/acentos/espaços),
   marcar `conferenciaOk: true`. Se não baterem, marcar `conferenciaOk:
   false` mas ainda associar o `colaboradorId` (o telefone identificou
   alguém, mas o cartão da foto parece ser de outra pessoa — isso é uma
   pendência importante para o RH olhar com atenção, não um erro fatal).
4. Salvar com `status: PENDENTE` (exceto o caso 2 acima).
5. Retornar 201 com o id criado.

# 2. Endpoints para o RH revisar a fila

- `GET /extracoes-pendentes?status=PENDENTE` — lista a fila, incluindo
  dados do colaborador (se identificado), a foto, e o JSON extraído já
  parseado para exibição.
- `POST /extracoes-pendentes/:id/confirmar` — body permite o RH corrigir
  qualquer campo antes de confirmar (mesma lógica de edição da tela de
  upload manual já existente). Ao confirmar: cria os `RegistroPonto`
  correspondentes (reaproveitar o service/lógica já usada no lançamento
  manual), marca a `ExtracaoPendente` como `CONFIRMADA`, grava
  `revisadoPor` e `revisadoEm`.
- `POST /extracoes-pendentes/:id/rejeitar` — body com `motivoRejeicao`
  (ex.: "Foto ilegível", "Pessoa errada"). Marca como `REJEITADA`, não
  cria nenhum `RegistroPonto`.
- `POST /extracoes-pendentes/:id/vincular-colaborador` — usado apenas
  para os casos `SEM_IDENTIFICACAO`: o RH escolhe manualmente a qual
  colaborador aquela extração pertence (ex.: colaborador mandou de um
  número novo, ainda não cadastrado).

# 3. Tela no front-end: "Fila do WhatsApp"

Nova tela (menu lateral), estilo caixa de entrada:

- Lista de pendências, com foto em miniatura, nome do colaborador (ou
  "Não identificado" em destaque se `SEM_IDENTIFICACAO`), e um badge de
  alerta se `conferenciaOk === false` (telefone e cartão não batem — isso
  precisa ficar visualmente óbvio, é o caso que mais precisa de atenção
  humana).
- Ao clicar numa pendência: abre a mesma tabela editável já usada na tela
  de "Lançamento por foto" (dias extraídos, editável), mais um botão
  "Confirmar e lançar" e outro "Rejeitar" (com campo de motivo).
- Para os casos `SEM_IDENTIFICACAO`: mostrar um seletor de colaborador
  para o RH vincular manualmente antes de poder confirmar.

# 4. Não fazer nesta fase

- Não implementar nenhuma lógica de resposta automática complexa pelo
  WhatsApp além da mensagem de confirmação simples que o workflow n8n já
  envia ("recebemos, RH vai conferir"). Qualquer interação adicional
  (colaborador perguntar status, etc.) fica para uma fase futura.
- Não tentar validar duplicidade de foto/dia de forma automática nesta
  fase — se o mesmo dia for enviado duas vezes, deixar como duas entradas
  na fila e o RH decide (é raro e mais simples resolver manualmente por
  enquanto do que criar lógica de deduplicação).

# 5. Dúvidas conhecidas em aberto (perguntar, não assumir)
- O campo exato do payload da Zernio para a URL/mídia da foto ainda
  precisa ser confirmado com um teste real (está marcado como TODO no
  próprio workflow n8n). Isso não afeta o backend/front-end diretamente
  (ele só recebe o resultado já processado), mas se pedir para você testar
  ponta a ponta, avise que essa parte do n8n pode precisar de ajuste antes
  de funcionar de verdade.
