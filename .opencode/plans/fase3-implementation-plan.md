# Plan de Implementación - Fase 3 Villas Mayen

**Fecha:** 2026-06-09  
**Estado:** Planificación  
**Duración estimada:** 3-4 semanas

---

## Resumen Ejecutivo

Esta fase incluye 33 cambios organizados en 8 sub-fases. El cambio más crítico es la **eliminación de la entidad Reservation** y migración completa a Quote, lo cual afecta la arquitectura de todo el sistema.

**Principio clave:** Todos los cambios de schema se harán con migraciones Prisma, NUNCA con `db push`.

---

## FASE 3A — Arquitectura (CRÍTICA - Hacer primero)

### 3A.1 Eliminar entidad Reservation
**Objetivo:** Unificar todo en Quote como única entidad

**Cambios en DB:**
```sql
-- Migración: 20260609000001_eliminate_reservation_entity

-- 1. Agregar campos de Reservation a Quote
ALTER TABLE "Quote" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'SIN_PAGO';
ALTER TABLE "Quote" ADD COLUMN "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "pendingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Quote" ADD COLUMN "confirmationDate" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "executionDate" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "completionDate" TIMESTAMP(3);

-- 2. Migrar datos de Reservation a Quote
UPDATE "Quote" q 
SET 
  "paymentStatus" = r."paymentStatus",
  "paidAmount" = r."paidAmount",
  "pendingAmount" = r."pendingAmount",
  "confirmationDate" = r."createdAt",
  "executionDate" = CASE WHEN r.status = 'EN_EJECUCION' THEN r."updatedAt" END,
  "completionDate" = CASE WHEN r.status = 'FINALIZADO' THEN r."updatedAt" END
FROM "Reservation" r
WHERE q."reservationId" = r.id;

-- 3. Actualizar foreign keys de Payment
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_reservationId_fkey";
ALTER TABLE "Payment" RENAME COLUMN "reservationId" TO "quoteId";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_quoteId_fkey" 
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE;

-- 4. Actualizar foreign keys de Expense
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_relatedEventId_fkey";
ALTER TABLE "Expense" RENAME COLUMN "relatedEventId" TO "quoteId";
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_quoteId_fkey" 
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL;

-- 5. Actualizar foreign keys de EventClosing
ALTER TABLE "EventClosing" DROP CONSTRAINT "EventClosing_reservationId_fkey";
ALTER TABLE "EventClosing" RENAME COLUMN "reservationId" TO "quoteId";
ALTER TABLE "EventClosing" ADD CONSTRAINT "EventClosing_quoteId_fkey" 
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE;

-- 6. Eliminar tabla Reservation
DROP TABLE "Reservation";

-- 7. Eliminar campo reservationId de Quote
ALTER TABLE "Quote" DROP COLUMN "reservationId";
```

**Cambios en código:**
- `src/types/index.ts`: Eliminar tipos de Reservation, agregar campos de pago a Quote
- `src/app/api/quotes/[id]/status/route.ts`: Al confirmar, actualizar Quote directamente (no crear Reservation)
- `src/app/api/reservations/`: Eliminar o redirigir a quotes
- `src/app/(dashboard)/reservations/`: Eliminar o redirigir a quotes
- `src/app/(dashboard)/dashboard-content.tsx`: Cambiar queries de Reservation a Quote
- `src/app/(dashboard)/page.tsx`: Actualizar getDashboardData para usar Quote
- `src/components/quote-pdf.tsx`: Actualizar para mostrar datos de pago
- `src/lib/utils.ts`: Actualizar getStatusColor y getStatusLabel para estados de Quote

---

### 3A.2 ~~Cotización modificable~~ (FUSIONADO con 3B.8)
**Estado:** Este punto se fusionó con 3B.8 "Cotización siempre editable"

---

### 3A.3 Quitar vencimiento de cotización
**Cambios en DB:**
```sql
-- Migración: 20260609000002_remove_quote_expiration
ALTER TABLE "Quote" DROP COLUMN "expiresAt";
```

