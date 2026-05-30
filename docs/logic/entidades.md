# Entidades del Sistema — Villas Mayen

> Modelos de base de datos organizados por dominio de negocio. Enums en SCREAMING_SNAKE_CASE español.

---

## 1. Core — Cotizaciones, Reservaciones, Clientes y Pagos

### Quote (Cotización)

**Entidad central del sistema.** Toda reservación nace de una cotización. Representa una propuesta formal enviada al cliente con espacios, ítems de comida/servicios, precios y condiciones.

| Campo clave | Significado |
|-------------|-------------|
| `status` | Ciclo de vida: BORRADOR → ENVIADA → NO_CONFIRMADA/CONFIRMADA → EN_EJECUCION → FINALIZADA |
| `currency` | Moneda de la cotización: GTQ o USD. Una sola moneda por cotización, sin mezclas. |
| `exchangeRate` | Tasa de cambio GTQ/USD vigente al momento de cotizar (si aplica). |
| `guestCount` | Cantidad de asistentes estimados. Influye en precios por persona. |
| `sentAt` | Fecha de envío al cliente. Dispara el cálculo de expiración. |
| `expiresAt` | `sentAt + 15 días hábiles`. Al vencer, pasa a NO_CONFIRMADA. |
| `parentQuoteId` | Auto-referencia: al re-cotizar desde una NO_CONFIRMADA, la nueva Quote referencia a la original. |
| `discountType` / `discountValue` | Descuento global opcional: PERCENT o FIXED. |
| `subtotal` / `totalAmount` | Subtotal antes de descuento y total final después de descuento. |
| `confirmedAt` / `executedAt` / `finishedAt` | Timestamps de cada transición de estado. |

**Relaciones:**
- `client` — Cliente que solicita la cotización.
- `spaces` (QuoteSpace[]) — Uno o varios espacios reservados con sus horarios.
- `items` (QuoteItem[]) — Ítems de comida, mobiliario, decoración, servicios.
- `reservation` — Reservation creada automáticamente al confirmar (1:1).
- `parentQuote` / `childQuotes` — Cadena de re-cotizaciones.
- `workOrder` — Orden de trabajo generada (1:1).

---

### QuoteSpace (Espacio en Cotización)

**Modelo intermedio** que permite que una cotización tenga múltiples espacios de distintos tipos.

| Campo clave | Significado |
|-------------|-------------|
| `locationType` | Tipo de ubicación: FREE_AREA, DINING_ROOM, HALL, ROOM, GARDEN, TERRACE. |
| `locationId` / `locationName` | Referencia polimórfica al espacio concreto + nombre desnormalizado para display. |
| `startTime` / `endTime` | Hora exacta en formato HH:MM (ej: "14:30"). Complementa los bloques de horario. |
| `startSchedule` / `endSchedule` | Bloques legacy: MANANA, TARDE, NOCHE. |
| `pricingMode` | PER_PERSON (precio × asistentes) o PER_SPACE (precio fijo por espacio). |
| `unitPrice` / `totalPrice` | Precio unitario según modo y total calculado. |

---

### QuoteItem (Ítem de Cotización)

Línea de detalle dentro de una cotización. Puede ser un producto del catálogo, mobiliario del inventario, o un menú pre-armado.

| Campo clave | Significado |
|-------------|-------------|
| `productId` / `furnitureId` / `menuId` | Referencia opcional al catálogo origen (uno de los tres). |
| `category` | COMIDA_MENU, MOBILIARIO, ADORNOS_DECORACION, SERVICIOS_ADICIONALES. |
| `scheduledDate` | Fecha específica del ítem de comida dentro del evento. |
| `startTime` / `endTime` | Hora exacta de servicio en HH:MM. |
| `pricingMode` | PER_PERSON, PER_SPACE, PER_UNIT. |
| `discountType` / `discountValue` | Descuento por ítem: PERCENT (porcentaje) o FIXED (monto fijo). |
| `quantity` / `unitPrice` / `totalPrice` | Cantidad, precio unitario y total (`qty × price − discount`). |

