-- Fix EventClosingItem to support non-furniture items
-- Changes made via db push that were never migrated

-- 1. Make furnitureId optional (for items that are not furniture)
ALTER TABLE "EventClosingItem" ALTER COLUMN "furnitureId" DROP NOT NULL;

-- 2. Add itemName for non-furniture items (products, services, etc.)
ALTER TABLE "EventClosingItem" ADD COLUMN "itemName" TEXT;

-- 3. Add quantity field
ALTER TABLE "EventClosingItem" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

-- 4. Update foreign key to allow NULL (optional relation)
-- First drop existing FK
ALTER TABLE "EventClosingItem" DROP CONSTRAINT IF EXISTS "EventClosingItem_furnitureId_fkey";

-- Then recreate as optional
ALTER TABLE "EventClosingItem" ADD CONSTRAINT "EventClosingItem_furnitureId_fkey" 
  FOREIGN KEY ("furnitureId") REFERENCES "Furniture"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;
