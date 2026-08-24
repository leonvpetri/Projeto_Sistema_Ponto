-- Data fix: COMPENSADO_SABADO deixa de existir como TipoEscala — vira PADRAO_5X2
-- (mesma regra de negócio: seg-sex, intervalo validado por duração, não por horário fixo).
UPDATE "Jornada" SET "tipo" = 'PADRAO_5X2' WHERE "tipo" = 'COMPENSADO_SABADO';

-- Data fix: preserva a config já cadastrada de ESCALA_12X36 antes de dropar a coluna —
-- cargaTurno12x36Min vira cargaDiariaEsperadaMin (mesmo campo usado por PADRAO_5X2 agora).
UPDATE "Jornada"
SET "cargaDiariaEsperadaMin" = "cargaTurno12x36Min"
WHERE "cargaTurno12x36Min" IS NOT NULL AND "cargaDiariaEsperadaMin" IS NULL;

-- AlterTable
ALTER TABLE "Jornada" DROP COLUMN "cargaTurno12x36Min";
