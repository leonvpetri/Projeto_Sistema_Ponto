# Status do deploy — 2026-08-21

Snapshot de fim de sessão, pra retomar amanhã sem precisar reinvestigar tudo
de novo. Isto é um doc de status (estado muda), não uma spec — as specs
ficam em `prompt-deploy-vps-claude-code.md` e `prompt-whatsapp-claude-code.md`,
nesta mesma pasta.

## O que está no ar

- **Container**: `ponto-backend`, rodando a imagem `ponto-backend:latest`
  (buildada localmente nesta VPS a partir do `Dockerfile` na raiz,
  **rebuildada em 2026-08-24** com Afastamento + fix de timezone +
  `TZ=UTC`, commit `c84b350` — ver seção "Afastamento + fix de
  timezone: redeployado" abaixo — e novamente **rebuildada em
  2026-08-24 à noite** com o fix de `parseDataHoraLiteralUTC`, commit
  `211316a` — ver seção "Fix de timezone na criação de RegistroPonto"
  no fim deste arquivo).
- **Rede Docker**: `easypanel-artefinal` (mesma rede overlay do n8n,
  `artefinal_n8n`). URL interna: `http://ponto-backend:3000`.
  **Temporariamente** também publicada em `127.0.0.1:3002` (host) para
  testes do front-end via túnel SSH — remover essa publicação (recriar
  sem `-p`) quando os testes acabarem.
- **Restart policy**: `unless-stopped`.
- **Banco**: SQLite em `/home/claude/ponto-backend-data/prod.db` (bind
  mount do host para `/app/data/prod.db` no container) — sobrevive a
  rebuild/restart do container. 5 migrations aplicadas: `20260819180120_init`,
  `20260820190644_add_extracao_pendente`,
  `20260821144259_add_observacao_dia`,
  `20260824125925_simplify_tipo_escala_and_merge_carga_12x36` e
  `20260824161826_add_afastamento` (esta última aplicada em
  2026-08-24, ver seção própria abaixo). Dados confirmados intactos
  depois do redeploy de 2026-08-24 (segunda leva): 2 `ExtracaoPendente`
  de teste, 1 usuário, 1 colaborador (Marcia Ferreira da Cunha,
  PADRAO_5X2), 0 jornadas.
- Testado ponta a ponta: `GET /docs` acessível de dentro do container do
  n8n via `docker exec <n8n> wget http://ponto-backend:3000/docs`
  (retorna 200) e localmente via `curl 127.0.0.1:3002/docs`.

## Secrets

**Rotacionados em 2026-08-21** durante o redeploy (incidente, não
planejado — ver detalhes abaixo). `JWT_SECRET` e `N8N_WEBHOOK_SECRET`
atuais são novos, gerados com `openssl rand -hex 32`, passados como `-e`
no `docker run` — **não estão em nenhum arquivo no repositório nem em
texto plano na VPS fora do ambiente do container**.

Se ainda não guardou os dois valores atuais em um gerenciador de senhas,
pegue o histórico desta conversa (2026-08-21) antes que a sessão expire.
**Pendência real**: o `N8N_WEBHOOK_SECRET` novo ainda **não foi
atualizado na credencial do n8n** (workflow `iuZvpxLHZgkKcH6a`) — fazer
isso antes de reativar aquele workflow, senão as chamadas pro backend
vão dar 401.

**O que causou a rotação**: ao tentar publicar a porta 3000 do host
(`-p 3000:3000`) pra permitir teste do front-end via túnel, o comando
bateu em "port already allocated" (3000 é do Easypanel, ver
`prompt-deploy-vps-claude-code.md`/memória de infra) — mas isso
aconteceu *depois* do container antigo já ter sido parado/removido no
mesmo script, e o container de substituição (que falhou ao iniciar,
ficou em estado `Created`) foi removido na limpeza antes de eu inspecionar
o env dele. Como os secrets só existiam no ambiente daquele container
(nunca em arquivo), foram perdidos. Impacto real foi baixo: 0 usuários
cadastrados (sem sessão pra invalidar) e o workflow do n8n já estava
inativo (sem tráfego real dependendo do webhook secret). Porta correta
usada depois: **3002** (3000 e 3001 já estavam ocupados nesta VPS — ver
`vps-shared-infra` na memória do projeto).

