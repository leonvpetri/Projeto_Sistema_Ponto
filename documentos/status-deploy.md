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
Lançamento de Ponto (aba manual) + Trocas de Escala. **Etapa 2 —
pronta e testada (2026-08-21)**: Dashboard + Apuração/Relatório +
export CSV. **Etapa 3 — pronta e testada (2026-08-21)**: extração de
foto (aba "Por foto") + Fila do WhatsApp. **Fase 3 está completa** —
as 3 etapas combinadas com o usuário foram entregues.

### Etapa 2 — Dashboard + Apuração/Relatório

- **Backend**: `periodoDoMes` extraído para
  `src/apuracao/date-utils.ts` (era duplicado em 2 lugares, ia virar
  3) e reusado em `apuracao.service.ts`, `trocas-escala.controller.ts`
  e no novo suporte a `?mes=` de `GET /registros-ponto` (que antes só
  aceitava `?data=` de um dia — agora aceita um dos dois, 400 se
  vier os dois ou nenhum). `GET /colaboradores` e
  `GET /colaboradores/:id` liberados para `RH` também (só leitura —
  criar/editar/desativar continua `ADMIN`), decorators movidos de
  classe para método em `colaboradores.controller.ts`.
- **Frontend**: nova feature `web/src/features/apuracao/`. Dashboard
  (`/dashboard`, agora a tela inicial pós-login) com contagem de
  colaboradores ativos + pendências do mês + atalho de fechamento
  (só ADMIN). Tela de Apuração (`/apuracao`) com abas Espelho de
  Ponto (cruza `GET /admin/apuracao` com `GET /registros-ponto?mes=`
  no cliente para mostrar horário real de cada batida, não só
  totais) e Pendências do mês; export CSV client-side (serializer
  manual, sem dependência nova).
- **Testado visualmente** (Playwright, reinstalado e removido de novo
  só para esta verificação): espelho de ponto confirmado mostrando
  batidas reais e até detectando corretamente uma inconsistência
  (troca de escala sem bater com o dia trabalhado, criada durante o
  teste da Etapa 1) com o alerta certo. RH confirmado vendo as mesmas
  telas sem o botão de processar fechamento. Zero erros de console.

### Etapa 3 — extração por foto + Fila do WhatsApp

- **Model novo `ObservacaoDia`** (`colaboradorId` + `data` + `texto`,
  unique nos dois primeiros) — decisão tomada com o usuário nesta
  sessão para resolver o campo "observação" (pendente desde a Etapa
  1: um dia pode ter observação sem nenhuma batida, por isso é
  independente de `RegistroPonto`). Migration
  `20260821144259_add_observacao_dia`. Novo módulo
  `src/observacoes-dia/` (`POST /observacoes-dia`, upsert, ADMIN+RH).
- **`POST /registros-ponto/extrair-foto`** (novo, multipart, ADMIN+RH):
  usa `@anthropic-ai/sdk` (**nova dependência**) com o modelo
  `claude-opus-5` para ler a foto do cartão e devolver JSON
  estruturado (`nome`, `cpf`, `mesReferencia`, `dias: [...]`) — **não
  grava nada no banco**, só retorna pro front revisar. Se
  `ANTHROPIC_API_KEY` não estiver configurada, retorna 503 com
  mensagem clara. `.env.example` criado na raiz (não existia).
- **`ConfirmarExtracaoDto`** (Fila do WhatsApp) ganhou `observacoes?`
  opcional, upsertadas na mesma transação que cria os `RegistroPonto`.
- **Frontend**: componente compartilhado
  `web/src/components/cartao-ponto/` (`DiaTableEditor` + conversores
  dia→registros/observações) reusado tanto pela aba "Por foto" (nova,
  em Lançamento de Ponto) quanto pela nova tela "Fila do WhatsApp"
  (`/fila-whatsapp`, lista estilo inbox com miniatura da foto, badge
  "Não identificado"/alerta de conferência, diálogo de revisão com
  vincular colaborador quando `SEM_IDENTIFICACAO`).
