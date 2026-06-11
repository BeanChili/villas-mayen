-- Fase 3B.9: Descuento/recargo por artículo y salón
ALTER TABLE "QuoteItem" ADD COLUMN IF NOT EXISTS "adjustmentType" TEXT DEFAULT 'DISCOUNT';
ALTER TABLE "QuoteSpace" ADD COLUMN IF NOT EXISTS "adjustmentType" TEXT DEFAULT 'DISCOUNT';

-- Fase 3H.1: Parqueo (campo simple en Quote)
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "parkingSpot" TEXT;

-- Fase 3D.2: Color en mobiliario
ALTER TABLE "Furniture" ADD COLUMN IF NOT EXISTS "color" TEXT;

-- Fase 3D.4: Precio de renta en productos
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "rentalPrice" DOUBLE PRECISION DEFAULT 0;
