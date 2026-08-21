# Contexto

O backend do Sistema de Ponto já está pronto (NestJS + Prisma + JWT),
rodando em `http://localhost:3000`, com Swagger em `http://localhost:3000/docs`.
Ele cobre: autenticação, CRUD de Jornadas e Colaboradores, lançamento manual
de registros de ponto, trocas de escala, e o motor de apuração
(`ApuracaoDiaria`) com os status `OK | ATRASO | HORA_EXTRA | FALTA | FOLGA |
INCONSISTENTE`.

**O que falta:** uma interface web para o RH usar no dia a dia (hoje só dá
pra testar via Swagger, o que não é utilizável por um usuário final).

**Importante sobre o público-alvo:** apenas o RH usa este sistema.
Colaboradores continuam batendo ponto no relógio mecânico físico (cartão de
papel) — isso não muda. O RH é quem digita os dados no sistema (ou faz
upload da foto do cartão para extração automática, ver seção 3). Não é
necessário criar login/tela para colaboradores nem para supervisores nesta
fase.

# 1. Stack do front-end

- **React + TypeScript + Vite** (SPA simples, sem necessidade de SSR/Next.js
  já que é uma ferramenta interna).
- **shadcn/ui + Tailwind CSS** para os componentes (tabelas, formulários,
  modais, date pickers) — visual limpo de painel administrativo, sem
  necessidade de design elaborado.
- **TanStack Query (React Query)** para chamadas à API e cache.
- **React Router** para navegação entre telas.
- **React Hook Form + Zod** para formulários e validação.
- Autenticação: guardar o JWT retornado pelo `POST /auth/login` (localStorage
  ou cookie), anexar no header `Authorization: Bearer` em todas as
  chamadas, redirecionar para `/login` se receber 401.

Se o backend já tiver alguma preferência de estrutura de pastas monorepo
(ex.: `apps/api` e `apps/web`), seguir esse padrão. Caso contrário, criar
uma pasta `web/` na raiz do projeto, separada do backend.

# 2. Telas necessárias

## 2.1 Login
Tela simples de e-mail/senha, chamando `POST /auth/login`.

## 2.2 Dashboard (tela inicial)
Visão geral: total de colaboradores ativos, pendências do mês corrente
(`GET /admin/apuracao/pendencias`), atalho para processar apuração do mês.

## 2.3 Colaboradores
- Listagem com busca/filtro por nome, setor, jornada.
- Criar/editar colaborador (nome, CPF, setor, jornada vinculada, e se
  `ESCALA_12X36`, a data-base da escala).
- Não implementar exclusão física — usar o campo `ativo` (soft delete),
  se existir no schema; caso não exista, adicionar.

## 2.4 Jornadas
- Listagem e CRUD das jornadas cadastradas (tipo, horários, tolerâncias,
  configuração de adicional noturno).
- Esta tela é usada raramente (configuração inicial), pode ser mais simples.

## 2.5 Lançamento de Ponto — a tela mais usada, priorizar
Duas formas de entrada, na mesma tela (abas ou toggle):

**a) Manual:** selecionar colaborador + data, digitar até 4 horários
(Entrada 1, Saída 1, Entrada 2, Saída 2), campo de observação livre (ex.:
"Médico", "Compras Firma" — como aparece escrito à mão nos cartões reais).
Botão salvar chama `POST /registros-ponto` (ou o endpoint equivalente que
o backend expõe).

**b) Por foto do cartão:** ver seção 3 abaixo — fluxo de upload + revisão.

## 2.6 Trocas de Escala
Formulário simples: colaborador original, colaborador substituto, data,
motivo, nome do supervisor que informou. Chama `POST /trocas-escala`.
Listagem das trocas do mês, com indicação visual de quais já foram
confirmadas pelo RH (`confirmadoPeloRH`).

## 2.7 Apuração / Relatório mensal
- Selecionar colaborador + mês → mostrar o "espelho de ponto" (tabela dia a
  dia: entrada/saída, total trabalhado, status, alertas), usando
  `GET /admin/apuracao`.
- Botão "Processar apuração do mês" → chama
  `POST /admin/apuracao/processar?mes=`.
- Tela de pendências (`GET /admin/apuracao/pendencias`) destacando em
  vermelho/amarelo os dias `INCONSISTENTE` e `FALTA`, para o RH revisar
  no fechamento — esta é a tela que resolve o problema original do
  projeto (o RH não precisa mais caçar inconsistências manualmente).