**Cambios en código:**
- `src/app/api/quotes/[id]/status/route.ts`: Eliminar lógica de auto-expiración
- `src/app/(dashboard)/quotes/page.tsx`: Eliminar campo expiresAt del formulario
- `src/types/index.ts`: Eliminar expiresAt del tipo Quote

---

## FASE 3B — Cotización (formato y contenido)

### 3B.1 Título de evento
**Cambios en DB:**
```sql
-- Migración: 20260609000003_add_event_title
ALTER TABLE "Quote" ADD COLUMN "eventTitle" TEXT;
```

**Cambios en código:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar campo "Título del evento" en formulario
- `src/components/quote-pdf.tsx`: Mostrar título en el PDF
- `src/types/index.ts`: Agregar eventTitle al tipo Quote

---

### 3B.2 Agrupación de habitaciones y comidas
**Cambios:**
- `src/app/(dashboard)/quotes/page.tsx`: Modificar vista de detalle para agrupar por tipo
- `src/components/quote-pdf.tsx`: Agrupar en PDF (Habitaciones, Comidas, Mobiliario, Otros)

---

### 3B.3 Separar adultos y niños con número de menú
**Cambios en DB:**
```sql
-- Migración: 20260609000004_add_menu_and_guest_types
ALTER TABLE "QuoteItem" ADD COLUMN "menuNumber" INTEGER;
ALTER TABLE "QuoteItem" ADD COLUMN "guestType" TEXT; -- 'ADULTO', 'NINO', null
```

**Cambios en código:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar selector de tipo de invitado y número de menú
- `src/types/index.ts`: Agregar campos a QuoteItem
- `src/components/quote-pdf.tsx`: Mostrar "200 adultos - Menú #4, 50 niños - Menú #5"

---

### 3B.4 Número de menú al seleccionar productos
**Cambios:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar campo "Número de menú" al agregar productos de comida
- Mostrar en vista de detalle y PDF

---

### 3B.5 Preview en tiempo real
**Cambios:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar panel lateral con preview de cotización
- Mostrar total actualizado en tiempo real
- Agrupar por categoría

---

### 3B.6 Logo en PDF
**Cambios:**
- `src/components/quote-pdf.tsx`: Agregar logo en header del PDF
- Usar imagen de `/public/logo.png` o similar

---

### 3B.7 Banco + número de cuenta
**Estado:** ~~Eliminado~~ → Solo hardcodear en PDF

**Cambios:**
- `src/components/quote-pdf.tsx`: Mostrar datos bancarios hardcodeados:
  - Banco Industrial
  - Cuenta Monetaria No. 105-011028-5
  - "Emitir cheque a Nombre de: Casa Villas Mogen, S.A. o Transferencia a Cta. Monetaria No. 105-011028-5"
- No se guardan en la base de datos (son siempre los mismos)

---

### 3B.8 Cotización siempre editable (fusión con 3A.2)
**Objetivo:** La cotización se puede editar en CUALQUIER estado (incluso CONFIRMADA)

**Cambios:**
- `src/app/api/quotes/[id]/route.ts`: Eliminar validación de estado para PUT
- `src/app/(dashboard)/quotes/page.tsx`: Habilitar edición en detalle sin importar estado
- Solo bloquear edición si está FINALIZADA (ya cerró el evento)
- Permitir agregar más personas/items/spaces aunque esté confirmada

**Testing:**
- Editar cotización confirmada (agregar más gente)
- Intentar editar cotización finalizada (debe fallar)

---

### 3B.9 Descuento Y recargo por artículo y salón
**Cambios en DB:**
```sql
-- Migración: 20260609000006_add_adjustment_type
ALTER TABLE "QuoteItem" ADD COLUMN "adjustmentType" TEXT DEFAULT 'DISCOUNT'; -- 'DISCOUNT', 'SURCHARGE'
ALTER TABLE "QuoteSpace" ADD COLUMN "adjustmentType" TEXT DEFAULT 'DISCOUNT';
```

**Cambios en código:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar selector descuento/recargo
- Cambiar lógica de cálculo: si es SURCHARGE, sumar en vez de restar
- `src/types/index.ts`: Agregar adjustmentType
- `src/components/quote-pdf.tsx`: Mostrar descuentos y recargos por separado

