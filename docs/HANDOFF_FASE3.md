# HANDOFF - Villas Mayen Fase 3

**Fecha:** 2026-06-10
**Estado:** 95% completado, listo para QA

---

##  OBJETIVO PRINCIPAL

Eliminar la entidad `Reservation` y unificar todo en `Quote`. Implementar cantidades por día para items (comida/mobiliario). Agregar funcionalidades de la Fase 3.

---

## ✅ COMPLETADO

### 1. Arquitectura (CRÍTICO)
- **Eliminada entidad Reservation** → todo ahora es Quote
- **Nueva tabla `QuoteItemDay`** para cantidades por día
- **Migraciones creadas** (8 nuevas):
  - `20260610000001_eliminate_reservation_unify_quote`
  - `20260610000002_remove_quote_expiration`
  - `20260610000003_add_event_title`
  - `20260610000004_add_menu_and_guest_types`
  - `20260610000005_add_adjustment_parking_color_rental`
  - `20260610000006_add_payment_type`
  - `20260610000007_add_editable_categories`
  - `20260610000008_add_quote_item_day`
  - `20260610000009_cleanup_quote_item_columns`

### 2. Campos Nuevos en Quote
- `eventTitle` - Título del evento
- `parkingSpot` - Parqueo (Predio, Grupo 1-10)
- `paymentStatus` - SIN_PAGO, PARCIAL, PAGADO
- `paidAmount`, `pendingAmount` - Montos de pago
- `confirmationDate`, `executionDate`, `completionDate` - Fechas de estado

### 3. QuoteItem - Cantidades por Día
- **Antes:** `quantity` único
- **Ahora:** `dailyQuantities[]` con `{ date, quantity }`
- **UI:** Tabla con columnas por día del evento
- **API:** Endpoints actualizados para crear/actualizar dailyQuantities

### 4. Nuevas Funcionalidades
- **Pantalla TV** (`/screen`) - Vista de 3 días para TV/monitor
- **Categorías editables** (`/settings/categories`) - CRUD de categorías
- **Cierres diarios** (`/reports/closings`) - Reporte de cierres
- **Tipo de pago** - EFECTIVO, DEPOSITO, TRANSFERENCIA, CHEQUE, TARJETA
- **Número de referencia** en pagos
- **Descuento/Recargo** (DISCOUNT/SURCHARGE) por item
- **Color** en mobiliario
- **Precio de alquiler** en mobiliario y productos
- **Menú N° y Tipo** (Adulto/Niño) en items de comida
- **Selección múltiple de habitaciones** - Rango 1-30
- **Agrupación de habitaciones** - "Belén (30 hab.)" en vez de 30 líneas
- **Modal de anticipo** estilizado al confirmar cotización
- **Filtros en cotizaciones** - Por cliente y estado
- **Links desde cliente** - Historial de cotizaciones con filtro

### 5. Bugs Arreglados
- **Runtime errors** - `filter is not a function` en múltiples páginas
- **NaN en totales** - `item.quantity` eliminado, ahora calcula desde dailyQuantities
- **Fechas corridas** - `+ "T12:00:00"` para evitar offset UTC
- **"Eventos Hoy" incorrecto** - Query contaba eventos viejos con endDate null
- **Calendario vacío** - Mapeo de fechas ISO a string
- **PDF fallaba** - `item.totalPrice` no existía, ahora calcula dinámicamente
- **Subtotal en 0** - Recálculo automático al agregar espacios
- **"(mañana)" en espacios** - Eliminado getScheduleFromTime
- **Modal de anticipo** - Reemplazó window.prompt feo

### 6. Frontend - Campos Integrados
- **Inventario:** Color y Precio de Alquiler en formulario y tabla
- **Productos:** Precio de Alquiler en catálogo
- **Pagos:** Selector de tipo de pago y campo de referencia
- **Cotizaciones:** 
  - Selector DISCOUNT/SURCHARGE
  - eventTitle y parkingSpot en vista detalle
  - menuNumber y guestType en detalle de items
- **Calendario:** Formulario de pago con tipo y referencia

