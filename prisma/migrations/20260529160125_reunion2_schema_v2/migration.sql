-- Villas Mayen — Migración Reunión 2 (Schema v2)
-- =====================================================
-- Esta migración: elimina modelos obsoletos, crea nuevos, modifica existentes.
-- Incluye migración de datos para preservar información existente.

-- ============================================================
-- PASO 1: Migrar datos de ubicaciones antiguas a Location
-- ============================================================

-- Crear tabla Location
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER,
    "description" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- Migrar FreeArea → Location (type = FREE_AREA)
-- Usamos COALESCE para manejar columnas que pueden no existir en tablas viejas
INSERT INTO "Location" ("id", "name", "type", "capacity", "description", "active", "createdAt", "updatedAt")
SELECT "id", "name", 'FREE_AREA', "capacity", 
  COALESCE("description", NULL), 
  COALESCE("active", true), 
  COALESCE("createdAt", CURRENT_TIMESTAMP), 
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "FreeArea";

-- Migrar DiningRoom → Location (type = DINING_ROOM)
INSERT INTO "Location" ("id", "name", "type", "capacity", "description", "active", "createdAt", "updatedAt")
SELECT "id", "name", 'DINING_ROOM', "capacity", 
  COALESCE("description", NULL), 
  COALESCE("active", true), 
  COALESCE("createdAt", CURRENT_TIMESTAMP), 
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "DiningRoom";

-- Migrar Hall → Location (type = HALL)
INSERT INTO "Location" ("id", "name", "type", "capacity", "description", "active", "createdAt", "updatedAt")
SELECT "id", "name", 'HALL', "capacity", 
  COALESCE("description", NULL), 
  COALESCE("active", true), 
  COALESCE("createdAt", CURRENT_TIMESTAMP), 
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "Hall";

-- Migrar Garden → Location (type = GARDEN)
INSERT INTO "Location" ("id", "name", "type", "capacity", "description", "active", "createdAt", "updatedAt")
SELECT "id", "name", 'GARDEN', "capacity", 
  COALESCE("description", NULL), 
  COALESCE("active", true), 
  COALESCE("createdAt", CURRENT_TIMESTAMP), 
  COALESCE("updatedAt", CURRENT_TIMESTAMP)
FROM "Garden";

-- Crear índice unique en Location.name
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- ============================================================
-- PASO 2: Quote — migrar datos de ubicación a QuoteSpace
-- ============================================================

-- Crear tabla QuoteSpace
CREATE TABLE "QuoteSpace" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "locationType" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '07:00',
    "endTime" TEXT NOT NULL DEFAULT '13:00',
    "pricingMode" TEXT NOT NULL DEFAULT 'PER_SPACE',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteSpace_pkey" PRIMARY KEY ("id")
);

