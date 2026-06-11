-- Productos: color y unidades por paquete (ej: Tazas x50)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packageSize" INTEGER;
