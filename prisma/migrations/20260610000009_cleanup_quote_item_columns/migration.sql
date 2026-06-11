-- Fase 3: Limpiar columnas obsoletas de QuoteItem
-- Estas columnas fueron reemplazadas por QuoteItemDay

-- 1. Agregar createdAt y updatedAt si no existen
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. Eliminar columnas reemplazadas por QuoteItemDay
ALTER TABLE "QuoteItem" DROP COLUMN IF EXISTS "quantity";
ALTER TABLE "QuoteItem" DROP COLUMN IF EXISTS "totalPrice";

-- 3. Eliminar columnas de fecha/hora únicas (ahora por día)
ALTER TABLE "QuoteItem" DROP COLUMN IF EXISTS "scheduledDate";
ALTER TABLE "QuoteItem" DROP COLUMN IF EXISTS "startTime";
ALTER TABLE "QuoteItem" DROP COLUMN IF EXISTS "endTime";