-- Migrar datos de Quote existentes → QuoteSpace
INSERT INTO "QuoteSpace" ("id", "quoteId", "locationType", "locationId", "locationName", "startTime", "endTime", "unitPrice", "totalPrice", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    "id",
    "locationType",
    "locationId",
    "locationName",
    '07:00',
    '13:00',
    "totalAmount",
    "totalAmount",
    "createdAt",
    "updatedAt"
FROM "Quote"
WHERE "locationType" IS NOT NULL;

-- ============================================================
-- PASO 3: Agregar nuevos campos a Quote
-- ============================================================

ALTER TABLE "Quote" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'GTQ';
ALTER TABLE "Quote" ADD COLUMN "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "Quote" ADD COLUMN "guestCount" INTEGER;
ALTER TABLE "Quote" ADD COLUMN "sentAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "executedAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "finishedAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "discountType" TEXT;
ALTER TABLE "Quote" ADD COLUMN "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Actualizar subtotal con el totalAmount existente
UPDATE "Quote" SET "subtotal" = "totalAmount";

-- ============================================================
-- PASO 4: Eliminar columnas obsoletas de Quote
-- ============================================================

ALTER TABLE "Quote" DROP COLUMN "locationType";
ALTER TABLE "Quote" DROP COLUMN "locationId";
ALTER TABLE "Quote" DROP COLUMN "locationName";
ALTER TABLE "Quote" DROP COLUMN "schedules";

-- ============================================================
-- PASO 5: Agregar campos a QuoteItem
-- ============================================================

ALTER TABLE "QuoteItem" ADD COLUMN "scheduledDate" TIMESTAMP(3);
ALTER TABLE "QuoteItem" ADD COLUMN "startTime" TEXT;
ALTER TABLE "QuoteItem" ADD COLUMN "endTime" TEXT;
ALTER TABLE "QuoteItem" ADD COLUMN "pricingMode" TEXT;
ALTER TABLE "QuoteItem" ADD COLUMN "discountType" TEXT;
ALTER TABLE "QuoteItem" ADD COLUMN "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ============================================================
-- PASO 6: Reservation — eliminar columnas obsoletas
-- ============================================================

ALTER TABLE "Reservation" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'GTQ';
ALTER TABLE "Reservation" ADD COLUMN "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "Reservation" ADD COLUMN "guestCount" INTEGER;

ALTER TABLE "Reservation" DROP COLUMN "reservationType";
ALTER TABLE "Reservation" DROP COLUMN "locationType";
ALTER TABLE "Reservation" DROP COLUMN "locationId";
ALTER TABLE "Reservation" DROP COLUMN "locationName";
ALTER TABLE "Reservation" DROP COLUMN "startSchedule";
ALTER TABLE "Reservation" DROP COLUMN "endSchedule";
ALTER TABLE "Reservation" DROP COLUMN "schedules";
ALTER TABLE "Reservation" DROP COLUMN "totalAmount";
ALTER TABLE "Reservation" DROP COLUMN "observations";

-- ============================================================
-- PASO 7: Payment — agregar campos de moneda
-- ============================================================

ALTER TABLE "Payment" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'GTQ';
ALTER TABLE "Payment" ADD COLUMN "exchangeRate" DOUBLE PRECISION;
ALTER TABLE "Payment" ADD COLUMN "amountGTQ" DOUBLE PRECISION;

-- ============================================================
-- PASO 8: Product — agregar nuevos campos
-- ============================================================

ALTER TABLE "Product" ADD COLUMN "menuType" TEXT;
ALTER TABLE "Product" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "isFree" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "pricePerDay" DOUBLE PRECISION;
ALTER TABLE "Product" ADD COLUMN "pricePerHour" DOUBLE PRECISION;

-- ============================================================
-- PASO 9: Room — agregar pricePerPerson
-- ============================================================

ALTER TABLE "Room" ADD COLUMN "pricePerPerson" DOUBLE PRECISION;

-- ============================================================
-- PASO 10: Client — agregar category
-- ============================================================

ALTER TABLE "Client" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'REGULAR';

-- ============================================================
-- PASO 11: Crear tablas nuevas
-- ============================================================

-- ExchangeRate
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL DEFAULT 'USD',
    "toCurrency" TEXT NOT NULL DEFAULT 'GTQ',
    "rate" DOUBLE PRECISION NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- DailyClosing
CREATE TABLE "DailyClosing" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalEvents" INTEGER NOT NULL,
    "completedEvents" INTEGER NOT NULL,
    "totalCollected" DOUBLE PRECISION NOT NULL,
    "pendingAmount" DOUBLE PRECISION NOT NULL,
    "incidents" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyClosing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyClosing_date_key" ON "DailyClosing"("date");

-- EmailLog
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT,
    "type" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "error" TEXT,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- PASO 12: Índices
-- ============================================================

CREATE INDEX "QuoteSpace_quoteId_idx" ON "QuoteSpace"("quoteId");
CREATE INDEX "QuoteSpace_locationType_locationId_idx" ON "QuoteSpace"("locationType", "locationId");
CREATE INDEX "Quote_status_eventDate_idx" ON "Quote"("status", "eventDate");
CREATE INDEX "Quote_expiresAt_idx" ON "Quote"("expiresAt");

-- FK para QuoteSpace
ALTER TABLE "QuoteSpace" ADD CONSTRAINT "QuoteSpace_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK para EmailLog
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- PASO 13: Eliminar tablas obsoletas
-- ============================================================

DROP TABLE IF EXISTS "WorkOrder" CASCADE;
DROP TABLE IF EXISTS "FreeArea" CASCADE;
DROP TABLE IF EXISTS "DiningRoom" CASCADE;
DROP TABLE IF EXISTS "Hall" CASCADE;
DROP TABLE IF EXISTS "Garden" CASCADE;
