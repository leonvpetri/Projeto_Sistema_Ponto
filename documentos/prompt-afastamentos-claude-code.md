# Contexto

Testando a apuração real da colaboradora Márcia, foi identificado um gap:
dias em que ela está de licença/férias/atestado aparecem como `FALTA` na
apuração — o que está errado. `FALTA` deve significar "ausência sem
justificativa registrada", não qualquer ausência. É preciso um novo
conceito, `Afastamento`, para ausências planejadas/justificadas de um ou
mais dias.

**Fora de escopo, de propósito:** "Trabalho remoto/Home office" e
"Problema técnico" NÃO entram neste modelo — são dias em que a pessoa
trabalhou, só que fora do cartão mecânico, o que é um problema diferente
(registro de ponto sem o cartão físico) e não faz parte do desenho atual
do sistema (que assume o cartão mecânico como fonte de verdade). Não
implemente nada relacionado a isso agora.

**Também fora de escopo:** um tipo específico para "falta injustificada"
— isso já é o comportamento padrão do sistema (`status: FALTA`) quando não
há `RegistroPonto` nem `Afastamento` cobrindo o dia. Não criar
`TipoAfastamento` para esse caso.

# 1. Schema

```prisma
enum TipoAfastamento {
  // Legais (abonadas por lei, mas o abono real é decidido pelo RH — ver campo abonado)
  ATESTADO_MEDICO
  ATESTADO_ACOMPANHAMENTO
  LICENCA_NOJO
  LICENCA_GALA
  LICENCA_PATERNIDADE
  LICENCA_MATERNIDADE
  DOACAO_SANGUE
  CONVOCACAO_JUDICIAL
  SERVICO_ELEITORAL
  EXAME_PREVENTIVO
  DECLARACAO_COMPARECIMENTO
  FERIAS
  // Administrativas/internas
  FOLGA_COMPENSATORIA
  TREINAMENTO_CORPORATIVO
  // Não abonadas (tipicamente desconta salário/DSR)
  MOTIVO_PESSOAL
  PROBLEMA_TRANSPORTE
  TRANSITO
  PROBLEMA_CLIMATICO
  OUTRO
}

model Afastamento {
  id             String          @id @default(uuid())
  colaboradorId  String
  colaborador    Colaborador     @relation(fields: [colaboradorId], references: [id])

  dataInicio     DateTime
  dataFim        DateTime
  tipo           TipoAfastamento
  abonado        Boolean         // decidido pelo RH no lançamento (ver seção 3 sobre sugestão de valor padrão)
  motivo         String?         // obrigatório no backend quando tipo = OUTRO ou MOTIVO_PESSOAL

  registradoPor  String
  criadoEm       DateTime        @default(now())
  atualizadoEm   DateTime        @updatedAt

  @@index([colaboradorId, dataInicio, dataFim])
}
```

Adicione `AFASTAMENTO` como novo valor possível no enum/tipo de status
usado pela `ApuracaoDiaria` (junto com `OK | ATRASO | HORA_EXTRA | FALTA |
FOLGA | INCONSISTENTE` que já existem).

Adicione a relação inversa `afastamentos Afastamento[]` no model
`Colaborador`.

# 2. Motor de apuração

No cálculo diário (`calcularApuracaoDia` ou equivalente no service atual):
antes de decidir `FALTA` para um dia esperado de trabalho sem
`RegistroPonto`, verificar se existe um `Afastamento` do colaborador cuja
`dataInicio`/`dataFim` cubra aquela data. Se houver:
- `status` = `AFASTAMENTO` (não `FALTA`).
- Não deve contar como pendência a resolver (não aparece na lista de
  `INCONSISTENTE`/`FALTA` que o RH revisa no fechamento).
- Não entra no cálculo de banco de horas do dia (diferença = 0, não
  compara contra carga esperada).
- O resultado da apuração para esse dia deve incluir o `tipo` e o
  `abonado` do afastamento, para aparecer no relatório/CSV.

Se um dia tiver tanto `RegistroPonto` quanto `Afastamento` cobrindo a
mesma data (ex.: colaborador trabalhou parte do dia antes de sair de
atestado), trate como um caso a reportar (`INCONSISTENTE`, com alerta
descrevendo a sobreposição) em vez de escolher um dos dois arbitrariamente
— isso é raro o suficiente para não precisar de lógica automática, só
visibilidade pro RH decidir.

# 3. Endpoints (CRUD básico, protegido por JWT/role RH-ADMIN)

- `POST /afastamentos` — cria um afastamento. Body: `colaboradorId`,
  `dataInicio`, `dataFim`, `tipo`, `abonado`, `motivo` (opcional, exceto
  quando `tipo` for `OUTRO` ou `MOTIVO_PESSOAL`, aí é obrigatório —
  validar no backend, não só confiar no front-end).
- `GET /afastamentos?colaboradorId=&mes=` — lista, com filtros opcionais.
- `PATCH /afastamentos/:id` — permite editar (ex.: colaborador volta antes
  do previsto, RH ajusta `dataFim`).
- `DELETE /afastamentos/:id` — permite remover um lançamento feito por
  engano.

# 4. Front-end

Nova tela "Afastamentos" no menu lateral:
- Formulário: seletor de colaborador, data início, data fim, dropdown de
  tipo (as 18 categorias, agrupadas visualmente em "Legais",
  "Administrativas/Internas" e "Não abonadas", como na lista original),
  campo motivo (texto livre — sempre visível, mas o front-end deve marcar
  como obrigatório quando o tipo selecionado for `OUTRO` ou
  `MOTIVO_PESSOAL`).
- **Sugestão automática do campo `abonado`** ao escolher o tipo (o RH pode
  mudar manualmente depois):
  - `true` (sugerido): todas as categorias "Legais" listadas acima, mais
    `FOLGA_COMPENSATORIA` e `TREINAMENTO_CORPORATIVO`.
  - `false` (sugerido): `MOTIVO_PESSOAL`, `PROBLEMA_TRANSPORTE`,
    `TRANSITO`, `PROBLEMA_CLIMATICO`.
  - Sem sugestão (RH escolhe manualmente): `OUTRO`.
- Listagem simples dos afastamentos já lançados, com filtro por
  colaborador/mês, mostrando tipo, período e o badge `Abonado`/`Não
  abonado`.

# 5. Relatório de apuração

No relatório/espelho de ponto (tela de Apuração e exportação CSV que já
existem), dias com `status: AFASTAMENTO` devem exibir o tipo do
afastamento e se é abonado ou não, em vez de aparecer em branco/traço como
os dias de `FOLGA` — isso é o que vai permitir ao RH, no fechamento do
mês, filtrar rapidamente o que desconta salário/DSR e o que não desconta.

# Se algo não estiver claro
Pare e pergunte antes de assumir, especialmente sobre o comportamento no
caso de sobreposição entre `Afastamento` e `RegistroPonto` no mesmo dia
(seção 2) — não é um caso comum, mas é importante não mascarar
silenciosamente.