---

### 3B.10 "Eliminar Cotización" en vez de "Cancelar"
**Cambios:**
- `src/app/(dashboard)/quotes/page.tsx`: Cambiar texto de botón
- `src/app/api/quotes/[id]/route.ts`: Implementar DELETE real (no solo cambiar estado)
- Agregar confirmación: "¿Eliminar esta cotización? Esta acción no se puede deshacer"

---

## FASE 3C — Habitaciones

### 3C.1 Selección múltiple de habitaciones
**Cambios:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar selector de rango (ej: habitaciones 1-10)
- Crear QuoteSpace por cada habitación seleccionada
- Mostrar lista de habitaciones seleccionadas

---

### 3C.2 Precio por persona en habitación
**Cambios:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar toggle "Precio por habitación" / "Precio por persona"
- Si es por persona, multiplicar por guestCount
- Mostrar en vista de detalle

---

### 3C.3 Fecha y cantidad de personas por habitación por día
**Cambios en DB:**
```sql
-- Migración: 20260609000007_add_room_daily_config
CREATE TABLE "QuoteRoomConfig" (
  "id" TEXT NOT NULL,
  "quoteSpaceId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "guestCount" INTEGER NOT NULL,
  "pricePerPerson" DOUBLE PRECISION,
  "totalPrice" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuoteRoomConfig_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "QuoteRoomConfig" ADD CONSTRAINT "QuoteRoomConfig_quoteSpaceId_fkey" 
  FOREIGN KEY ("quoteSpaceId") REFERENCES "QuoteSpace"("id") ON DELETE CASCADE;
```

**Cambios en código:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar tabla de configuración diaria por habitación
- Permitir agregar/quitar días
- Calcular total por habitación basado en configuración diaria
- `src/types/index.ts`: Agregar tipo QuoteRoomConfig

---

## FASE 3D — Productos e Inventario

### 3D.1 Categorías editables
**Cambios en DB:**
```sql
-- Migración: 20260609000008_add_editable_categories
CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- 'PRODUCT', 'FURNITURE'
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_name_type_key" ON "Category"("name", "type");

-- Migrar categorías existentes de productos
INSERT INTO "Category" ("id", "name", "type", "createdAt", "updatedAt")
SELECT DISTINCT 
  gen_random_uuid()::text,
  category,
  'PRODUCT',
  NOW(),
  NOW()
FROM "Product";

-- Migrar categorías existentes de mobiliario
INSERT INTO "Category" ("id", "name", "type", "createdAt", "updatedAt")
SELECT DISTINCT 
  gen_random_uuid()::text,
  category,
  'FURNITURE',
  NOW(),
  NOW()
FROM "Furniture";
```

**Cambios en código:**
- `src/app/(dashboard)/settings/categories/page.tsx`: Nueva página para gestionar categorías
- `src/app/api/categories/route.ts`: CRUD de categorías
- `src/app/(dashboard)/quotes/page.tsx`: Cargar categorías dinámicamente
- `src/app/(dashboard)/inventory/page.tsx`: Usar categorías dinámicas
- `src/types/index.ts`: Agregar tipo Category

---

### 3D.2 Campo "Color" en mobiliario
**Cambios en DB:**
```sql
-- Migración: 20260609000009_add_furniture_color
ALTER TABLE "Furniture" ADD COLUMN "color" TEXT;
```

**Cambios en código:**
- `src/app/(dashboard)/inventory/page.tsx`: Agregar campo color en formulario de mobiliario
- `src/app/(dashboard)/quotes/page.tsx`: Mostrar color al seleccionar mobiliario
- `src/types/index.ts`: Agregar color a Furniture

---

### 3D.3 Sillas para Niños / Mesas para Niños
**Cambios:**
- Agregar como categorías predefinidas en la migración de categorías editables
- O agregar manualmente vía UI de categorías

---

### 3D.4 Precio de lista (renta) en mobiliario y productos
**Cambios en DB:**
```sql
-- Migración: 20260609000010_add_product_rental_price
ALTER TABLE "Product" ADD COLUMN "rentalPrice" DOUBLE PRECISION DEFAULT 0;
```

