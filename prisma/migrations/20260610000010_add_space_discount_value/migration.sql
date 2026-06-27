-- Fase 3: Agregar discountValue a QuoteSpace
ALTER TABLE "QuoteSpace" ADD COLUMN IF NOT EXISTS "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0;
