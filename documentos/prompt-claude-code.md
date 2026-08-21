# Contexto

Este projeto é um Sistema de Ponto Eletrônico baseado no repositório
`sistema-de-ponto` (NestJS + Prisma + TypeScript + PostgreSQL/SQLite + JWT).
A base já existe no repositório, mas precisa ser estendida para suportar
regras de negócio reais da empresa, descritas abaixo.

Nesta pasta há 3 arquivos de referência que você deve usar como
especificação, não como código final a ser copiado literalmente:

- `schema.prisma` — modelo de dados já desenhado para as regras de negócio
  descritas abaixo. Use como base para o `prisma/schema.prisma` do projeto,
  fazendo merge com o schema que já existe no repositório (mantenha models
  de auth/usuário existentes, adicione/ajuste os models de ponto).
- `engine.js` — protótipo funcional (JavaScript puro, sem dependências) da
  lógica do motor de apuração, já testado e validado com dados reais.
  Portar para TypeScript como um `ApuracaoService` do NestJS, mantendo a
  mesma lógica.
- `demo.js` — 4 cenários de teste que validam o motor. Portar esses mesmos
  cenários para testes automatizados (Vitest, seguindo o padrão de testes
  já usado no projeto).

# Regras de negócio (importante seguir exatamente)

A empresa tem 3 tipos de jornada coexistindo:

1. **PADRAO_5X2** — segunda a sexta, horário fixo (ex.: 7:30 às 16:30),
   sem trabalho aos sábados.

2. **COMPENSADO_SABADO** — segunda a sexta, janela maior (ex.: 08:00 às
   18:00) para compensar o sábado não trabalhado. O intervalo de almoço
   **muda de horário com frequência, mas a DURAÇÃO é sempre fixa (1h30)**.
   A validação do intervalo deve ser feita pela duração real
   (saída do 1º turno até entrada do 2º turno), nunca por um horário fixo
   esperado.

3. **ESCALA_12X36** — trabalha 12h, folga 36h, alternando. O sistema
   precisa calcular sozinho, a partir de uma data-base por colaborador,
   se um dia específico é "de trabalho" ou "de folga" — não pode depender
   de cadastro manual dia a dia.

**Adicional noturno**: aplica-se a quem trabalha entre 22h e 5h (comum nos
colaboradores 12x36 noturnos). Seguir a CLT Art. 73: a "hora noturna" é
reduzida (52min30s de relógio = 1h paga). O percentual do adicional (padrão
20%) deve ser configurável por jornada, pois pode variar por convenção
coletiva.

**Troca de escala entre colaboradores**: é comum, inclusive entre
funcionários do 5x2, colegas trocarem o dia de trabalho entre si. O fluxo
real da empresa é: o colaborador avisa o supervisor informalmente, o
supervisor reporta ao RH, e o RH lança a troca no sistema no fechamento do
mês (não há aprovação prévia bloqueante). Quando o motor encontra um dia em
que alguém trabalhou fora do seu padrão esperado e NÃO existe troca de
escala registrada, ele deve marcar o dia como `INCONSISTENTE` com um alerta
claro — isso vira uma pendência visível para o RH resolver no fechamento,
em vez de passar despercebido.

**Origem dos dados**: hoje o ponto é batido em um relógio mecânico físico
(cartão de papel), e o RH digita manualmente no fim do período. O sistema
deve suportar tanto lançamento manual pelo RH (digitando o cartão) quanto,
futuramente, batida direta pelo colaborador via app/web — o campo `origem`
em `RegistroPonto` já prevê isso.

# O que implementar

## 1. Schema e migrations
- Fazer merge do `schema.prisma` de referência com o schema existente do
  projeto (preservar autenticação/usuários já implementados).
- Rodar `npx prisma migrate dev` e garantir que sobe limpo.
- Criar um seed (`prisma/seed.ts`) com as 3 jornadas de exemplo (nomes,
  horários e tolerâncias como comentado no final do `schema.prisma`).

## 2. ApuracaoService (motor)
- Portar a lógica de `engine.js` para TypeScript, como um service do
  NestJS, recebendo dados via Prisma Client em vez de arrays soltos.
- Manter as mesmas funções/responsabilidades:
  - determinar se o dia é esperado de trabalho (considerando `Jornada` +
    padrão 12x36 + `TrocaEscala`)
  - somar total trabalhado pareando batidas
  - calcular minutos noturnos + hora reduzida
  - validar duração do intervalo (para `COMPENSADO_SABADO`)
  - gerar status (`OK | ATRASO | HORA_EXTRA | FALTA | FOLGA | INCONSISTENTE`)
    e lista de alertas
- Persistir o resultado em `ApuracaoDiaria` (upsert por colaborador+data).

## 3. Endpoints novos (além dos já existentes no projeto)
- `POST /jornadas` — CRUD de jornadas (admin).
- `POST /colaboradores` — CRUD de colaboradores, vinculando a uma jornada.
- `POST /trocas-escala` — registrar troca de escala (RH).
- `POST /admin/apuracao/processar?mes=2026-08` — roda o motor para todos
  os colaboradores no período informado, gerando/atualizando
  `ApuracaoDiaria` em lote (fechamento mensal).
- `GET /admin/apuracao?colaboradorId=&mes=` — retorna a apuração diária
  detalhada de um colaborador no período (o "espelho de ponto").
- `GET /admin/apuracao/pendencias?mes=` — lista todos os dias com status
  `INCONSISTENTE` ou `FALTA` no período, para o RH revisar no fechamento.

## 4. Testes
- Portar os 4 cenários de `demo.js` para testes unitários do
  `ApuracaoService` (Vitest), incluindo o caso de troca de escala
  registrada vs. não registrada.
- Ao menos um teste E2E cobrindo o fluxo completo: cadastrar colaborador
  → lançar registros de ponto → processar apuração → consultar relatório.

## 5. Observações de qualidade
- Seguir os padrões de código, lint e estrutura de pastas já existentes
  no repositório (não reinventar a arquitetura).
- Validar DTOs com `class-validator`/`zod`, como o resto do projeto já faz.
- Documentar os novos endpoints no Swagger (o projeto já usa
  `@nestjs/swagger`).
- Não é necessário implementar autenticação/roles do zero — já existe
  no projeto (JWT); só aplicar `@Roles('ADMIN')` ou equivalente nos
  endpoints administrativos.

Se algo nas regras de negócio parecer ambíguo ou incompleto durante a
implementação, pare e pergunte antes de assumir um comportamento — essas
regras vieram de conversas reais com o RH da empresa e precisam ficar
corretas.
