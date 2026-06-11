-- Fase 3A.1: Eliminar entidad Reservation, unificar todo en Quote
-- ================================================================
-- Esta migración es idempotente: funciona tanto en DB fresca como en DB
-- que ya fue sincronizada con db push.

-- PASO 1: Agregar campos de pago y tracking a Quote
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'SIN_PAGO';
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pendingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "confirmationDate" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "executionDate" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "completionDate" TIMESTAMP(3);

-- PASO 2: Migrar datos de Reservation a Quote (solo si Reservation existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'Reservation') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reservation' AND column_name = 'paymentStatus') THEN
    UPDATE "Quote" q 
    SET 
      "paymentStatus" = r."paymentStatus",
      "paidAmount" = r."paidAmount",
      "pendingAmount" = r."pendingAmount",
      "confirmationDate" = r."createdAt"
    FROM "Reservation" r
    WHERE q."reservationId" = r.id;
  END IF;
END $$;

-- PASO 3: Migrar Payment → Quote (solo si Reservation existe y tiene datos)
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "quoteId" TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'Reservation') THEN
    UPDATE "Payment" p
    SET "quoteId" = q.id
    FROM "Reservation" r, "Quote" q
    WHERE p."reservationId" = r.id
      AND q."reservationId" = r.id;
  END IF;
END $$;

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_reservationId_fkey";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "reservationId";

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_quoteId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_quoteId_fkey" 
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PASO 4: Migrar Expense → Quote
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "quoteId" TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'Reservation') THEN
    UPDATE "Expense" e
    SET "quoteId" = q.id
    FROM "Reservation" r, "Quote" q
    WHERE e."relatedEventId" = r.id
      AND q."reservationId" = r.id;
  END IF;
END $$;

ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_relatedEventId_fkey";
ALTER TABLE "Expense" DROP COLUMN IF EXISTS "relatedEventId";

ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_quoteId_fkey";
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_quoteId_fkey" 
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PASO 5: Migrar EventClosing → Quote
ALTER TABLE "EventClosing" ADD COLUMN IF NOT EXISTS "quoteId" TEXT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'Reservation') THEN
    UPDATE "EventClosing" ec
    SET "quoteId" = q.id
    FROM "Reservation" r, "Quote" q
    WHERE ec."reservationId" = r.id
      AND q."reservationId" = r.id;
  END IF;
END $$;

ALTER TABLE "EventClosing" DROP CONSTRAINT IF EXISTS "EventClosing_reservationId_fkey";
DROP INDEX IF EXISTS "EventClosing_reservationId_key";
ALTER TABLE "EventClosing" DROP COLUMN IF EXISTS "reservationId";

ALTER TABLE "EventClosing" DROP CONSTRAINT IF EXISTS "EventClosing_quoteId_fkey";
ALTER TABLE "EventClosing" ADD CONSTRAINT "EventClosing_quoteId_fkey" 
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "EventClosing_quoteId_key" ON "EventClosing"("quoteId");

-- PASO 6: Eliminar tabla Reservation (si existe)
DROP TABLE IF EXISTS "Reservation" CASCADE;

-- PASO 7: Eliminar reservationId de Quote
ALTER TABLE "Quote" DROP CONSTRAINT IF EXISTS "Quote_reservationId_fkey";
DROP INDEX IF EXISTS "Quote_reservationId_key";
ALTER TABLE "Quote" DROP COLUMN IF EXISTS "reservationId";
