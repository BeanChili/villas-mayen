-- Habitaciones: descripcion y datos de mantenimiento con fecha de fin
ALTER TABLE "Room" ADD COLUMN "description" TEXT;
ALTER TABLE "Room" ADD COLUMN "maintenanceWork" TEXT;
ALTER TABLE "Room" ADD COLUMN "maintenanceEndDate" TIMESTAMP(3);

-- Gastos por evento: indice para el filtro por cotizacion
CREATE INDEX "Expense_quoteId_idx" ON "Expense"("quoteId");