### 7. Navegación
- **Sidebar actualizado:**
  - "Calendario" → `/calendar` (antes `/reservations`)
  - "Cierres" → `/reports/closings`
  - "Pantalla TV" → `/screen`
- **Settings:** Botón "Categorías" agregado

---

## ⚠️ PENDIENTE (5%)

### 1. Prisma Client - File Lock en Windows
**Problema:** `prisma generate` falla con EPERM en Windows
**Solución temporal:** Copiar manualmente el engine:
```bash
cmd /c "del /f /q node_modules\.prisma\client\query_engine-windows.dll.node"
npx prisma generate
```
**Solución definitiva:** Reiniciar VS Code o la máquina

### 2. Testing Pendiente
- [ ] Probar flujo completo de cotización con dailyQuantities
- [ ] Verificar que el PDF se genera correctamente
- [ ] Probar pantalla TV en navegador
- [ ] Probar categorías editables
- [ ] Probar tipo de pago en registro de pagos
- [ ] Verificar agrupación de habitaciones en PDF y detalle

### 3. Posibles Issues Menores
- `QuoteItem.adjustmentType` en QuoteSpace no tiene UI (solo en QuoteItem)
- Per-day breakdown en vista detalle muestra solo total, no desglose por día
- Algunos textos en inglés en el código (deberían ser español)

---

## 📁 ARCHIVOS MODIFICADOS (RESUMEN)

### Backend (API Routes)
- `src/app/api/quotes/route.ts` - GET, POST con dailyQuantities
- `src/app/api/quotes/[id]/route.ts` - GET, PUT con dailyQuantities
- `src/app/api/quotes/[id]/status/route.ts` - Status changes
- `src/app/api/calendar/route.ts` - Renamed from reservations
- `src/app/api/calendar/[id]/route.ts` - Renamed from reservations
- `src/app/api/calendar/[id]/payments/route.ts` - Payment with type/ref
- `src/app/api/furniture/route.ts` - Added color, rentalPrice
- `src/app/api/products/route.ts` - Added rentalPrice
- `src/app/api/categories/route.ts` - NEW - CRUD categorías
- `src/app/api/categories/[id]/route.ts` - NEW - Delete categoría

### Frontend (Pages)
- `src/app/(dashboard)/quotes/page.tsx` - Major refactor
- `src/app/(dashboard)/calendar/page.tsx` - Renamed from reservations
- `src/app/(dashboard)/inventory/page.tsx` - Added color, rentalPrice
- `src/app/(dashboard)/catalog/products/page.tsx` - Added rentalPrice
- `src/app/(dashboard)/screen/page.tsx` - NEW - TV display
- `src/app/(dashboard)/settings/categories/page.tsx` - NEW
- `src/app/(dashboard)/settings/page.tsx` - Added categories link
- `src/app/(dashboard)/clients/[id]/page.tsx` - Added quote links
- `src/app/(dashboard)/layout.tsx` - Updated navigation

### Components
- `src/components/quote-pdf.tsx` - Fixed totalPrice calculation

### Types
- `src/types/index.ts` - Updated QuoteItemFormData, removed old fields

### Schema
- `prisma/schema.prisma` - Major changes (QuoteItemDay, removed fields)
- `prisma/migrations/` - 9 new migrations

---

## 🧪 CASOS DE PRUEBA RECOMENDADOS

### 1. Crear Cotización con Daily Quantities
1. Crear cotización con fecha inicio 10/06 y fin 12/06 (3 días)
2. Agregar producto "Almuerzo" con cantidades: 30, 50, 30
3. Verificar que el total = (30+50+30) × precio unitario
4. Agregar mobiliario "Sillas" con rango 1-10
5. Verificar que se creen 10 QuoteSpaces agrupados como "Sillas (10 hab.)"
6. Confirmar con anticipo parcial
7. Verificar que aparezca en "Próximos Eventos"

### 2. Ver Detalle de Cotización
1. Abrir cotización creada
2. Verificar que muestre eventTitle y parkingSpot
3. Verificar que los items muestren menuNumber y guestType
4. Verificar que las habitaciones estén agrupadas
5. Verificar que los totales sean correctos

