# Sistema de Ponto Eletrônico

Sistema de ponto eletrônico para uma empresa com 3 tipos de jornada de
trabalho coexistindo. Stack: NestJS + Prisma + TypeScript + SQLite (dev) /
PostgreSQL (prod) + JWT + Vitest.

Arquivos de referência na raiz do projeto (spec, não código final):
- `prompt-claude-code.md` — especificação completa das regras de negócio.
- `schema.prisma` — modelo de dados de referência (mergeado em `prisma/schema.prisma`).
- `engine.js` — protótipo funcional do motor de apuração (portado para `ApuracaoService`).
- `demo.js` — 4 cenários de teste do motor (portados para Vitest).

## Regras de negócio essenciais

3 tipos de jornada (`TipoEscala`):
- **PADRAO_5X2** — seg-sex, horário fixo, sem sábado.
- **COMPENSADO_SABADO** — seg-sex, janela maior. O intervalo de almoço muda
  de horário mas a **duração é sempre fixa** (ex.: 1h30) — validar pela
  duração real (saída 1º turno → entrada 2º turno), nunca por horário fixo.
- **ESCALA_12X36** — 12h trabalho / 36h folga, calculado automaticamente a
  partir de uma `dataBaseEscala12x36` por colaborador (dia par/ímpar), nunca
  cadastrado manualmente dia a dia.

**Adicional noturno**: 22h–5h, hora reduzida (CLT Art. 73: 52min30s = 1h
paga), percentual configurável por jornada.

**Troca de escala**: fluxo informal (colaborador avisa supervisor → RH lança
no fechamento do mês, sem aprovação prévia bloqueante). Se o motor encontra
um dia trabalhado fora do padrão sem `TrocaEscala` registrada, marca
`INCONSISTENTE` como pendência para o RH.

**Origem dos dados**: hoje só lançamento manual pelo RH (cartão mecânico
digitado); campo `origem` em `RegistroPonto` já prevê batida futura via
app/web.

## Arquitetura

- `AuthModule` — login JWT, roles (`ADMIN`/`RH`).
- `JornadasModule`, `ColaboradoresModule`, `RegistrosPontoModule`,
  `TrocasEscalaModule` — CRUD básico.
- `ApuracaoModule` — `ApuracaoService` (motor, porta fiel de `engine.js`) +
  endpoints administrativos de fechamento mensal
  (`/admin/apuracao/processar`, `/admin/apuracao`, `/admin/apuracao/pendencias`).

`ApuracaoDiaria` é sempre gerada pelo motor (upsert por colaborador+data),
nunca editada diretamente — correções passam por `AjustePonto`.

## Convenções

- DTOs validados com `class-validator`.
- Endpoints documentados via `@nestjs/swagger`.
- Endpoints administrativos protegidos com `@Roles('ADMIN')`.
- Testes com Vitest (unitários no `ApuracaoService`, E2E com supertest).
- Nomes de models/campos em português, seguindo o schema de referência.

## Regra importante

Se alguma regra de negócio parecer ambígua durante o desenvolvimento, parar
e perguntar antes de assumir comportamento — essas regras vieram de
conversas reais com o RH e precisam ficar corretas.
