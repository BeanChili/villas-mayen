-- Fase 3: Agregar tabla QuoteItemDay para cantidades dinámicas por día

-- 1. Crear tabla QuoteItemDay
CREATE TABLE IF NOT EXISTS "QuoteItemDay" (
  "id" TEXT NOT NULL,
  "quoteItemId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuoteItemDay_pkey" PRIMARY KEY ("id")
);

-- 2. Agregar constraint unique (un item no puede tener dos entradas para el mismo día)
CREATE UNIQUE INDEX IF NOT EXISTS "QuoteItemDay_quoteItemId_date_key" ON "QuoteItemDay"("quoteItemId", "date");

-- 3. Agregar FK a QuoteItem (primero dropeamos por si ya existe)
ALTER TABLE "QuoteItemDay" DROP CONSTRAINT IF EXISTS "QuoteItemDay_quoteItemId_fkey";
ALTER TABLE "QuoteItemDay" ADD CONSTRAINT "QuoteItemDay_quoteItemId_fkey" 
  FOREIGN KEY ("quoteItemId") REFERENCES "QuoteItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Migrar datos existentes: si QuoteItem tiene quantity > 0, crear un QuoteItemDay para eventDate
-- Nota: esto asume que los items existentes son para el día del evento
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'QuoteItem' AND column_name = 'quantity') THEN
    INSERT INTO "QuoteItemDay" ("id", "quoteItemId", "date", "quantity", "createdAt", "updatedAt")
    SELECT 
      gen_random_uuid()::text,
      qi.id,
      q."eventDate",
      qi.quantity,
      NOW(),
      NOW()
    FROM "QuoteItem" qi
    JOIN "Quote" q ON qi."quoteId" = q.id
    WHERE qi.quantity > 0
    ON CONFLICT ("quoteItemId", "date") DO NOTHING;
  END IF;
END $$;
