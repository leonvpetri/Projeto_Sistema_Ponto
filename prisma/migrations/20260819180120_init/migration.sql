-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'RH',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Colaborador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "jornadaId" TEXT NOT NULL,
    "dataBaseEscala12x36" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Colaborador_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "Jornada" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Jornada" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "horaEntradaPadrao" TEXT,
    "horaSaidaPadrao" TEXT,
    "duracaoIntervaloMin" INTEGER,
    "toleranciaIntervaloMin" INTEGER DEFAULT 10,
    "cargaDiariaEsperadaMin" INTEGER,
    "cargaTurno12x36Min" INTEGER,
    "temAdicionalNoturno" BOOLEAN NOT NULL DEFAULT false,
    "horarioNoturnoInicio" TEXT NOT NULL DEFAULT '22:00',
    "horarioNoturnoFim" TEXT NOT NULL DEFAULT '05:00',
    "percentualAdicionalNoturno" REAL NOT NULL DEFAULT 0.20,
    "horaNoturnaReduzida" BOOLEAN NOT NULL DEFAULT true,
    "toleranciaBancoHorasMin" INTEGER NOT NULL DEFAULT 10
);

-- CreateTable
CREATE TABLE "TrocaEscala" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL,
    "colaboradorOriginalId" TEXT NOT NULL,
    "colaboradorSubstitutoId" TEXT NOT NULL,
    "motivo" TEXT,
    "supervisorInformado" TEXT NOT NULL,
    "registradoPor" TEXT NOT NULL,
    "confirmadoPeloRH" BOOLEAN NOT NULL DEFAULT false,
    "confirmadoEm" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrocaEscala_colaboradorOriginalId_fkey" FOREIGN KEY ("colaboradorOriginalId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrocaEscala_colaboradorSubstitutoId_fkey" FOREIGN KEY ("colaboradorSubstitutoId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistroPonto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colaboradorId" TEXT NOT NULL,
    "dataHora" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'CARTAO_MECANICO',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroPonto_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AjustePonto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colaboradorId" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "motivo" TEXT NOT NULL,
    "registroOriginalId" TEXT,
    "valorAnterior" TEXT,
    "valorNovo" TEXT NOT NULL,
    "ajustadoPor" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AjustePonto_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApuracaoDiaria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colaboradorId" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "diaEsperadoTrabalho" BOOLEAN NOT NULL,
    "totalTrabalhadoMin" INTEGER,
    "totalNoturnoMin" INTEGER,
    "totalNoturnoEquivalenteMin" INTEGER,
    "cargaEsperadaMin" INTEGER NOT NULL,
    "diferencaBancoHorasMin" INTEGER,
    "status" TEXT NOT NULL,
    "alertas" TEXT NOT NULL,
    "calculadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApuracaoDiaria_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_cpf_key" ON "Colaborador"("cpf");

-- CreateIndex
CREATE INDEX "TrocaEscala_data_colaboradorOriginalId_idx" ON "TrocaEscala"("data", "colaboradorOriginalId");

-- CreateIndex
CREATE INDEX "TrocaEscala_data_colaboradorSubstitutoId_idx" ON "TrocaEscala"("data", "colaboradorSubstitutoId");

-- CreateIndex
CREATE INDEX "RegistroPonto_colaboradorId_dataHora_idx" ON "RegistroPonto"("colaboradorId", "dataHora");

-- CreateIndex
CREATE UNIQUE INDEX "ApuracaoDiaria_colaboradorId_data_key" ON "ApuracaoDiaria"("colaboradorId", "data");
