-- AlterTable
ALTER TABLE "ApuracaoDiaria" ADD COLUMN "afastamentoAbonado" BOOLEAN;
ALTER TABLE "ApuracaoDiaria" ADD COLUMN "afastamentoTipo" TEXT;

-- CreateTable
CREATE TABLE "Afastamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colaboradorId" TEXT NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL,
    "abonado" BOOLEAN NOT NULL,
    "motivo" TEXT,
    "registradoPor" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Afastamento_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Afastamento_colaboradorId_dataInicio_dataFim_idx" ON "Afastamento"("colaboradorId", "dataInicio", "dataFim");

