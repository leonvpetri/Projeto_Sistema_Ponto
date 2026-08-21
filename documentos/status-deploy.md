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
- **Seção 2 — revisão do RH**: ✅ implementada e coberta por e2e (5 casos:
  match, mismatch, sem-identificação→vincular→confirmar, dupla-revisão
  bloqueada, roles ADMIN/RH). Commit `7bec5dc`.
  - `GET /extracoes-pendentes?status=` (status opcional; inclui
    `colaborador` e `dadosExtraidos` já parseado).
  - `POST /extracoes-pendentes/:id/confirmar` — body `{ registros:
    [{dataHora, tipo}] }` (RH pode corrigir as batidas antes de
    confirmar); cria `RegistroPonto` com `origem: IMPORTACAO_FOTO`,
    marca `CONFIRMADA`. **Esse shape de body foi uma decisão minha, não
    da spec** — não há front-end neste repo ainda para validar o
    contrato; se a Seção 3 já tinha outra ideia, ajustar antes de
    seguir.
  - `POST /extracoes-pendentes/:id/rejeitar` — `{ motivoRejeicao }`.
  - `POST /extracoes-pendentes/:id/vincular-colaborador` — só para
    `SEM_IDENTIFICACAO`, recalcula `conferenciaOk`.
  - Guardas: 409 se já `CONFIRMADA`/`REJEITADA`, 400 se confirmar sem
    colaborador vinculado.
- **Seção 3 — tela "Fila do WhatsApp" no front-end**: não começou,
  depende dos endpoints acima (prontos) e do front-end existir (ver
  Fase 3 abaixo — a Etapa 1 do front-end acabou de ficar pronta, então
  esta seção passa a ser desbloqueada, mas ainda não foi feita).

## Fase 3 — Front-end (`prompt-frontend-claude-code.md`)

Combinado com o usuário em 3 etapas. **Etapa 1 — pronta e testada
(2026-08-21)**: scaffold + auth + Colaboradores + Jornadas +
Lançamento de Ponto (aba manual) + Trocas de Escala. Etapa 2
(Dashboard + Apuração/Relatório + export) e Etapa 3 (extração por
foto + Fila do WhatsApp — precisa de `ANTHROPIC_API_KEY`, ainda não
configurada) ficam para sessões futuras.

- **Stack**: React + TypeScript + Vite + shadcn/ui (versão nova,
  estilo `base-nova`, sobre Base UI em vez de Radix) + Tailwind v4 +
  TanStack Query + React Router + React Hook Form + Zod. Pacote
  separado em `web/` (não é npm workspace), com seu próprio
  `package.json`.
- **Decisões tomadas com o usuário**: sem campo "observação" no
  lançamento manual (backend não tem onde guardar — fica pendente pra
  Etapa 3, que já vai precisar resolver isso pra extração por foto);
  sem botão de excluir jornada na UI; lista de Trocas de Escala é
  somente leitura (confirmação é definida na criação, sem
  `PATCH /trocas-escala/:id`).
- **Testado visualmente** (Playwright headless, instalado e removido
  só para esta sessão de verificação — 24 interações reais: login,
  CRUD de jornada/colaborador, campo condicional 12x36, lançamento
  manual com aviso de duplicata, troca de escala, e a separação de
  permissão ADMIN vs RH incluindo acesso direto por URL). Zero erros
  de console na versão final.
- **Setup de dev local criado nesta sessão** (não existia antes):
  `.env` na raiz (gitignorado) com `DATABASE_URL`, `JWT_SECRET`
  próprios e `PORT=3001` (porta 3000 já está ocupada nesta VPS pelo
  próprio Easypanel — **não usar 3000 para o backend em dev**);
  `prisma/dev.db` seedado (`admin@empresa.com`/`admin123`, ADMIN) +
  um usuário RH de teste (`rh@empresa.com`/`rh123456`) criado via
  `/auth/register`, não commitado em lugar nenhum. `web/.env.local`
  aponta `VITE_API_BASE_URL=http://localhost:3001`.

