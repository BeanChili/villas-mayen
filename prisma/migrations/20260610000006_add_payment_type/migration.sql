-- Fase 3F.1: Agregar tipo de pago y número de referencia
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "paymentType" TEXT NOT NULL DEFAULT 'EFECTIVO';
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT;
