-- Fase 3B.3-4: Agregar número de menú y tipo de invitado a QuoteItem
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "menuNumber" INTEGER;
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "guestType" TEXT; -- 'ADULTO', 'NINO', null