**Bugs reais encontrados e corrigidos ao montar o front-end (nenhum é
específico do React — todos afetam qualquer uso do backend fora do
container Docker de produção):**
1. **`JWT_SECRET` do `.env` era ignorado em dev** — `AuthModule`
   chama `JwtModule.register({secret: process.env.JWT_SECRET...})` na
   avaliação do import (antes do `ConfigModule.forRoot()` rodar o
   `dotenv` dentro do corpo do `AppModule`), então login assinava com
   o fallback `'dev-secret-change-me'` enquanto o `JwtStrategy`
   (instanciado depois pelo Nest) validava com o valor real do `.env`
   — todo token emitido localmente dava 401 em qualquer rota
   protegida. Nunca apareceu antes porque prod usa `-e` do Docker
   (env real, presente antes do Node subir) e os testes e2e chamam
   `dotenv.config()` manualmente no `setup-e2e.ts` antes de importar a
   app. **Fix**: `import 'dotenv/config'` como a primeiríssima linha
   de `src/main.ts`.
2. **`tsconfig.json` da raiz não excluía `web/`** — sem
   `exclude`, o `nest start --watch` tentava type-checkar o projeto
   Vite inteiro junto (618 erros, JSX/import.meta incompatíveis).
   **Fix**: `"exclude": ["node_modules", "dist", "web"]`.
3. **`test/setup-e2e.ts` rodando os 2 arquivos e2e em paralelo**
   colidia no mesmo `prisma/test.db` (unlink+push concorrente).
   **Fix**: `fileParallelism: false` no `vitest.e2e.config.ts`.
4. `npm run seed` chamava `tsx prisma/seed.ts` direto, sem carregar
   `.env` — **fix**: trocado para `prisma db seed` (que carrega via
   `prisma.config.ts`).
5. Componentes `Select` do shadcn/Base UI mostravam o **valor bruto**
   (UUID do colaborador/jornada, ou o enum `PADRAO_5X2`) em vez do
   rótulo — `SelectValue` do Base UI não resolve isso sozinho, precisa
   de uma função de renderização (`<SelectValue>{(value) => label}
   </SelectValue>`). Corrigido em todos os selects (colaborador,
   jornada, tipo de jornada, filtros).

**Dois gaps pré-existentes corrigidos ao implementar a Seção 2:**
- Havia um `GET /extracoes-pendentes` leftover de sessão anterior em
  `src/apuracao/extracoes.controller.ts` (não documentado em nenhuma
  spec, retornava pendências de *apuração*, não a fila do WhatsApp) que
  colidia com a rota da Seção 2. Removido — o endpoint spec'd
  `/admin/apuracao/pendencias` já cobre esse caso.
- `CreateColaboradorDto` não aceitava `telefone`, embora o schema já
  tivesse o campo — sem isso não dava pra cadastrar o telefone que
  identifica quem manda a foto. Adicionado (opcional).
- `test/setup-e2e.ts` apagava `./test.db` na raiz, mas o Prisma resolve
  paths relativos de SQLite em relação a `prisma/`, então a limpeza
  nunca funcionava entre execuções — corrigido. Criado um `.env.test`
  local (gitignorado) para viabilizar rodar os e2e nesta VPS, resolvendo
  o gap "e2e não rodam por falta de .env.test" mencionado abaixo.

## Outros pendentes / avisos em aberto

- **Nenhum usuário cadastrado** na tabela `User` do banco de produção
  (`users: 0`) — os endpoints `@Roles('ADMIN')` não são utilizáveis até
  criar um usuário via `POST /auth/register` (ou seed).
- **n8n**: não foi confirmado nesta sessão se o workflow no n8n já foi
  configurado com `BACKEND_URL` e a credencial `x-api-key`
  (`N8N_WEBHOOK_SECRET`) — só validamos a conectividade de rede
  (`docker exec` → `wget`), não uma chamada real feita pelo workflow.
- **Git**: 4 commits locais (`f864263`, `52f7a7e`, `1d0b5c1`, `7bec5dc`)
  à frente de `origin/main` — ainda **não foram enviados** (`git push`)
  pro GitHub.
- **Testes e2e**: resolvido — `.env.test` criado (gitignorado, secrets
  fake só para teste) e bug de cleanup do `test/setup-e2e.ts` corrigido.
  Rodar com `npm run test:e2e`.
- **JWT**: continua usando `JWT_SECRET` simétrico (não RS256), por decisão
  explícita de manter compatível com o código existente em vez de
  refatorar o `AuthModule`.