---

### Reservation (Reservación)

**Creada automáticamente** al confirmar una Quote (pago de anticipo recibido). No se crea manualmente. Representa el evento confirmado en calendario.

| Campo clave | Significado |
|-------------|-------------|
| `reservationType` | EVENTO o HABITACION. |
| `status` | COTIZADO → CONFIRMADO → EN_EJECUCION → FINALIZADO → CANCELADO. |
| `paymentStatus` | SIN_PAGO, PARCIAL, PAGADO (calculado automáticamente). |
| `currency` / `exchangeRate` | Heredados de la Quote al momento de confirmar. |
| `guestCount` | Heredado de la Quote. |
| `schedules` | JSON array de bloques: ["MANANA", "TARDE"]. |
| `startSchedule` / `endSchedule` | Bloques de inicio y fin (MANANA/TARDE/NOCHE). |

**Relaciones:** `client`, `payments[]`, `expenses[]`, `eventClosing`, `quote` (1:1 inversa).

---

### Client (Cliente)

Persona o entidad que solicita cotizaciones y eventos.

| Campo clave | Significado |
|-------------|-------------|
| `clientType` | PARTICULAR, EMPRESA, IGLESIA, INSTITUCION. |
| `category` | Clasificación interna: BUENO, REGULAR, DELICADO, EN_OBSERVACION. Solo referencia, no afecta precios. |

---

### Payment (Pago)

Registro de abono a una Reservation.

| Campo clave | Significado |
|-------------|-------------|
| `amount` | Monto pagado en la moneda de la cotización. |
| `currency` | GTQ o USD. |
| `exchangeRate` | Tasa al momento del pago (si es en USD). |
| `amountGTQ` | Equivalente en quetzales para contabilidad. El cobro siempre se liquida en GTQ al tipo de cambio del día. |

---

## 2. Espacios — Ubicaciones Físicas

Todos los espacios comparten estructura base: `name`, `capacity`, `description`, `active`. Se referencian polimórficamente desde Quote/Reservation mediante `locationType` + `locationId` + `locationName`.

| Modelo | Particularidad |
|--------|---------------|
| **FreeArea** | Áreas libres / verdes. Sin estructura adicional. |
| **DiningRoom** | Comedores techados. |
| **Hall** | Salones para eventos. Campo `type` adicional. |
| **Garden** | Jardines. |
| **Room** | Habitaciones. Jerarquía Building → Floor → Room. Tiene `pricePerNight`, `pricePerPerson`, `bedType`, `status` (DISPONIBLE/RESERVADA/OCUPADA/MANTENIMIENTO), `photo`. |
| **Terrace** | Terrazas (nuevo en Reunión 2). Editables con nombre único, capacidad y precio. |
| **Building** | Edificio (ej: "Belén", "Bethel"). Contiene floors. |
| **Floor** | Piso/nivel dentro de un edificio. Nivel numérico (1 o 2). Contiene rooms. |

---

## 3. Catálogos — Productos, Menús, Cristalería, Mobiliario

### Product

Productos y servicios ofrecidos en cotizaciones.

| Campo clave | Significado |
|-------------|-------------|
| `category` | COMIDA_MENU, MOBILIARIO, ADORNOS_DECORACION, SERVICIOS_ADICIONALES. |
| `unitMeasure` | PIEZA, PERSONA, HORA, EVENTO. |
| `isFree` | Si es true, es amenidad sin costo (ej: parqueo gratuito). |
| `pricePerDay` / `pricePerHour` | Precios alternativos para parqueo y servicios por tiempo. |

### Menu

Menús pre-armados para eventos. Catálogo editable (altas, bajas, cambios).

| Campo clave | Significado |
|-------------|-------------|
| `type` | DESAYUNO, REFACCION, COFFEE_BREAK, ALMUERZO, CENA. |
| `price` | Precio por persona. |
| `active` | Soft-delete lógico. |