- Exportar para Excel/CSV o relatório do mês (usar biblioteca simples tipo
  `xlsx` ou `papaparse` no front, ou um endpoint de export no backend, o
  que for mais simples de implementar dado o que já existe).

# 3. Extração automática de dados via foto do cartão

Esta é uma funcionalidade nova, que ainda não existe no backend — precisa
ser criada tanto a lógica de extração quanto a tela de uso.

## 3.1 Formato do cartão (referência real)
O cartão físico é como uma "carteira de ponto" impressa por relógio
mecânico, contendo: nome do colaborador, CPF, mês/ano, setor, horário
contratual, e uma tabela por quinzena com colunas `Dia | ENT | SAI | ENT |
SAI | ENT | SAI | Total`, uma linha por dia do mês (1 a 15 na primeira
quinzena, 16 ao fim no segunda). Observações manuscritas (ex.: "Médico",
"Compras Firma") podem aparecer ao lado de algum dia.

## 3.2 Endpoint novo no backend
Criar `POST /registros-ponto/extrair-foto` (multipart/form-data, campo
`foto`), protegido por auth, que:

1. Recebe a imagem do cartão.
2. Envia para a API da Anthropic (Claude, com suporte a visão) com um
   prompt estruturado pedindo para extrair, para cada dia visível na
   imagem: `dia`, `entrada1`, `saida1`, `entrada2`, `saida2`, `observacao`
   (todos como strings no formato `HH:MM`, ou `null` quando o campo estiver
   vazio no cartão), além dos dados do cabeçalho (`nome`, `cpf`,
   `mesReferencia`).
3. Pede que a resposta do modelo venha **apenas em JSON**, sem texto antes
   ou depois, para facilitar o parse.
4. Retorna esse JSON estruturado para o front-end — **sem gravar nada no
   banco ainda**. A gravação definitiva só acontece depois que o RH revisar
   e confirmar (ver 3.3).
5. Usar a variável de ambiente `ANTHROPIC_API_KEY` (adicionar ao
   `.env.example`). Se não estiver configurada, retornar erro claro
   explicando que a extração automática requer essa chave.

## 3.3 Fluxo na tela de Lançamento de Ponto (aba "Por foto")
1. RH seleciona o colaborador (ou deixa em branco se o nome no cartão vai
   ajudar a identificar — mas a extração não deve tentar casar
   automaticamente com um `Colaborador` do banco; quem escolhe é o RH).
2. RH faz upload da foto (ou tira foto pelo celular, se acessado via
   navegador mobile — usar `<input type="file" accept="image/*"
   capture="environment">`).
3. Sistema chama o endpoint de extração e exibe uma **tabela editável**
   com os dias extraídos (dia, 4 horários, observação), permitindo ao RH
   corrigir qualquer campo antes de confirmar — a extração por IA pode
   errar, então a revisão humana é obrigatória, nunca salvar direto sem
   confirmação.
4. Ao confirmar, o front-end envia os registros revisados um a um (ou em
   lote, se o backend suportar) para o endpoint normal de lançamento
   (`POST /registros-ponto`), associados ao colaborador selecionado.
5. Mostrar mensagem de sucesso com quantos dias foram lançados.

# 4. O que NÃO fazer nesta fase
- Não criar telas ou login para colaboradores/supervisores.
- Não implementar ponto eletrônico via geolocalização, biometria ou
  qualquer mecanismo de "bater ponto pelo celular" para os colaboradores —
  o cartão mecânico físico continua sendo o registro oficial.
- Não se preocupar com conformidade da Portaria 671/2021 (REP-P/REP-A) —
  este sistema é uma ferramenta de apoio interno, não o registro legal.

# 5. Qualidade
- Tratar estados de loading/erro em todas as chamadas à API (especialmente
  a extração por foto, que pode demorar alguns segundos e pode falhar).
- Responsivo o suficiente para uso em tablet/celular pelo RH (útil para
  tirar foto do cartão direto do celular), mas não precisa ser um app
  mobile nativo.
- Se alguma decisão de UX ou regra de negócio não estiver clara, parar e
  perguntar antes de assumir — em especial os detalhes do fluxo de revisão
  da extração por foto (seção 3.3), que é a parte mais sensível a erro.