## Atualização 2026-08-24 — simplificação do TipoEscala

Commit `572d952`: enum `TipoEscala` perde `COMPENSADO_SABADO` (vira
`PADRAO_5X2` — mesma regra de negócio já era aplicada igual) e o campo
`cargaTurno12x36Min` é removido do model `Jornada` (mergeado em
`cargaDiariaEsperadaMin`, agora calculado automaticamente no front-end
a partir de entrada/saída/intervalo, com tratamento de virada de dia).
Migration `20260824125925_simplify_tipo_escala_and_merge_carga_12x36`
faz o data-fix (`UPDATE` de tipo e de valor) antes do `DROP COLUMN`.

Redeploy feito nesta VPS, mesma checkout usada tanto pra dev quanto
pra build da imagem prod:
1. Migration testada primeiro numa cópia descartável do `prod.db` (fora
   do bind mount, em `/tmp`) — aplicou sem erro.
2. Backup do `prod.db` real:
   `/home/claude/ponto-backend-data/prod.db.bak-20260824-pre-simplify-tipo-escala`.
3. Container antigo parado (`docker stop`) antes de rodar a migration
   contra o `prod.db` real, pra evitar concorrência de escrita com o
   schema antigo.
4. Migration aplicada contra o `prod.db` real — verificado via
   `PRAGMA table_info(Jornada)` que a coluna `cargaTurno12x36Min` saiu
   e os outros dados (`User`, `ExtracaoPendente`) continuam intactos.
5. Imagem rebuildada (`docker build -t ponto-backend:latest .`),
   container recriado com env/rede/mount/porta idênticos ao anterior
   (env capturado do container antigo pro arquivo antes do
   `stop`+`rm`, pra não repetir o incidente de perda de secret de
   2026-08-21).
6. Verificado no ar: `/docs` responde 200 tanto local (`127.0.0.1:3002`)
   quanto de dentro da rede Docker (via `docker exec` no container do
   n8n), sem erros nos logs.

**Achado importante**: a tabela `Jornada` (e `Colaborador`) em produção
está **vazia** (0 linhas) — nunca chegou a ser populada lá, só existe
no seed usado em dev local. Ou seja, não havia nenhuma jornada
`COMPENSADO_SABADO` real em produção pra essa migration converter; o
data-fix rodou como no-op no `prod.db` real (validado como funcional
na cópia de teste, que tinha o mesmo estado vazio). Produção ainda não
tem nenhuma jornada nem colaborador cadastrado — só 1 usuário e as 2
`ExtracaoPendente` de teste antigas.

## Atualização 2026-08-24 (continuação) — Afastamento + fix de timezone: redeployado

**Status: concluído.** `git push` feito (`origin/main` em `7a35bf0`) e
redeploy em produção feito, seguindo o mesmo processo de sempre
(migration testada em cópia descartável, backup do `prod.db` real em
`prod.db.bak-20260824193753-pre-afastamento`, container parado antes
da migration, imagem rebuildada, container recriado com env/rede/mount
capturados do anterior, porta `127.0.0.1:3002` preservada).

Verificado depois do redeploy:
- `PRAGMA table_info` confirma a migration `20260824161826_add_afastamento`
  aplicada (`Afastamento` criada, `ApuracaoDiaria` com as 2 colunas
  novas) e os dados existentes intactos (1 `Colaborador` — Marcia
  Ferreira da Cunha, sem `dataBaseEscala12x36` então não afetada pelo
  bug —, 1 `User`, 2 `ExtracaoPendente`).