- ✅ **Risco de integração com o n8n — verificado e corrigido
  (2026-08-21)**: exportei (leitura, `n8n export:workflow`) o
  workflow real `iuZvpxLHZgkKcH6a` ("Ponto - Extração de Cartão via
  WhatsApp (Zernio)") direto da instância n8n desta VPS pra comparar
  o prompt real do nó "Extrair dados via Claude (visão)" com o que o
  parser do front-end esperava. Achei uma divergência real: o n8n
  manda `mesReferencia` como `"MM/AAAA"` (ex.: `"08/2026"`), não ISO
  `"YYYY-MM"` como o parser assumia — isso geraria datas quebradas
  tipo `"08/2026-21"` em vez de `"2026-08-21"` pra cada dia extraído.
  **Corrigido** em
  `web/src/features/extracoes-pendentes/parse-dados-extraidos.ts`
  (`normalizarMesReferencia`, aceita os dois formatos). O resto do
  schema (`nomeColaborador`, `cpf`, `dias: [{dia: number, entrada1,
  saida1, entrada2, saida2, observacao}]`) já batia com o esperado.
  Revalidei rodando o parser corrigido contra um payload no formato
  real (via `POST /extracoes-pendentes` de teste) — datas corretas.
  ⚠️ Nota à parte: o workflow está `active: false` no n8n no momento
  desta verificação — não está recebendo mensagens reais do WhatsApp
  ainda, só foi possível confirmar o schema porque o workflow existe
  configurado, não porque rodou de verdade ponta a ponta com uma foto
  real do WhatsApp.
- **Testado de ponta a ponta com chamada real da API Anthropic**
  (custou uma fração de centavo): gerei um cartão de ponto sintético
  (screenshot de HTML via Playwright) com nome/CPF/3 dias incluindo um
  dia só com observação "Médico" sem nenhuma batida — a extração leu
  tudo corretamente. Testado visualmente também: aba "Por foto"
  completa (upload → extração → edição → confirmar → registros e
  observação confirmados no banco) e Fila do WhatsApp completa (criar
  pendência de teste via endpoint do n8n → abrir na fila → vincular
  colaborador → confirmar → sumiu da fila). Zero erros de console.
- Ferramentas de teste (Playwright/Chromium, ~650MB) instaladas e
  removidas de novo ao final, como nas etapas anteriores.

- **Stack**: React + TypeScript + Vite + shadcn/ui (versão nova,
  estilo `base-nova`, sobre Base UI em vez de Radix) + Tailwind v4 +
  TanStack Query + React Router + React Hook Form + Zod. Pacote
  separado em `web/` (não é npm workspace), com seu próprio
  `package.json`.
- **Decisões tomadas com o usuário**: campo "observação" ficou fora do
  lançamento manual nesta etapa (backend não tinha onde guardar —
  resolvido na Etapa 3 com o model `ObservacaoDia`, ver abaixo); sem
  botão de excluir jornada na UI; lista de Trocas de Escala é
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
- **n8n**: o workflow (`iuZvpxLHZgkKcH6a`, "Ponto - Extração de Cartão
  via WhatsApp (Zernio)") existe configurado nesta instância n8n
  compartilhada, com o nó de extração via Claude e o envio pro backend
  já apontando pra `{{ $env.BACKEND_URL }}/extracoes-pendentes` com
  header de API key — mas está **`active: false`**, ou seja, não está
  recebendo mensagens reais do WhatsApp ainda. Precisa ser ativado (e
  o `BACKEND_URL`/credencial conferidos de verdade) antes do pipeline
  funcionar ponta a ponta em produção.
- **Git**: 7 commits locais (`f864263`, `52f7a7e`, `1d0b5c1`, `7bec5dc`,
  `0c580e2`, `5c08640`, `09a23e1`) à frente de `origin/main` — ainda
  **não foram enviados** (`git push`) pro GitHub.
- **Testes e2e**: resolvido — `.env.test` criado (gitignorado, secrets
  fake só para teste) e bug de cleanup do `test/setup-e2e.ts` corrigido.
  Rodar com `npm run test:e2e`.
- **JWT**: continua usando `JWT_SECRET` simétrico (não RS256), por decisão
  explícita de manter compatível com o código existente em vez de
  refatorar o `AuthModule`.