**Cambios en código:**
- `src/app/(dashboard)/inventory/page.tsx`: Mostrar y editar precio de renta
- `src/app/(dashboard)/quotes/page.tsx`: Usar rentalPrice al agregar productos/mobiliario

---

### 3D.5 Productos por unidad o cantidad
**Cambios:**
- Ya existe campo `quantity` en QuoteItem
- Agregar toggle "Unidad individual" / "Conjunto con cantidad"
- Si es conjunto, mostrar input de cantidad

---

### 3D.6 Reporte exportable de inventario
**Cambios:**
- `src/app/(dashboard)/inventory/page.tsx`: Agregar botón "Exportar reporte"
- Generar CSV o Excel con:
  - Total de items por categoría
  - Subtotales por estado (BUENO, DAÑADO, etc.)
  - Valor total del inventario
- Usar librería como `xlsx` o `csv-writer`

---

### 3D.7 Costo 0 / gratuito
**Estado:** Ya funciona (precio 0 es válido)

**Cambios:**
- Verificar que se muestra correctamente en UI y PDF
- Agregar etiqueta "GRATIS" o "Sin costo" cuando precio es 0

---

## FASE 3E — Calendario y Dashboard

### 3E.1 Pantalla de 3 días (diseño profesional)
**Objetivo:** Reemplazar el pizarrón actual con una pantalla digital profesional para TV/monitor

**Información a mostrar (por evento):**
- **Hora**: Horario del evento (ej: 14:00 - 22:00)
- **Cliente**: Nombre del cliente (ej: Casa de Dios Red Espinoza)
- **Salón**: Espacios asignados (ej: Timoteo, Magdalena)
- **Personas**: Cantidad de invitados (ej: 200 adultos + 50 niños)
- **Parqueo**: Grupo asignado (ej: Predio, 4, 3)
- **Estado**: Preparación / En curso / Finalizado (con código de colores)

**Diseño:**
- 3 columnas (un día por columna)
- Título grande con fechas: "Sábado y Domingo 30/31 de Junio 2026"
- Tabla con las 6 columnas de información
- Código de colores por estado:
  - Verde: En curso (hoy)
  - Azul: Próximo (mañana/pasado mañana)
  - Gris: Finalizado
- Auto-refresh cada 5 minutos
- Full screen, optimizado para TV/monitor
- Ordenado por hora dentro de cada día

**Cambios en código:**
- `src/app/(dashboard)/screen/page.tsx`: Nueva página de pantalla
  - Query de cotizaciones de los próximos 3 días
  - Agrupar por día
  - Mostrar tabla con toda la info
  - Auto-refresh con `setInterval` cada 5 min
  - Diseño responsive para pantalla grande
- `src/app/(dashboard)/layout.tsx`: Agregar link a pantalla en sidebar (opcional)
- CSS: Estilos optimizados para lectura a distancia (textos grandes, alto contraste)

**Testing:**
- Abrir pantalla y verificar que muestra eventos de los 3 días
- Crear evento para hoy y verificar que aparece en columna correcta
- Esperar 5 minutos y verificar auto-refresh
- Verificar legibilidad en TV/monitor

---

### 3E.2 Aumentar tamaño de texto
**Cambios:**
- `src/app/(dashboard)/calendar/page.tsx`: Aumentar font-size en eventos
- `src/app/(dashboard)/quotes/page.tsx`: Aumentar font-size en detalle
- Usar clases de Tailwind: `text-base` → `text-lg` o `text-xl`

---

### 3E.3 Arreglar colores del calendario
**Cambios:**
- `src/app/(dashboard)/calendar/page.tsx`: Revisar uso de getStatusColor
- Verificar que morado (EN_EJECUCION) se muestra correctamente
- Agregar leyenda de colores

---

### 3E.4 Auto pasar a EN_EJECUCION
**Cambios:**
- `src/app/api/quotes/route.ts`: Agregar lógica en GET para verificar fechas
- Si Quote.status === 'CONFIRMADA' y eventDate <= hoy, cambiar a 'EN_EJECUCION'
- O usar cron job / scheduled task

