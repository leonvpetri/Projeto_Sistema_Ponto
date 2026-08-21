-- CreateTable
CREATE TABLE "ObservacaoDia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colaboradorId" TEXT NOT NULL,
    "data" DATETIME NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObservacaoDia_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ObservacaoDia_colaboradorId_data_key" ON "ObservacaoDia"("colaboradorId", "data");