- `docker exec ponto-backend printenv TZ` → `UTC` confirmado (o
  `ENV TZ=UTC` do Dockerfile pegou).
- `/docs` responde 200 local (`127.0.0.1:3002`) e internamente (via
  `docker exec` no container do n8n). Rotas de `/afastamentos`
  mapeadas nos logs, zero erros.
- **Não foi feito teste funcional autenticado contra a API de
  produção** — a senha atual do `admin@empresa.com` em prod não é a
  `admin123` do seed dev (o que é bom sinal: não é a credencial fraca
  que se suspeitava), e não tentei adivinhar. Verificação ficou no
  nível de schema/schema-migration/saúde do container, que já é sólido
  dado que o código foi testado a fundo em dev (Playwright + 19 testes
  e2e) antes deste redeploy. Se quiser um teste ponta a ponta real em
  produção, seria necessário logar com a senha real (via túnel SSH,
  não por aqui).

Commits desta leva: `7a74a25` (feature Afastamento) e `c84b350` (fix
de timezone + `TZ=UTC`), documentados abaixo.

- Commit `7a74a25` — model novo `Afastamento` (spec
  `prompt-afastamentos-claude-code.md`): distingue ausência
  justificada (férias/atestado/licença) de `FALTA` de verdade. Motor
  ganha status `AFASTAMENTO` (não conta pendência nem banco de horas)
  e trata sobreposição `Afastamento`+`RegistroPonto` no mesmo dia como
  `INCONSISTENTE` (não escolhe um dos dois). CRUD `/afastamentos`
  (RH+ADMIN) + tela "Afastamentos" no front-end. Migration nova:
  `20260824161826_add_afastamento` (aditiva: `CREATE TABLE` +
  `ADD COLUMN afastamentoTipo/afastamentoAbonado` em `ApuracaoDiaria`
  — sem `DROP`, mais simples que a de simplificação do `TipoEscala`).

- Commit `c84b350` — **bug real de timezone encontrado e corrigido**
  ao auditar o projeto inteiro por `new Date(` depois de um achado
  parecido no `Afastamento`: `Colaborador.dataBaseEscala12x36` era
  convertido com `new Date(string)` puro, que interpreta
  `"YYYY-MM-DD"` como meia-noite **UTC**. O cálculo de paridade
  par/ímpar do `ESCALA_12X36` (`diaEsperadoTrabalho` em
  `apuracao-engine.ts`) faz `data.getTime() - base.getTime()` sem
  nenhuma folga de janela — nesta VPS (UTC+2) isso **inverte o dia de
  trabalho/folga em 100% dos dias**, confirmado empiricamente. Nenhum
  colaborador 12x36 existe em produção ainda (só 1 colaborador,
  PADRAO_5X2, sem essa data) — **nenhum dado real foi corrompido**,
  mas o próximo 12x36 cadastrado do jeito antigo teria a escala
  inteira invertida silenciosamente. Mesmo problema também existia em
  `TrocaEscala.data` (dormente nesta VPS porque as queries que usam
  esse campo são sempre por janela `gte/lt`, que absorve fuso
  positivo — mas quebraria num host a oeste de UTC, ex. Brasil
  GMT-3). Os dois foram trocados para `parseDataISO`/`formatDataISO`
  (mesmo padrão de `Afastamento`/`ObservacaoDia`). `Dockerfile` ganhou
  `ENV TZ=UTC` como camada extra de proteção (não é o fix em si — o
  código já resolve sozinho). Teste e2e novo cobre o caminho real
  DTO→service→motor pra paridade do 12x36 (o teste unitário antigo só
  testava o motor isolado, sem passar pela camada que tinha o bug).
  Detalhes completos em memória do projeto
  (`date-only-fields-convention.md`).

