-- Add endDate column to Quote table
-- This field was added via db push but never migrated.
ALTER TABLE "Quote" ADD COLUMN "endDate" TIMESTAMP(3);
