-- Fase 3A.3: Quitar vencimiento de cotización
DROP INDEX IF EXISTS "Quote_expiresAt_idx";
ALTER TABLE "Quote" DROP COLUMN IF EXISTS "expiresAt";
