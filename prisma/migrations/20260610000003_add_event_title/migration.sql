-- Fase 3B.1: Agregar título del evento a la cotización
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "eventTitle" TEXT;