**Único pendente real:** teste funcional autenticado em produção (item
acima) — precisa da senha real do `admin@empresa.com` de prod, que
esta sessão não tem. Fora isso, nada pela metade.

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
  funcionar ponta a ponta em produção. Credencial de API key desse node
  **já atualizada** (2026-08-21) com o `N8N_WEBHOOK_SECRET` novo — só
  falta ativar o workflow quando for hora de receber mensagens reais.
- **Git**: todos os commits foram enviados pro GitHub (`git push`),
  último push em 2026-08-24 (`211316a`, `main` sincronizado com
  `origin/main`).
- **Testes e2e**: resolvido — `.env.test` criado (gitignorado, secrets
  fake só para teste) e bug de cleanup do `test/setup-e2e.ts` corrigido.
  Rodar com `npm run test:e2e`.
- **JWT**: continua usando `JWT_SECRET` simétrico (não RS256), por decisão
  explícita de manter compatível com o código existente em vez de
  refatorar o `AuthModule`.

## Atualização 2026-08-24 (noite) — fix de timezone na criação de RegistroPonto

Commit `211316a`. Investigação disparada por um CSV que saiu com os
horários da Márcia deslocados em +3h — o dado gravado em produção
(auditado direto no `prod.db`) estava correto; o deslocamento
apareceu numa sessão separada testando "Lançamento por Foto" contra
um backend local sem `TZ=UTC`.

**Causa**: os 3 fluxos que criam `RegistroPonto` (lançamento manual,
lançamento por foto — mesmo endpoint `POST /registros-ponto` — e
confirmar da Fila do WhatsApp) sempre montaram o horário do mesmo
jeito no front-end (`"YYYY-MM-DDTHH:mm:00"`, sem timezone). Os 2
pontos de escrita no backend (`registros-ponto.service.ts` e
`extracoes-pendentes.service.ts`) faziam `new Date(stringSemZ)`, que
o motor JS interpreta como hora local do *processo*, não como UTC
literal — só dava certo em produção porque o `Dockerfile` fixa
`ENV TZ=UTC`; em qualquer host sem essa variável (dev local, outra
sessão) o horário digitado saía deslocado pelo fuso do host.

**Fix**: `parseDataHoraLiteralUTC()` novo em
`src/apuracao/date-utils.ts` (mesma família de `parseDataISO`) usa
`Date.UTC(...)` explicitamente pra strings sem timezone — não
depende mais do TZ do processo. Aplicado nos 2 pontos de escrita.

**Auditoria de dado real**: os 40 `RegistroPonto` com
`origem = IMPORTACAO_FOTO` já existentes em produção vêm todos de
uma única `ExtracaoPendente CONFIRMADA` (Fila do WhatsApp, sempre
rodou dentro do container = sempre UTC) — nenhum dado precisou de
correção manual.

**Testes**: unitário (`date-utils.spec.ts`, varia `TZ` do processo e
confirma que o resultado não muda) + e2e novo
(`registro-ponto-timezone.e2e-spec.ts`, cobre os 3 fluxos). Validado
que o e2e pega a regressão de verdade: revertendo o fix (`git
stash`) nesta VPS (CEST, UTC+2) o teste falha com -2h de
deslocamento.

**Redeploy**: sem migration nova (fix só de código). Backup do
`prod.db` real feito por precaução
(`prod.db.bak-20260824232917-pre-timezone-fix-redeploy`), imagem
rebuildada, container recriado com env/rede/mount/porta idênticos.
Verificado no ar: `/docs` 200 local e via rede do n8n, `TZ=UTC`
confirmado no container, `prisma migrate status` "up to date".

**Limpeza feita na mesma sessão** (não relacionada ao bug, lixo de
sessão anterior): processo `npm run dev` do Vite (porta 5173, rodando
desde 21/08) e um `npm run start:dev`/`nest start --watch` esquecido
na porta 3001 foram encerrados; `prisma/dev.db` e `prisma/test.db`
removidos (só tinham fixtures de teste, gitignorados, regeneráveis
via `prisma db push` + seed).
