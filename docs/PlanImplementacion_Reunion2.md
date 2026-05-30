# PLAN DE IMPLEMENTACIÓN — Villas Mayen (Reunión 2)

> 📚 **Documentación de lógica de negocio:** [docs/logic/](./logic/) — entidades, flujos, API, roles

**Fecha:** 2026-05-29
**Fuente:** Listado de cambios del cliente + respuestas de la Reunión 2 + correcciones del dueño

---

## ÍNDICE

1. [Decisiones Arquitectónicas](#1-decisiones-arquitectónicas)
2. [Fase 0 — Schema y Tipos (Base)](#2-fase-0--schema-y-tipos-base)
3. [Fase 1 — Unificar Reservación → Cotización](#3-fase-1--unificar-reservación--cotización)
4. [Fase 2 — Cotizaciones con Múltiples Espacios y Horarios](#4-fase-2--cotizaciones-con-múltiples-espacios-y-horarios)
5. [Fase 3 — Menús, Comidas y Fechas/Horas por Día](#5-fase-3--menús-comidas-y-fechashoras-por-día)
6. [Fase 4 — Moneda, Descuentos, Precios](#6-fase-4--moneda-descuentos-precios)
7. [Fase 5 — Estados de Cotización y Flujo Completo](#7-fase-5--estados-de-cotización-y-flujo-completo)
8. [Fase 6 — Calendario Mejorado](#8-fase-6--calendario-mejorado)
9. [Fase 7 — Habitaciones](#9-fase-7--habitaciones)
10. [Fase 8 — Catálogos Editables](#10-fase-8--catálogos-editables)
11. [Fase 9 — Clientes](#11-fase-9--clientes)
12. [Fase 10 — Liquidación, Cierres y Email a Contabilidad](#12-fase-10--liquidación-cierres-y-email-a-contabilidad)
13. [Fase 11 — Roles y Permisos](#13-fase-11--roles-y-permisos-pendiente-cliente)
14. [Orden de Ejecución Recomendado](#14-orden-de-ejecución-recomendado)

---

## 1. DECISIONES ARQUITECTÓNICAS

### 1.1 Unificación Quote ↔ Reservation

> Cliente: *"Las reservaciones solamente se dan cuando se cotiza, por lo tanto dejar solo la entidad de cotizaciones y allí se produce reserva, no utilizaremos el modulo de solo reserva."*

**Decisión:** El modelo `Quote` pasa a ser la entidad central. `Reservation` se mantiene pero solo se crea **automáticamente** cuando una cotización pasa a estado `CONFIRMADA` (pago anticipo recibido). El módulo standalone de "Nueva Reservación" se elimina.

**Flujo resultante:**
```
Cliente pide cotizar → Se crea Quote (BORRADOR)
  → Se envía al cliente (ENVIADA)
  → Cliente no responde en 15 días hábiles (NO_CONFIRMADA)
    → Se puede reenviar (vuelve a ENVIADA)
  → Cliente acepta y paga anticipo → CONFIRMADA → Se crea Reservation automáticamente
    → Si necesita cambios → CANCELADO (terminal) → Nueva Quote desde cero (BORRADOR)
    → Día del evento → EN_EJECUCION
      → Se cancela → CANCELADO (terminal)
      → Finaliza y liquida → FINALIZADA (terminal)
```

### 1.2 Múltiples espacios en una cotización + Unificación de ubicaciones

> Cliente: *"Una cotización puede tener varios espacios, habitaciones, jardines, áreas verdes, etc."*

**Decisión 1:** Se crea un modelo intermedio `QuoteSpace` que vincula una Quote con múltiples ubicaciones, cada una con su propio horario (`startTime`, `endTime`), precio y modo de precio.

**Decisión 2:** Las ubicaciones FreeArea, DiningRoom, Hall, Garden, Terrace son **el mismo modelo** con distinta categoría. Se unifican en un solo modelo `Location` con campo `type`. `Room` se mantiene separado por su complejidad (edificio, piso, camas, foto, estados).

### 1.3 Horas exactas (sin bloques duplicados) ✅

> **Q13-14 corregida:** La hora exacta (HH:MM) es la fuente de verdad. Los bloques Mañana/Tarde/Noche ya no se almacenan — se derivan automáticamente de la hora.

**Decisión:** `QuoteSpace` solo almacena `startTime` y `endTime` (string HH:MM). El bloque (MANANA/TARDE/NOCHE) se calcula al vuelo según:
```
07:00 - 13:00 → MANANA
14:00 - 19:00 → TARDE
20:00 - 01:00 → NOCHE
```
Esto elimina la duplicación de datos y posibles inconsistencias. El calendario sigue funcionando con barras por tercios, calculadas desde las horas exactas.

### 1.4 Vista por día en pantalla grande

> Cliente: *"Hacer vista por día, él quiere ponerlo en una pantalla. En un día se pueden tener hasta 8 eventos, se deben hacer más grande el calendario. Vista más larga de eventos."*

**Decisión:** Nueva vista "Día" en el calendario, diseñada para pantalla grande/TV. Layout horizontal de 8+ columnas para eventos simultáneos con el nombre del cliente visible.

### 1.5 Ubicación: propiedad de QuoteSpace, no de Quote ✅

**Decisión (confirmada):** Los campos `locationType`, `locationId`, `locationName`, `schedules` se **eliminan** de `Quote`. La ubicación pertenece semánticamente a cada espacio del evento, no a la cotización en sí. `Quote` solo retiene `eventDate`, `guestCount`, `currency`, `totalAmount`, `status`, `notes`.

Esto resuelve el P0 de duplicación de datos detectado en la revisión de arquitectura/backend.

### 1.6 Cancelación: nuevo estado terminal CANCELADO ✅

**Decisión (confirmada):** Se agrega `CANCELADO` como estado terminal accesible desde `CONFIRMADA` y `EN_EJECUCION`. Solo aplica sobre quotes ya confirmadas (no tiene sentido cancelar un borrador o una enviada — para eso existe `NO_CONFIRMADA`).

Al cancelar: la Reservation asociada se marca `CANCELADO`, los pagos quedan registrados, el espacio se libera en el calendario, la Quote es terminal (no se reabre).

### 1.7 Simplificación: FINALIZADA como único estado terminal ✅

**Decisión (confirmada):** Siguiendo el principio de no agregar complejidad innecesaria, `FINALIZADA` es el único estado terminal que significa "evento terminado y liquidado". No se crea un estado `LIQUIDADA` separado. La acción de liquidar es un botón/dialog dentro de `EN_EJECUCION` que mueve a `FINALIZADA`.

### 1.8 Inmutabilidad post-confirmación ✅

**Decisión (confirmada):** Una Quote `CONFIRMADA` **no se edita**. Si el cliente necesita cambios:

1. Se **cancela** la Quote actual → `CANCELADO` (libera el espacio, la Reservation se cancela)
2. El usuario crea una **nueva cotización desde cero** (sin pre-llenar, sin vincular a la anterior)

---

## 2. FASE 0 — SCHEMA Y TIPOS (Base)

> **ESTIMACIÓN:** 2-3 días
> **DEPENDENCIAS:** Ninguna
> **IMPACTO:** Todo el sistema

### 2.1 Cambios en `prisma/schema.prisma`

#### 2.1.1 Nuevo modelo: `ExchangeRate`
```prisma
model ExchangeRate {
  id            String   @id @default(cuid())
  fromCurrency  String   @default("USD")  // moneda origen
  toCurrency    String   @default("GTQ")  // moneda destino
  rate          Float                     // 1 USD = X GTQ
  updatedBy     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### 2.1.2 ~~Nuevo modelo: `Menu`~~ → ELIMINADO (absorbido por Product)

Los menús son `Product` con `category = "COMIDA_MENU"` y un campo `menuType` (DESAYUNO, REFACCION, COFFEE_BREAK, ALMUERZO, CENA). QuoteItem referencia `productId`, no se necesita `menuId`.

#### 2.1.3 Nuevo modelo: `QuoteSpace`
```prisma
// Espacios dentro de una cotización (varios por Quote)
model QuoteSpace {
  id           String   @id @default(cuid())
  quoteId      String
  quote        Quote    @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  locationType String   // FREE_AREA, DINING_ROOM, HALL, ROOM, GARDEN, TERRACE
  locationId   String
  locationName String
  startTime    String   // "14:30" — fuente de verdad del horario
  endTime      String   // "16:45"
  pricingMode  String   @default("PER_SPACE") // PER_PERSON, PER_SPACE
  unitPrice    Float    @default(0)
  totalPrice   Float    @default(0)
  notes        String?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([quoteId])
  @@index([locationType, locationId])  // Para detección de conflictos
}

// El bloque (MANANA/TARDE/NOCHE) se deriva al vuelo:
//   07:00-13:00 → MANANA, 14:00-19:00 → TARDE, 20:00-01:00 → NOCHE
```

#### 2.1.4 Modificaciones a `Quote`

**CAMPOS A ELIMINAR** (pasan a `QuoteSpace`, ver decisión 1.5):
| Campo | Motivo |
|-------|--------|
| `locationType` | La ubicación pertenece al espacio, no a la cotización |
| `locationId` | Ídem |
| `locationName` | Ídem |
| `schedules` | El horario pertenece a cada `QuoteSpace` |
| `reservationType` | Se infiere del tipo de espacios (si tiene Room → HABITACION, sino → EVENTO) |

**CAMPOS NUEVOS:**
| Campo | Tipo | Default | Motivo |
|-------|------|---------|--------|
| `currency` | `String` | `"GTQ"` | Q18-19: Moneda de la cotización (GTQ/USD) |
| `exchangeRate` | `Float` | `1` | Q18: Tasa de cambio al momento de cotizar |
| `guestCount` | `Int?` | — | Q30: Cantidad de asistentes |
| `sentAt` | `DateTime?` | — | Q10: Fecha de envío al cliente |
| `expiresAt` | `DateTime?` | — | Q2: `sentAt + 15 días hábiles` |
| `confirmedAt` | `DateTime?` | — | Cuándo se confirmó (anticipo recibido) |
| `executedAt` | `DateTime?` | — | Cuándo entró en ejecución |
| `finishedAt` | `DateTime?` | — | Cuándo se finalizó/liquidó |
| `cancelledAt` | `DateTime?` | — | Cuándo se canceló |
| `discountType` | `String?` | — | PERCENT, FIXED — descuento global |
| `discountValue` | `Float` | `0` | Valor del descuento global |
| `subtotal` | `Float` | `0` | Total antes de descuento |
| `totalAmount` | `Float` | `0` | Total después de descuento (recalculado server-side) |

Relaciones nuevas:
```prisma
spaces        QuoteSpace[]

@@index([status, eventDate])  // Para queries de calendario
@@index([expiresAt])          // Para detección de quotes vencidas
```

#### 2.1.5 Modificaciones a `QuoteItem`
| Campo | Tipo | Default | Motivo |
|-------|------|---------|--------|
| `scheduledDate` | `DateTime?` | — | Q7: Fecha del ítem de comida |
| `startTime` | `String?` | — | Q14: Hora inicio (HH:MM) |
| `endTime` | `String?` | — | Q14: Hora fin (HH:MM) |
| `pricingMode` | `String?` | — | PER_PERSON, PER_SPACE, PER_UNIT |
| `discountType` | `String?` | — | Q22: PERCENT, FIXED — por ítem |
| `discountValue` | `Float` | `0` | Q22: Valor descuento por ítem |

#### 2.1.6 Modificaciones a `Reservation` (simplificada)

**CAMPOS A ELIMINAR** (ya viven en Quote/QuoteSpace):
| Campo | Motivo |
|-------|--------|
| `reservationType` | Se infiere de los espacios |
| `locationType`, `locationId`, `locationName` | En QuoteSpace |
| `startSchedule`, `endSchedule`, `schedules` | Derivado de QuoteSpace.startTime |
| `totalAmount`, `observations` | En Quote |

**CAMPOS NUEVOS:**
| Campo | Tipo | Motivo |
|-------|------|--------|
| `currency` | `String @default("GTQ")` | Heredado de Quote |
| `exchangeRate` | `Float @default(1)` | Heredado de Quote |
| `guestCount` | `Int?` | Heredado de Quote |

Reservation queda como un registro operativo liviano: `quoteId`, `startDate`, `endDate`, `paidAmount`, `status`, `paymentStatus`.

#### 2.1.7 Modificaciones a `Room`
| Campo | Tipo | Motivo |
|-------|------|--------|
| `pricePerPerson` | `Float?` | Q15: Precio alternativo por persona |

#### 2.1.8 Modificaciones a `Client`
| Campo | Tipo | Default | Motivo |
|-------|------|---------|--------|
| `category` | `String` | `"REGULAR"` | Q21: BUENO, REGULAR, DELICADO, EN_OBSERVACION |
| `clientType` | (existente) | — | Ya existe: PARTICULAR, EMPRESA, IGLESIA, INSTITUCION |

#### 2.1.9 Modificaciones a `Payment`
| Campo | Tipo | Motivo |
|-------|------|--------|
| `currency` | `String @default("GTQ")` | Q20: Moneda del pago (GTQ o USD) |
| `exchangeRate` | `Float?` | Q20: Tasa al momento del pago |
| `amountGTQ` | `Float?` | Q20: Equivalente en quetzales |

#### 2.1.10 Nuevo modelo: `DailyClosing`
```prisma
model DailyClosing {
  id              String   @id @default(cuid())
  date            DateTime @unique  // Fecha del cierre
  totalEvents     Int               // Total eventos del día
  completedEvents Int               // Eventos finalizados/liquidados
  totalCollected  Float             // Total cobrado
  pendingAmount   Float             // Pendiente de cobro
  incidents       String?           // Incidencias reportadas
  createdBy       String
  createdAt       DateTime @default(now())
}
```

#### 2.1.11 Nuevo modelo: `Location` (unifica FreeArea, DiningRoom, Hall, Garden, Terrace)

**Se ELIMINAN los modelos:** `FreeArea`, `DiningRoom`, `Hall`, `Garden` del schema existente.
**Se reemplazan por un solo modelo genérico:**

```prisma
model Location {
  id          String   @id @default(cuid())
  name        String   @unique
  type        String   // FREE_AREA, DINING_ROOM, HALL, GARDEN, TERRACE
  capacity    Int?
  description String?
  unitPrice   Float    @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

`Room` se mantiene separado (tiene jerarquía Building→Floor, camas, foto, estados de habitación).

#### 2.1.12 Modificaciones a `Product` (absorbe CrystalWare + Menu)

| Campo | Tipo | Default | Motivo |
|-------|------|---------|--------|
| `category` | `String` | — | + PLATOS, CUBIERTOS, PICHELES, VASOS, COPAS |
| `menuType` | `String?` | — | DESAYUNO, REFACCION, COFFEE_BREAK, ALMUERZO, CENA |
| `quantity` | `Int` | `0` | Stock disponible (nuevo) |
| `isFree` | `Boolean` | `false` | Q16-17: Amenidades sin costo |
| `pricePerDay` | `Float?` | — | Q16: Parqueo por día |
| `pricePerHour` | `Float?` | — | Q16: Parqueo por hora |

#### 2.1.14 Nuevo modelo: `EmailLog`
```prisma
model EmailLog {
  id          String   @id @default(cuid())
  quoteId     String?
  quote       Quote?   @relation(fields: [quoteId], references: [id])
  type        String   // SENT_TO_CLIENT, SENT_TO_ACCOUNTING, RESENT
  sentTo      String
  sentBy      String
  sentAt      DateTime @default(now())
  status      String   @default("SENT") // SENT, FAILED
  error       String?
}
```

### 2.2 Cambios en `src/types/index.ts`

#### 2.2.1 Nuevos tipos union
```typescript
export type QuoteStatus = 'BORRADOR' | 'ENVIADA' | 'NO_CONFIRMADA' | 'CONFIRMADA' | 'EN_EJECUCION' | 'CANCELADO' | 'FINALIZADA'
export type ClientCategory = 'BUENO' | 'REGULAR' | 'DELICADO' | 'EN_OBSERVACION'
export type Currency = 'GTQ' | 'USD'
export type PricingMode = 'PER_PERSON' | 'PER_SPACE' | 'PER_UNIT'
export type DiscountType = 'PERCENT' | 'FIXED'
export type MenuType = 'DESAYUNO' | 'REFACCION' | 'COFFEE_BREAK' | 'ALMUERZO' | 'CENA'
export type ProductCategory = 'COMIDA_MENU' | 'MOBILIARIO' | 'ADORNOS_DECORACION' | 'SERVICIOS_ADICIONALES' | 'PLATOS' | 'CUBIERTOS' | 'PICHELES' | 'VASOS' | 'COPAS'
export type LocationType = 'FREE_AREA' | 'DINING_ROOM' | 'HALL' | 'ROOM' | 'GARDEN' | 'TERRACE'
```

#### 2.2.2 Nuevos labels
```typescript
export const quoteStatusLabelsV2: Record<QuoteStatus, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada a Cliente',
  NO_CONFIRMADA: 'No Confirmada',
  CONFIRMADA: 'Confirmada / Pago Anticipo Recibido',
  EN_EJECUCION: 'En Ejecución',
  FINALIZADA: 'Finalizada y Entregada con Liquidación / Pago Recibido',
}

export const quoteStatusColorsV2: Record<QuoteStatus, string> = {
  BORRADOR: '#9ca3af',        // gray
  ENVIADA: '#6b7280',         // gris oscuro (como pidió el cliente)
  NO_CONFIRMADA: '#ef4444',   // red
  CONFIRMADA: '#22c55e',      // verde (como pidió el cliente)
  EN_EJECUCION: '#a855f7',    // morado (como pidió el cliente: pendiente de pago final)
  FINALIZADA: '#dc2626',      // rojo (como pidió el cliente: finalizado rojo)
}

export const clientCategoryLabels: Record<ClientCategory, string> = {
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  DELICADO: 'Delicado',
  EN_OBSERVACION: 'En Observación',
}
```

#### 2.2.3 Actualizar interfaces
- `QuoteFormData`: Agregar `currency`, `guestCount`, `spaces`, `discountType`, `discountValue`
- `QuoteItemFormData`: Agregar `menuId`, `scheduledDate`, `startTime`, `endTime`, `pricingMode`, `discountType`, `discountValue`
- `QuoteSpaceFormData`: Nueva interfaz con `locationType`, `locationId`, `startTime`, `endTime`, `pricingMode`, `unitPrice`

### 2.3 Cambios en `src/lib/utils.ts`

```typescript
// Format currency con soporte multi-moneda
export function formatCurrency(amount: number, currency: string = 'GTQ'): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'GTQ',
  }).format(amount)
}

// Calcular fecha de expiración (15 días hábiles)
export function calculateExpiryDate(sentDate: Date, validityDays: number = 15): Date {
  let daysAdded = 0
  const result = new Date(sentDate)
  while (daysAdded < validityDays) {
    result.setDate(result.getDate() + 1)
    if (result.getDay() !== 0 && result.getDay() !== 6) daysAdded++
  }
  return result
}

// Derivar bloque de horario (MANANA/TARDE/NOCHE) desde HH:MM
export function getScheduleFromTime(time: string): string | null {
  const [h] = time.split(':').map(Number)
  if (h >= 7 && h < 13) return 'MANANA'
  if (h >= 14 && h < 19) return 'TARDE'
  if (h >= 20 || h < 1) return 'NOCHE'
  return null
}
```

---

## 3. FASE 1 — UNIFICAR RESERVACIÓN → COTIZACIÓN

> **ESTIMACIÓN:** 1-2 días
> **DEPENDENCIAS:** Fase 0

### 3.1 Cambio: Eliminar creación standalone de Reservación
- **Archivo:** `src/app/(dashboard)/reservations/page.tsx`
- Quitar botón "Nueva Reservación"
- Quitar el Dialog de creación de reservación
- El calendario sigue mostrando las reservaciones (que ahora se crean desde Quotes)

### 3.2 Cambio: Botón "Cotizar" en calendario
- **UI:** Al hacer clic en un día del calendario, en vez de abrir el form de reservación, abrir el form de **nueva cotización**
- **Pre-fill:** Fecha seleccionada del calendario

### 3.3 Cambio: Auto-crear Reservation al confirmar Quote
- **API:** `PATCH /api/quotes/[id]/status` con `status: "CONFIRMADA"`
- **Lógica:** Al confirmar, crear automáticamente una `Reservation` vinculada (`reservationId`)
- **Datos heredados:** `startDate`, `endDate`, `locationType`, `locationId`, `locationName`, `totalAmount`, `guestCount`, `currency`, `exchangeRate`, `discountType`, `discountValue`
- **Schedules:** Calcular `startSchedule`/`endSchedule` desde los `QuoteSpace`

### 3.4 Cambio: Sidebar navigation
- **Archivo:** `src/app/(dashboard)/layout.tsx`
- Renombrar "Reservaciones" → "Calendario" o mantener "Reservaciones" pero el contenido es el calendario con cotizaciones
- Asegurar que "Cotizaciones" quede como el CRUD principal

### 3.5 Cambio: Eliminar API de creación standalone de Reservation
- **Archivo:** `src/app/api/reservations/route.ts`
- Mantener GET (para calendario) y PATCH (para cambios de estado)
- El POST `/api/reservations` solo debe usarse internamente (desde Quote confirmation)

---

## 4. FASE 2 — COTIZACIONES CON MÚLTIPLES ESPACIOS Y HORARIOS

> **ESTIMACIÓN:** 2-3 días
> **DEPENDENCIAS:** Fase 0, Fase 1

### 4.1 Cambio: Form de cotización con múltiples espacios
- **UI:** En el form de nueva cotización, sección "Espacios" donde se pueden agregar/quitar espacios
- **Cada espacio tiene:**
  - Tipo de ubicación (dropdown: Salón, Jardín, Área Libre, Comedor, Habitación, Terraza)
  - Ubicación específica (filtrada por tipo)
  - Hora inicio (HH:MM) — solo horas con minutos (Q14 corregida)
  - Hora fin (HH:MM)
  - Modo de precio: "Precio fijo" o "Precio por persona"
  - Precio unitario
  - Subtotal auto-calculado

### 4.2 Cambio: Validación de conflictos
- **Lógica:** Al agregar un espacio, verificar si ya existe otra cotización (de cualquier estado) para ese espacio en esa fecha/hora
- **UI:** Si hay conflicto, mostrar warning: "Otro cliente tiene este espacio en esta fecha/hora pero no ha confirmado. ¿Desea continuar?"
- **Q1:** Se muestran todas las cotizaciones — borrador, enviadas, confirmadas, no confirmadas

### 4.3 Cambio: API `POST/PUT /api/quotes`
- Aceptar array `spaces` con los campos de `QuoteSpace`
- Crear `QuoteSpace` records vinculados

### 4.4 Cambio: API `GET /api/quotes/[id]`
- Incluir `spaces: true` en el include

### 4.5 Cambio: Hora exacta en el detalle y calendario
- Mostrar `startTime` y `endTime` junto a los bloques de horario
- En el tooltip del calendario, mostrar "Salón 1: 13:00 — 15:00"

### 4.6 Cambio: Detalle de cotización con espacios
- **UI:** En el dialog de detalle, mostrar tabla de espacios con sus horarios y precios

---

## 5. FASE 3 — MENÚS, COMIDAS Y FECHAS/HORAS POR DÍA

> **ESTIMACIÓN:** 1 día (simplificado — sin CRUD separado)
> **DEPENDENCIAS:** Fase 0, Fase 1

### 5.1 Cambio: Menús como Products con menuType
- **No requiere modelo ni API separada.** Los menús son `Product` con `category = "COMIDA_MENU"` y `menuType` (DESAYUNO, REFACCION, COFFEE_BREAK, ALMUERZO, CENA).
- **UI:** El CRUD de productos existente ya los cubre. Agregar filtro por `menuType` en la página de productos.
- **Tipos:** Desayuno, Refacción, Coffee Break, Almuerzo, Cena (Q8-9).

### 5.2 Cambio: Selector de comidas en cotización
- **UI:** En el form de cotización, sección "Comidas" con:
  - Selector de fecha (por cada día del evento)
  - Selector de hora inicio (HH:MM)
  - Selector de tipo de comida → filtra productos por `menuType`
  - Selector de producto del catálogo → auto-completa precio
  - Campo "Cantidad de personas" → auto-calcula subtotal
- **Lógica:** Se pueden agregar múltiples comidas por día (Q7)
- **Q9:** Cada menú es un solo elemento, precio por persona/plato unitario

### 5.3 Cambio: QuoteItem con fecha y hora
- **API:** Al crear QuoteItem de tipo `COMIDA_MENU`, almacenar `scheduledDate`, `startTime`, `endTime`
- **Display:** Agrupar ítems por fecha en el detalle

---

## 6. FASE 4 — MONEDA, DESCUENTOS, PRECIOS

> **ESTIMACIÓN:** 2 días
> **DEPENDENCIAS:** Fase 0

### 6.1 Cambio: Tipo de cambio
- **API:** `GET/POST /api/settings/exchange-rate`
- **UI:** Página `/settings/exchange-rate`
  - Mostrar tasa actual (1 USD = X GTQ)
  - Formulario para actualizar
  - Historial de cambios
- **Q18:** Actualizado manualmente, debe llevar un área

### 6.2 Cambio: Moneda en cotización
- **UI:** Selector GTQ / USD al crear cotización
- **Lógica:** Al seleccionar USD, usar `exchangeRate` vigente para convertir precios
- **Q18 corregida:** En la cotización se debe preseleccionar el tipo de moneda
- **Q19:** No se mezclan — una sola moneda por cotización

### 6.3 Cambio: Pagos en dólares
- **UI:** Al registrar pago, mostrar moneda de la cotización
- **Lógica:** Si cotización es en USD, el pago se registra en USD
- **Q20 corregida:** Al momento de pagar, se cobra en Quetzales al tipo de cambio del día
- **Campo:** `amountGTQ` para guardar el equivalente

### 6.4 Cambio: Descuento por ítem y global
- **Q22 corregida:** El descuento debe ser por ítem, no en el total
- **UI por ítem:** En cada línea de la cotización, dropdown (% o $ fijo) + campo de valor
- **Cálculo:** `totalPrice = (quantity * unitPrice) - discount`
- **UI global (opcional):** Campo de descuento global al final de la cotización

### 6.5 Cambio: Modo de precio por espacio
- **Q6:** Se puede seleccionar precio por persona o precio fijo por espacio
- **UI:** En cada `QuoteSpace`, toggle entre "Precio fijo" y "Precio por persona"
- **Lógica:** Si es por persona, `totalPrice = guestCount * unitPrice`

### 6.6 Cambio: Habitaciones con precio dual
- **Q15:** Las habitaciones pueden tener precio por noche y/o por persona
- **Schema:** Campo `pricePerNight` (existente) + `pricePerPerson` (nuevo)
- **UI:** Al cotizar habitación, seleccionar modo de precio

---

## 7. FASE 5 — ESTADOS DE COTIZACIÓN Y FLUJO COMPLETO

> **ESTIMACIÓN:** 2-3 días
> **DEPENDENCIAS:** Fase 0, Fase 1

### 7.1 Cambio: Nuevos estados
**Estados definidos por el cliente + CANCELADO:**
| Estado | Significado | Color |
|--------|-------------|-------|
| `BORRADOR` | Cotización en edición | Gray |
| `ENVIADA` | Enviada al cliente | **Gris** |
| `NO_CONFIRMADA` | Venció sin respuesta (15 días hábiles) | Red |
| `CONFIRMADA` | Pago anticipo recibido → se crea Reservation | **Verde** |
| `EN_EJECUCION` | Día del evento, dashboard activo | **Morado** |
| `CANCELADO` | Evento cancelado post-confirmación (terminal) | **Rojo oscuro** |
| `FINALIZADA` | Liquidada, pago recibido completo (terminal) | **Rojo** |

### 7.2 Cambio: Actualizar `QuoteStatus` type
- **Archivo:** `src/types/index.ts`
- Nuevo union: `'BORRADOR' | 'ENVIADA' | 'NO_CONFIRMADA' | 'CONFIRMADA' | 'EN_EJECUCION' | 'CANCELADO' | 'FINALIZADA'`
- `RECHAZADA` y `APROBADA` se eliminan del type (datos existentes se manejan en DB de pruebas)

### 7.3 Cambio: Transiciones de estado (máquina de estados server-side)
| Desde | → | Hasta | Acción | Guard |
|-------|---|-------|--------|-------|
| BORRADOR | → | ENVIADA | Botón "Enviar" | `spaces.length > 0` |
| ENVIADA | → | CONFIRMADA | Botón "Confirmar" | Pago anticipo registrado. **$transaction**: crea Reservation. |
| ENVIADA | → | NO_CONFIRMADA | Auto/Botón | `expiresAt < now` |
| NO_CONFIRMADA | → | ENVIADA | Botón "Reenviar" | Actualiza `sentAt`, recalcula `expiresAt` |
| CONFIRMADA | → | EN_EJECUCION | Auto/Manual | Fecha del evento = hoy |
| CONFIRMADA | → | CANCELADO | Botón "Cancelar" | Marca Reservation como CANCELADO. Terminal. |
| EN_EJECUCION | → | FINALIZADA | Botón "Liquidar" | Pago 100% completo. Terminal. |
| EN_EJECUCION | → | CANCELADO | Botón "Cancelar" | Marca Reservation como CANCELADO. Terminal. |

**Validación server-side obligatoria:** El endpoint `PATCH /api/quotes/[id]/status` debe validar que la transición es válida antes de ejecutarla. El frontend no es confiable para esto.

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  BORRADOR: ['ENVIADA'],
  ENVIADA: ['CONFIRMADA', 'NO_CONFIRMADA'],
  NO_CONFIRMADA: ['ENVIADA'],
  CONFIRMADA: ['EN_EJECUCION', 'CANCELADO'],
  EN_EJECUCION: ['FINALIZADA', 'CANCELADO'],
  CANCELADO: [],    // terminal
  FINALIZADA: [],   // terminal
}
```

**Race condition en confirmación:** Usar `prisma.$transaction`:
```typescript
const result = await prisma.$transaction(async (tx) => {
  const quote = await tx.quote.findUnique({ where: { id }, select: { reservationId: true } })
  if (quote?.reservationId) throw new Error("Ya existe una reservación para esta cotización")
  // Crear Reservation + actualizar Quote en la misma transacción
})
```

### 7.4 Cambio: Reenviar (Q11 corregida)
- **Q11 corregida:** SÍ se puede reenviar una cotización no confirmada
- **UI:** En `NO_CONFIRMADA`, botón "Reenviar" que actualiza `sentAt` y recalcula `expiresAt`
- **Lógica:** No se crea una nueva, se reenvía la misma. La Quote vuelve a `ENVIADA`.

### 7.5 Cambio: Validez y expiración (Q2)
- **Q2:** Valor fijo de 15 días hábiles
- **Lógica:** `expiresAt = calculateExpiryDate(sentAt, 15)`
- **UI:** Badge "Vence en X días" o "Vencida" en la tabla de cotizaciones
- **Job:** Al cargar la página de cotizaciones, marcar automáticamente expiradas como `NO_CONFIRMADA`

### 7.6 Cambio: Dashboard del día (EN_EJECUCION)
- **Q12:** Cuando llega la fecha del evento, marcar `EN_EJECUCION`
- **UI:** Vista "Dashboard del día" para empleados, mostrando horarios y clientes del día
- **Acceso:** ENCARGADO_EVENTO y roles relevantes

### 7.7 Cambio: Inmutabilidad post-confirmación ✅

Quote `CONFIRMADA` es inmutable. Si el cliente necesita cambios: cancelar → nueva cotización desde cero. Ver decisión 1.8.

---

## 8. FASE 6 — CALENDARIO MEJORADO

> **ESTIMACIÓN:** 2-3 días
> **DEPENDENCIAS:** Fase 1, Fase 2

### 8.1 Cambio: Mostrar cotizaciones en calendario
- **Lógica:** El calendario muestra `Quote` records (antes mostraba `Reservation`)
- **Filtro:** Incluir TODOS los estados — BORRADOR, ENVIADA, NO_CONFIRMADA, CONFIRMADA, EN_EJECUCION, FINALIZADA
- **Visual:** Cada estado con su color de `quoteStatusColorsV2`:
  - BORRADOR: gris claro
  - ENVIADA: gris oscuro
  - NO_CONFIRMADA: rojo
  - CONFIRMADA: verde
  - EN_EJECUCION: morado
  - FINALIZADA: rojo oscuro

### 8.2 Cambio: Vista por día (nueva)
- **Cliente:** "Hacer vista por día, él quiere ponerlo en una pantalla"
- **UI:** Nueva pestaña "Día" en el calendario
- **Layout:** Vista horizontal optimizada para pantalla grande/TV
- **Contenido:** Columnas para cada espacio/ubicación usada ese día
- **Info:** Nombre del cliente, horario, estado (visible a distancia)
- **Hasta 8 eventos simultáneos**

### 8.3 Cambio: Calendario más grande
- **Cliente:** "En un día se pueden tener hasta 8 eventos, se deben hacer más grande el calendario"
- **UI:** Aumentar altura de filas/celdas, modo "expandido"
- **Vista semanal más larga** para mostrar más eventos por día

### 8.4 Cambio: Nombre del cliente en barra de calendario
- **Cliente:** "En el mapa lleva el nombre del cliente también en la vista que puede ser más larga"
- **UI:** Mostrar nombre del cliente en las barras del calendario (ya existe parcialmente, asegurar visibilidad)

### 8.5 Cambio: Botón "Cotizar" desde calendario
- **Q1:** Al hacer clic en un día vacío, abrir form de cotización con fecha pre-llenada
- Si hay cotizaciones existentes para ese día, mostrarlas y permitir nueva cotización con advertencia

---

## 9. FASE 7 — HABITACIONES

> **ESTIMACIÓN:** 1-2 días
> **DEPENDENCIAS:** Fase 0

### 9.1 Cambio: CRUD de habitaciones mejorado
- **Modelo Room ya existe** con `Building → Floor → Room`
- **Agregar:** `pricePerPerson` (Fase 0)
- **UI:** Página de catálogo de habitaciones con:
  - Tabla mostrando: Nombre, Edificio, Piso, Capacidad, Tipo Cama, Precio/Noche, Precio/Persona, Estado
  - Formulario con foto (upload a `/public/uploads/rooms/`)
  - Estados: Disponible, Reservada, Ocupada, Mantenimiento (Q24: Están bien así)

### 9.2 Cambio: Hospedaje independiente
- **Q23:** Las habitaciones se reservan también para hospedaje independiente (sin evento)
- **Lógica:** Cotización con `reservationType = HABITACION` y sin espacios de evento
- **UI:** En el form de cotización, opción "Solo hospedaje"

---

## 10. FASE 8 — CATÁLOGOS EDITABLES

> **ESTIMACIÓN:** 2-3 días (reducido por unificación de Location)
> **DEPENDENCIAS:** Fase 0

### 10.1 Cambio: Ubicaciones unificadas (CRUD único)
- **Modelo:** `Location` con campo `type` (FREE_AREA, DINING_ROOM, HALL, GARDEN, TERRACE)
- **API:** `GET/POST /api/locations`, `GET/PUT/DELETE /api/locations/[id]`
- **UI:** Página `/catalog/locations`
  - Tabla con columnas: Nombre, Tipo, Capacidad, Precio, Activo
  - Filtro por tipo
  - Dialog para crear/editar con selector de tipo
- **Clientes existentes:** `FreeArea`, `DiningRoom`, `Hall`, `Garden` se migran a `Location` con su `type` correspondiente. `TERRACE` es el nuevo tipo.

### 10.2 Cambio: Cristalería (como categorías de Product)
- **No requiere modelo separado.** Los tipos PLATOS, CUBIERTOS, PICHELES, VASOS, COPAS son categorías de `Product`.
- **UI:** En la página `/catalog/products`, el filtro de categoría incluye los tipos de cristalería.
- **Cotización:** Se agregan como ítems normales desde el catálogo de productos.

### 10.3 Cambio: Amenidades y Parqueo
- **Schema:** `Product.isFree`, `Product.pricePerDay`, `Product.pricePerHour` (Fase 0)
- **UI:** En form de producto: checkbox "Sin costo", radio "Precio por día/hora/fijo"

### 10.4 Cambio: Costos configurables en cotización
- **UI:** En cada ítem, checkbox "Incluir costo" (default: true). Si se desmarca → precio 0 en esa cotización.

---

## 11. FASE 9 — CLIENTES

> **ESTIMACIÓN:** 1 día
> **DEPENDENCIAS:** Fase 0

### 11.1 Cambio: Categorización de cliente
- **Q21:** Solo de referencia, no afecta precios
- **Schema:** `Client.category` con valores BUENO, REGULAR, DELICADO, EN_OBSERVACION (Fase 0)
- **UI:** En form de cliente, dropdown de categoría
- **Display:** Badge de color en tabla de clientes y en detalle de cotización

### 11.2 Cambio: Colores de categoría
| Categoría | Color |
|-----------|-------|
| BUENO | Verde |
| REGULAR | Azul |
| DELICADO | Naranja/Ámbar |
| EN_OBSERVACION | Rojo |

---

## 12. FASE 10 — LIQUIDACIÓN, CIERRES Y EMAIL A CONTABILIDAD

> **ESTIMACIÓN:** 2-3 días
> **DEPENDENCIAS:** Fase 5

### 12.1 Cambio: Liquidación de evento
- **Q25:** Debe llevar la liquidación del evento: qué pagó, qué devolvió
- **UI:** Botón "Liquidar" en cotización/reservación `EN_EJECUCION`
- **Form:** Resumen de pagos, devoluciones, mobiliario retornado, daños
- **Validación:** Debe estar cobrado al 100%

### 12.2 Cambio: Email a contabilidad (Resend)
- **Proveedor:** [Resend](https://resend.com) — API de email transaccional
- **Setup:** `npm install resend @react-email/components`, `RESEND_API_KEY` en `.env`
- **Código:** Cliente en `src/lib/email.ts`, templates React en `src/emails/liquidacion.tsx`
- **Q26 corregida:** Botón manual "Enviar a Contabilidad" (no automático)
- **Q27:** Correo pendiente de preguntar al cliente
- **Schema:** `EmailLog` para tracking de envíos (Fase 0)
- **Contenido del email:** datos del cliente, resumen de cotización, total cobrado, devoluciones, mobiliario retornado/dañado, incidencias
- **Credenciales:** ⚠️ Pendientes (free tier: 100 emails/día, suficiente para pruebas)

### 12.3 Cambio: Cierres diarios y semanales
- **Q28:** Verificar que estén cobrados al 100% y detalles de la orden, si hubo inconvenientes en la liquidación
- **Q29:** Puede ser ambos: automático y botón para descargar
- **Schema:** `DailyClosing` (Fase 0)
- **API:** `GET/POST /api/closings/daily`, `GET /api/closings/weekly`
- **UI:** Página `/reports/closings`
  - Selector de fecha para cierre diario
  - Selector de semana para cierre semanal
  - Resumen: eventos totales, completados, cobrado, pendiente, incidencias
  - Botón "Descargar PDF"
- **Auto-generación:** Job programado (cron) que genera cierre al final del día

---

## 13. FASE 11 — ROLES Y PERMISOS (PENDIENTE CLIENTE)

> **ESTIMACIÓN:** TBD
> **DEPENDENCIAS:** Esperar definición del cliente

### 13.1 Estado actual
- **Cliente:** "Pendiente al finalizar el sistema general ya se definen los roles, pero sí se brindará esta información"
- **Sistema actual:** `rolePermissions` en `src/types/index.ts` con 7 roles predefinidos
- **Acción:** Mantener la estructura actual, agregar módulos nuevos (`menus`, `crystalware`, `terraces`, `closings`)

### 13.2 Módulos nuevos para permisos
- `catalog`: Gestión de catálogos (ubicaciones, productos, menús)
- `exchangeRate`: Gestión del tipo de cambio
- `closings`: Cierres diarios/semanales
- `email`: Envío de correos a contabilidad

---

## 14. ORDEN DE EJECUCIÓN RECOMENDADO

| # | Fase | Descripción | Est. | Dep. |
|---|------|-------------|------|------|
| **1** | **Fase 0** | Schema + Tipos (base) | 2-3d | — |
| **2** | **Fase 1** | Unificar Quote ↔ Reservation | 1-2d | F0 |
| **3** | **Fase 2** | Múltiples espacios y horarios | 2-3d | F0, F1 |
| **4** | **Fase 5** | Estados de cotización (nuevo flujo + CANCELADO) | 2-3d | F0, F1 |
| **5** | **Fase 6** | Calendario mejorado ⬆ (sube de #13) | 2-3d | F1, F2, F5 |
| **6** | **Fase 4** | Moneda, descuentos, precios ⬆ (antes de menús) | 2d | F0 |
| **7** | **Fase 3** | Menús y comidas (sin CRUD separado) | 1d | F0, F1, F4 |
| **8** | **Fase 8** | Catálogos (ubicaciones unificadas, cristalería, amenidades) | 2-3d | F0 |
| **9** | **Fase 7** | Habitaciones | 1-2d | F0, F8 |
| **10** | **Fase 9** | Categorización clientes | 1d | F0 |
| **11** | **Fase 10** | Liquidación, cierres, email | 3-4d | F5, F4 |
| **12** | **Fase 11** | Roles y permisos | TBD | Esperar |

### Resumen de tiempos

| Concepto | Días |
|----------|------|
| Schema + tipos (base) | 2-3 |
| Lógica core (F1-F5) | 7-11 |
| Calendario (F6) | 2-3 |
| Moneda + Menús (F3-F4) | 4 |
| Catálogos (F7-F9) | 4-6 |
| Cierres y liquidación (F10) | 3-4 |
| Roles (F11) | TBD |
| **Total** | **~22-30 días** |

> ⚠️ El estimado de frontend puede ser mayor. Las revisiones detectaron que el plan subestima la complejidad del form de cotización multi-espacio (~2-3 días extra) y el wizard de liquidación (~2-3 días extra).

---

## NOTAS IMPORTANTES

1. **Correcciones del dueño a tener en cuenta:**
   - Q11: SÍ se puede reenviar una cotización no confirmada
   - Q14: Horas con minutos (ej: 13:15), no solo horas en punto
   - Q18: En la cotización se preselecciona la moneda. Cotizaciones en $ y Q.
   - Q20: Al pagar se cobra en Quetzales al tipo de cambio del día
   - Q22: Descuento por ítem, no en el total
   - Q26: Botón manual para enviar, no automático

2. **Modelos que ya existen y solo requieren modificaciones:**
   - `Quote`, `QuoteItem`, `Reservation`, `Room`, `Client`, `Payment`, `Product`

3. **Modelos NUEVOS a crear:**
   - `Location` (unifica FreeArea, DiningRoom, Hall, Garden, + Terrace)
   - `ExchangeRate`, `Menu`, `QuoteSpace`, `DailyClosing`, `EmailLog`

4. **Modelos a ELIMINAR:**
   - `FreeArea`, `DiningRoom`, `Hall`, `Garden` → unificados en `Location`
   - `WorkOrder` → no fue pedido por el cliente en Reunión 2

5. **Páginas NUEVAS a crear:**
   - `/catalog/locations` (unificada)
   - `/settings/exchange-rate`
   - `/reports/closings`

6. **Páginas que se ELIMINAN:**
   - `/reservations` standalone creation (absorbido por Quotes + Calendario)
   - Páginas individuales de FreeArea, DiningRoom, Hall, Garden (unificadas)

7. **Migración de datos existentes:**
   - `FreeArea`, `DiningRoom`, `Hall`, `Garden` → `Location` con `type` correspondiente
   - Quotes sin `currency` → asumir `GTQ`
   - Crear Reservation para Quotes `CONFIRMADA` que no tengan una asociada

8. **Pendiente del cliente:**
   - Roles y permisos: el cliente dijo que definirá roles al finalizar el sistema general (Fase 11 pendiente).

---

*Documento generado el 2026-05-29 — Actualizado con decisiones de entrevista y revisiones. Sujeto a cambios según feedback del cliente.*
