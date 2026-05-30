-- Add rentalPrice column to Furniture table
ALTER TABLE "Furniture" ADD COLUMN "rentalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
