-- Catalogo de vendedores (no son usuarios del sistema)
CREATE TABLE "Seller" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Seller_name_key" ON "Seller"("name");

-- Codigo correlativo, vendedor y mail de envio en la cotizacion
ALTER TABLE "Quote" ADD COLUMN "code" TEXT;
ALTER TABLE "Quote" ADD COLUMN "sellerId" TEXT;
ALTER TABLE "Quote" ADD COLUMN "sellerName" TEXT;
ALTER TABLE "Quote" ADD COLUMN "clientEmail" TEXT;

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Secuencia del codigo VM-NN
CREATE SEQUENCE "quote_code_seq" START WITH 1;

-- Backfill: las cotizaciones existentes se numeran por orden de creacion
WITH numeradas AS (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn
    FROM "Quote"
)
UPDATE "Quote" q
SET "code" = 'VM-' || LPAD(n.rn::TEXT, 2, '0')
FROM numeradas n
WHERE q."id" = n."id";

-- La secuencia arranca despues del ultimo numero usado
SELECT setval('quote_code_seq', COALESCE((SELECT COUNT(*) FROM "Quote"), 0) + 1, false);

CREATE UNIQUE INDEX "Quote_code_key" ON "Quote"("code");