### 3. Generar PDF
1. Desde el detalle, click en "Descargar PDF"
2. Verificar que no haya errores
3. Verificar que muestre cantidades totales (suma de días)
4. Verificar que el logo aparezca
5. Verificar datos bancarios

### 4. Registrar Pago
1. Ir a Calendario
2. Click en cotización confirmada
3. Click "Registrar Pago"
4. Ingresar monto, seleccionar tipo (Transferencia), ingresar referencia
5. Verificar que aparezca en el historial con tipo y referencia

### 5. Pantalla TV
1. Ir a `/screen`
2. Verificar que muestre 3 columnas (Hoy, Mañana, Pasado Mañana)
3. Verificar que los eventos se agrupen por día
4. Dejar abierta 5 minutos y verificar auto-refresh

### 6. Categorías Editables
1. Ir a Configuración → Categorías
2. Crear nueva categoría "Sobre-Mantel" tipo Producto
3. Verificar que aparezca en el dropdown al crear producto
4. Eliminar categoría y verificar que desaparezca

---

## 🚀 DEPLOY A PRODUCCIÓN

### Pre-requisitos
1. Backup de la base de datos
2. Verificar que todas las migraciones estén en `prisma/migrations/`

### Pasos
```bash
# 1. En producción, marcar migraciones viejas como aplicadas
npx prisma migrate resolve --applied 20260529160125_reunion2_schema_v2
npx prisma migrate resolve --applied 20260530113959_add_rental_price_to_furniture
npx prisma migrate resolve --applied 20260530114835_fix_event_closing_item
npx prisma migrate resolve --applied 20260530120000_add_quote_end_date

# 2. Aplicar nuevas migraciones
npx prisma migrate deploy

# 3. Verificar que todo esté en orden
npx prisma migrate status
```

### Rollback (si algo falla)
```bash
# Restaurar backup de la base de datos
# Las migraciones son idempotentes (usan IF NOT EXISTS, DROP IF EXISTS)
# Se pueden re-aplicar sin problemas
```

---

## 📝 NOTAS TÉCNICAS

### Por qué se eliminó `totalPrice` de QuoteItem
- Era un campo calculado (quantity × unitPrice - discount)
- Con dailyQuantities, el cálculo es más complejo
- Se calcula dinámicamente en el frontend y API
- Reduce redundancia y posibles inconsistencias

### Por qué se usa `+ "T12:00:00"` para fechas
- JavaScript interpreta `"2026-06-10"` como UTC midnight
- En GMT-6 (Guatemala), eso es 9 de junio a las 18:00
- Al agregar `"T12:00:00"`, se interpreta como hora local
- Evita que las fechas se "corran" un día

### Agrupación de Habitaciones
- Regex: `/^(.+?)\s+(\d+)$/` extrae base ("Belén") y número ("1")
- Si no hay número, usa el nombre completo
- Agrupa por: base name + startTime + endTime
- Muestra: "Belén (30 hab.)" con total sumado

---

## 🆘 SOPORTE

Si hay errores después del deploy:

1. **Error "column does not exist"**
   - Las migraciones no se aplicaron correctamente
   - Correr `npx prisma migrate deploy` nuevamente

2. **Error "Cannot find module"**
   - Falta `npm run build` después del deploy
   - Correr `npm run build` en producción

3. **Error "Prisma Client not generated"**
   - Correr `npx prisma generate`
   - Si falla en Windows, usar el workaround del file lock

4. **Fechas incorrectas en el calendario**
   - Verificar que el servidor esté en la zona horaria correcta
   - Las fechas se guardan como TIMESTAMP sin zona horaria

---

## ✨ PRÓXIMOS PASOS (Post-Fase 3)

1. **Migrar datos existentes** de cantidad única a dailyQuantities
2. **Agregar validación** de categorías en uso antes de eliminar
3. **Mejorar UI** de dailyQuantities en vista detalle (mostrar desglose por día)
4. **Agregar tests** automatizados para el flujo de cotización
5. **Documentar** el uso de la pantalla TV para el cliente

---

**Generado por:** opencode
**Fecha:** 2026-06-10
**Versión:** 1.0
