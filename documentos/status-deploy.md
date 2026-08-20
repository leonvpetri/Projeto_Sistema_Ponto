# Status do deploy — 2026-08-20

Snapshot de fim de sessão, pra retomar amanhã sem precisar reinvestigar tudo
de novo. Isto é um doc de status (estado muda), não uma spec — as specs
ficam em `prompt-deploy-vps-claude-code.md` e `prompt-whatsapp-claude-code.md`,
nesta mesma pasta.

## O que está no ar

- **Container**: `ponto-backend`, rodando a imagem `ponto-backend:latest`
  (buildada localmente nesta VPS a partir do `Dockerfile` na raiz).
- **Rede Docker**: `easypanel-artefinal` (mesma rede overlay do n8n,
  `artefinal_n8n`) — sem porta publicada no host, só alcançável por nome de
  container dentro da rede. URL interna: `http://ponto-backend:3000`.
- **Restart policy**: `unless-stopped`.
- **Banco**: SQLite em `/home/claude/ponto-backend-data/prod.db` (bind
  mount do host para `/app/data/prod.db` no container) — sobrevive a
  rebuild/restart do container. 2 migrations aplicadas: `20260819180120_init`
  e `20260820190644_add_extracao_pendente`.
- Testado ponta a ponta: `GET /docs` acessível de dentro do container do
  n8n via `docker exec <n8n> wget http://ponto-backend:3000/docs`.

## Secrets

Variáveis `JWT_SECRET` e `N8N_WEBHOOK_SECRET` foram geradas com
`openssl rand -hex 32` e passadas como `-e` no `docker run` — **não estão
em nenhum arquivo no repositório nem em texto plano na VPS fora do
ambiente do container** (ficaram só no output do chat e num arquivo
temporário no scratchpad da sessão, que não persiste).

Se ainda não guardou os dois valores em um gerenciador de senhas (fora da
VPS), pegue o histórico da conversa de 2026-08-20 antes que essa sessão
expire. Se perder os valores, não tem problema grave: dá pra gerar novos
(`openssl rand -hex 32`) e recriar o container — só precisa atualizar a
credencial correspondente no n8n depois (`N8N_WEBHOOK_SECRET`), já que
qualquer JWT emitido com o `JWT_SECRET` antigo also invalida.

## Pipeline de extração via WhatsApp (`prompt-whatsapp-claude-code.md`)

- **Seção 1 — `POST /extracoes-pendentes`**: ✅ implementada e testada
  ponta a ponta (match, mismatch de nome/CPF, telefone desconhecido, sem
  API key). Commit `52f7a7e`.
- **Seção 2 — pendente, é o próximo passo**:
  - `GET /extracoes-pendentes?status=PENDENTE` (lista a fila pro RH, com
    dados do colaborador + foto + JSON parseado).
  - `POST /extracoes-pendentes/:id/confirmar` (cria os `RegistroPonto`,
    reaproveitando a lógica do lançamento manual já existente).
  - `POST /extracoes-pendentes/:id/rejeitar`.
  - `POST /extracoes-pendentes/:id/vincular-colaborador` (casos
    `SEM_IDENTIFICACAO`).
  - Tela "Fila do WhatsApp" no front-end (seção 3 do prompt) — ainda nem
    começou, depende dos endpoints acima.

## Outros pendentes / avisos em aberto

- **Nenhum usuário cadastrado** na tabela `User` do banco de produção
  (`users: 0`) — os endpoints `@Roles('ADMIN')` não são utilizáveis até
  criar um usuário via `POST /auth/register` (ou seed).
- **n8n**: não foi confirmado nesta sessão se o workflow no n8n já foi
  configurado com `BACKEND_URL` e a credencial `x-api-key`
  (`N8N_WEBHOOK_SECRET`) — só validamos a conectividade de rede
  (`docker exec` → `wget`), não uma chamada real feita pelo workflow.
- **Git**: 2 commits locais (`f864263`, `52f7a7e`) à frente de
  `origin/main` — ainda **não foram enviados** (`git push`) pro GitHub.
- **Testes e2e** (`test/apuracao.e2e-spec.ts`) não rodam nesta VPS por
  falta de `.env.test` — gap pré-existente, não introduzido nesta sessão,
  mas vale resolver em algum momento.
- **JWT**: continua usando `JWT_SECRET` simétrico (não RS256), por decisão
  explícita de manter compatível com o código existente em vez de
  refatorar o `AuthModule`.