### CrystalWare

Inventario de cristalería disponible para eventos.

| Campo clave | Significado |
|-------------|-------------|
| `type` | PLATOS, CUBIERTOS, PICHELES, VASOS, COPAS. |
| `quantity` | Cantidad en inventario. |
| `unitPrice` | Precio unitario para cotizar. |

### Furniture

Mobiliario e inventario físico con depreciación.

| Campo clave | Significado |
|-------------|-------------|
| `inventoryNumber` | Número único de inventario. |
| `category` | SILLAS, MESAS, MANTELES, VAJILLA, CRISTALERIA, CUBERTERIA, DECORACION, EQUIPOS_SONIDO, ILUMINACION, CARPAS, OTROS. |
| `purchaseValue` / `depreciationRate` / `currentValue` | Valor de compra, tasa de depreciación anual (%) y valor actual calculado. |
| `status` | BUENO, REGULAR, DANADO, DADO_BAJA. |

---

## 4. Operaciones — Gastos, Cierres, Órdenes de Trabajo

### Expense

Gasto operativo registrado, opcionalmente vinculado a un evento.

| Campo clave | Significado |
|-------------|-------------|
| `category` | MANTENIMIENTO, SERVICIOS, SUELDOS, INSUMOS, DECORACION, TRANSPORTE, OTROS. |
| `relatedEventId` | Vinculación opcional a Reservation. |

### EventClosing

Cierre de evento: registra el estado de devolución de mobiliario al finalizar.

| Campo clave | Significado |
|-------------|-------------|
| `returnStatus` | COMPLETO, CON_DANOS, CON_PERDIDAS. |
| `damageCost` / `lossCost` | Costos por daños y pérdidas. |
| `items` (EventClosingItem[]) | Detalle por pieza de mobiliario: RETORNADO_OK, RETORNADO_DANADO, NO_RETORNADO. |

### EventClosingItem

Ítem individual del cierre. Vincula un Furniture con su estado de retorno (`returnStatus`) y costo de reparación si aplica.

### WorkOrder

Orden de trabajo generada a partir de una Quote aprobada (1:1). Detalla lo necesario para ejecutar el evento.

---

## 5. Sistema — Usuarios, Permisos, Configuración

### User

Usuario del sistema con autenticación.

| Campo clave | Significado |
|-------------|-------------|
| `role` | ADMIN, RECEPCIONISTA, FINANZAS, ALMACEN, ENCARGADO_EVENTO, USUARIO_SISTEMA, VISUAL. |
| `active` | Soft-delete lógico para desactivar acceso. |

### Permission

Permiso individual por rol y módulo (tabla en DB). La matriz autoritativa está en `src/types/index.ts` → `rolePermissions`.

| Campo clave | Significado |
|-------------|-------------|
| `role` | Rol al que aplica. |
| `module` | Módulo del sistema. |
| `canCreate/Read/Update/Delete/Approve` | Banderas booleanas por acción. |

### ExchangeRate

Tipo de cambio manual GTQ/USD.

| Campo clave | Significado |
|-------------|-------------|
| `rate` | Valor: 1 USD = X GTQ. |
| `fromCurrency` / `toCurrency` | USD → GTQ (por defecto). |

### DailyClosing

Cierre diario de operaciones. Resume eventos del día, cobros y pendientes.

| Campo clave | Significado |
|-------------|-------------|
| `date` | Fecha del cierre (única). |
| `totalEvents` / `completedEvents` | Total de eventos y cuántos finalizados/liquidados. |
| `totalCollected` / `pendingAmount` | Monto cobrado y pendiente. |
| `incidents` | Incidencias reportadas en el día. |

### EmailLog

Registro de correos enviados desde el sistema.

| Campo clave | Significado |
|-------------|-------------|
| `type` | SENT_TO_CLIENT, SENT_TO_ACCOUNTING, RESENT. |
| `status` | SENT o FAILED. |
| `quoteId` | Vinculación opcional a la cotización origen. |