**Opción 1 - En cada consulta:**
```typescript
// En GET /api/quotes
const quotes = await prisma.quote.findMany({...})

// Auto-actualizar estados
const toUpdate = quotes.filter(q => 
  q.status === 'CONFIRMADA' && 
  new Date(q.eventDate) <= new Date()
)

if (toUpdate.length > 0) {
  await prisma.quote.updateMany({
    where: { id: { in: toUpdate.map(q => q.id) } },
    data: { 
      status: 'EN_EJECUCION',
      executionDate: new Date()
    }
  })
}
```

---

### 3E.5 Vista de cotización de 1 semana
**Cambios:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar filtro de rango de fechas
- Permitir ver cotizaciones de los próximos 7 días
- Útil para clientes que cotizan con anticipación

---

## FASE 3F — Pagos y Liquidación

### 3F.1 Tipo de pago + número de referencia
**Cambios en DB:**
```sql
-- Migración: 20260609000011_add_payment_details
ALTER TABLE "Payment" ADD COLUMN "paymentType" TEXT NOT NULL DEFAULT 'EFECTIVO';
-- 'EFECTIVO', 'DEPOSITO', 'TRANSFERENCIA', 'CHEQUE', 'TARJETA'
ALTER TABLE "Payment" ADD COLUMN "referenceNumber" TEXT;
```

**Cambios en código:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar selector de tipo de pago y campo de referencia
- `src/app/api/quotes/[id]/payments/route.ts`: Guardar tipo y referencia
- `src/components/quote-pdf.tsx`: Mostrar detalles de pago
- `src/types/index.ts`: Agregar campos a Payment

---

### 3F.2 Proceso de liquidación
**Definición:**
- Liquidación = proceso de cierre de evento
- Incluir:
  - Verificación de mobiliario devuelto
  - Cálculo de daños/pérdidas
  - Pago de saldo pendiente
  - Generación de recibo final

**Cambios:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar botón "Liquidar" cuando status === 'EN_EJECUCION'
- Modal de liquidación con:
  - Resumen de pagos
  - Saldo pendiente
  - Checklist de mobiliario
  - Campo de observaciones
- Al liquidar: cambiar status a 'FINALIZADA'

---

## FASE 3G — Cliente

### 3G.1 Vista detalle del cliente
**Cambios:**
- `src/app/(dashboard)/clients/[id]/page.tsx`: Nueva página de detalle
- Mostrar:
  - Información del cliente
  - Historial de cotizaciones
  - Total gastado
  - Última cotización

---

### 3G.2 Historial de cotizaciones por cliente
**Cambios:**
- Incluir en vista de detalle del cliente
- Tabla con:
  - Fecha
  - Título del evento
  - Total
  - Estado
  - Acciones (ver, editar, duplicar)

---

## FASE 3H — Parqueo

### 3H.1 Parqueo (simplificado)
**Objetivo:** Solo un campo de texto en la cotización para mostrar en PDF y pantalla

**Cambios en DB:**
```sql
-- Migración: 20260609000012_add_parking_spot
ALTER TABLE "Quote" ADD COLUMN "parkingSpot" TEXT;
-- Ejemplos: "Predio", "4", "3", "5,4,1"
```

**Cambios en código:**
- `src/app/(dashboard)/quotes/page.tsx`: Agregar dropdown/campo "Parqueo" en formulario
  - Opciones: "Predio", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"
  - Permitir múltiple selección o texto libre
- `src/components/quote-pdf.tsx`: Mostrar parqueo en el PDF
- `src/app/(dashboard)/screen/page.tsx`: Mostrar parqueo en pantalla de 3 días
- `src/types/index.ts`: Agregar parkingSpot a Quote

**Testing:**
- Crear cotización con parqueo "Predio"
- Crear cotización con parqueo "4"
- Verificar en PDF y pantalla

---

## Orden de Implementación Recomendado

### Semana 1: Arquitectura + Cotización básica
1. **3A.1** Eliminar Reservation (CRÍTICO)
2. **3A.2 + 3B.8** Cotización siempre editable (fusionados)
3. **3A.3** Quitar vencimiento
4. **3B.1** Título de evento
5. **3B.10** "Eliminar" en vez de "Cancelar"

