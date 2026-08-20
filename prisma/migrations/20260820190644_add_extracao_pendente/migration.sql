-- AlterTable
ALTER TABLE "Colaborador" ADD COLUMN "telefone" TEXT;

-- CreateTable
CREATE TABLE "ExtracaoPendente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "telefoneOrigem" TEXT NOT NULL,
    "colaboradorId" TEXT,
    "nomeExtraidoCartao" TEXT,
    "cpfExtraidoCartao" TEXT,
    "conferenciaOk" BOOLEAN,
    "fotoUrl" TEXT NOT NULL,
    "dadosExtraidosJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "revisadoPor" TEXT,
    "revisadoEm" DATETIME,
    "motivoRejeicao" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtracaoPendente_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ExtracaoPendente_status_idx" ON "ExtracaoPendente"("status");

-- CreateIndex
CREATE INDEX "ExtracaoPendente_telefoneOrigem_idx" ON "ExtracaoPendente"("telefoneOrigem");

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_telefone_key" ON "Colaborador"("telefone");