### Semana 2: Cotización avanzada + Habitaciones
6. **3B.3** Separar adultos/niños
7. **3B.4** Número de menú
8. **3B.9** Descuento y recargo
9. **3C.1** Selección múltiple de habitaciones
10. **3C.2** Precio por persona
11. **3H.1** Parqueo (campo simple en Quote)

### Semana 3: Productos + Inventario + Calendario
12. **3D.1** Categorías editables
13. **3D.2** Campo color
14. **3D.4** Precio de renta
15. **3D.5** Productos por unidad/cantidad
16. **3E.1** Pantalla de 3 días (diseño profesional)
17. **3E.2** Aumentar tamaño de texto
18. **3E.3** Arreglar colores
19. **3E.4** Auto EN_EJECUCION

### Semana 4: Pagos + Cliente + Extras
20. **3F.1** Tipo de pago + referencia
21. **3F.2** Proceso de liquidación
22. **3G.1** Vista detalle cliente
23. **3G.2** Historial de cotizaciones
24. **3B.2** Agrupación en vista
25. **3B.5** Preview en tiempo real
26. **3B.6** Logo en PDF
27. **3B.7** Banco hardcodeado en PDF
28. **3C.3** Configuración diaria de habitaciones (pendiente de discusión)
29. **3D.6** Reporte exportable
30. **3D.7** Costo 0
31. **3E.5** Vista de 1 semana

---

## Estrategia de Migraciones

**Principios:**
1. **NUNCA usar `db push`** - siempre crear migraciones
2. **Migraciones idempotentes** - usar `IF NOT EXISTS` cuando sea posible
3. **Migrar datos existentes** - no perder información
4. **Probar en local** antes de deploy a producción
5. **Backup de DB** antes de cada migración crítica

**Comandos:**
```bash
# Crear migración
npx prisma migrate dev --name nombre_descriptivo

# Aplicar migraciones en producción
npx prisma migrate deploy

# Resetear DB (solo en desarrollo)
npx prisma migrate reset

# Ver estado de migraciones
npx prisma migrate status
```

---

## Estrategia de Testing

### Testing por fase:
- **3A:** Probar migración de datos, flujo completo de cotización
- **3B:** Probar cada campo nuevo en UI y PDF
- **3C:** Probar selección múltiple y configuración diaria
- **3D:** Probar categorías, colores, reportes
- **3E:** Probar vistas de calendario y auto-transiciones
- **3F:** Probar tipos de pago y liquidación
- **3G:** Probar vistas de cliente
- **3H:** Probar lista de parqueo

### Testing de regresión:
- Después de cada fase, probar flujo completo:
  1. Crear cotización
  2. Agregar espacios, items, mobiliario
  3. Confirmar con anticipo
  4. Ejecutar evento
  5. Liquidar
  6. Verificar en calendario
  7. Generar PDF

---

## Notas Técnicas

### Dependencias críticas:
- **3A.1** (eliminar Reservation) afecta TODAS las demás fases
- **3D.1** (categorías editables) debe hacerse antes de **3D.3** (categorías predefinidas)
- **3F.1** (tipo de pago) debe hacerse antes de **3F.2** (liquidación)

### Riesgos:
- **3A.1:** Migración de datos puede fallar si hay inconsistencias
- **3C.3:** Configuración diaria de habitaciones es compleja
- **3E.4:** Auto-transición puede causar problemas si no se maneja bien

### Performance:
- **3E.1:** Vista de 3 días puede ser pesada con muchos eventos
- **3D.6:** Reporte exportable puede ser lento con mucho inventario
- Considerar paginación y lazy loading

---

## Aprobación

Este plan debe ser revisado y aprobado antes de iniciar la implementación.

**Preguntas pendientes:**
1. ¿Hay deadline específico para esta fase?
2. ¿Qué features son más urgentes para el cliente?
3. ¿Se puede hacer deploy incremental o todo junto?
4. ¿Quién hará el testing de cada fase?

---

**Próximo paso:** Revisar este plan con el cliente y priorizar según sus necesidades.
