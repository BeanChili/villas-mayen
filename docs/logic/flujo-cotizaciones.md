# Flujo de Cotizaciones — Villas Mayen

> Ciclo de vida completo de una cotización, estados, transiciones y reglas de negocio.

---

## Diagrama de Estados

```
                     ┌──────────┐
                     │ BORRADOR │  Cotización en edición, no enviada al cliente
                     └────┬─────┘
                          │ Enviar (manual)
                          ▼
                     ┌──────────┐
                     │ ENVIADA  │  Enviada al cliente. Inicia cuenta regresiva de 15 días hábiles
                     └──┬───┬───┘
                        │   │
          Cliente acepta │   │ Cliente no responde / vence expiración
          + paga anticipo│   │
                        ▼   ▼
              ┌────────────┐  ┌────────────────┐
              │ CONFIRMADA │  │ NO_CONFIRMADA  │  Venció sin respuesta
              └─────┬──────┘  └───────┬────────┘
                    │                 │
                    │                 ├── Reenviar (manual): actualiza sentAt, recalcula expiresAt, mismo registro
                    │                 │
                    │                 └── Re-cotizar (manual): crea nueva Quote (BORRADOR) con parentQuoteId
                    │
          Llega fecha │
          del evento  │
                    ▼
              ┌──────────────┐
              │ EN_EJECUCION │  Día del evento. Visible en dashboard del día
              └──────┬───────┘
                     │
      Liquidación y   │
      pago completo   │
                     ▼
              ┌────────────┐
              │ FINALIZADA │  Evento liquidado, pago 100% recibido, mobiliario cerrado
              └────────────┘
```

---

## Estados

| Estado | Significado | Color |
|--------|-------------|-------|
| `BORRADOR` | Cotización en edición interna. No visible al cliente. | `#9ca3af` (gris) |
| `ENVIADA` | Enviada formalmente al cliente. Tiene fecha de expiración. | `#6b7280` (gris oscuro) |
| `NO_CONFIRMADA` | Venció el plazo de 15 días hábiles sin respuesta del cliente. | `#ef4444` (rojo) |
| `CONFIRMADA` | Cliente aceptó y pagó el anticipo. Se crea Reservation automáticamente. | `#22c55e` (verde) |
| `EN_EJECUCION` | Día del evento en curso. Aparece en el dashboard del día. Pendiente de pago final. | `#a855f7` (morado) |
| `FINALIZADA` | Evento liquidado completamente. Todo cobrado, mobiliario cerrado, email a contabilidad enviado. | `#dc2626` (rojo) |

---

## Transiciones

| Desde | → | Hasta | Disparador | Reglas |
|-------|---|-------|------------|--------|
| BORRADOR | → | ENVIADA | Botón "Enviar al cliente" | Establece `sentAt = now`, `expiresAt = sentAt + 15 días hábiles`. |
| ENVIADA | → | CONFIRMADA | Botón "Confirmar" | **Requiere pago de anticipo registrado.** Crea Reservation automáticamente con datos heredados de la Quote. |
| ENVIADA | → | NO_CONFIRMADA | Automático o botón "Marcar como no confirmada" | `expiresAt < now`. También puede forzarse manualmente. |
| NO_CONFIRMADA | → | (misma ENVIADA) | Botón "Reenviar" | **Q11 corregida: SÍ se permite.** Actualiza `sentAt = now`, recalcula `expiresAt`. No crea nuevo registro. |
| NO_CONFIRMADA | → | (nueva BORRADOR) | Botón "Re-cotizar" | Crea una nueva Quote en BORRADOR con `parentQuoteId` apuntando a la original. La original queda en NO_CONFIRMADA. |
| CONFIRMADA | → | EN_EJECUCION | Automático al llegar `eventDate`, o manual | La fecha del evento = fecha de inicio de la Reservation. |
| EN_EJECUCION | → | FINALIZADA | Botón "Liquidar / Finalizar" | **Validaciones:** pago cobrado al 100%, cierre de mobiliario completado, email a contabilidad (opcional manual). |

---

## Reglas de Negocio

### Expiración (15 días hábiles)

- Se calculan **15 días hábiles** a partir de `sentAt` (excluye sábados y domingos).
- Si el cliente no responde en ese plazo, la cotización pasa automáticamente a NO_CONFIRMADA.
- El cálculo se realiza con `calculateExpiryDate(sentDate, 15)` en `src/lib/utils.ts`.

### Reenvío (Q11 corregida)

- **Sí se permite** reenviar una cotización en estado NO_CONFIRMADA.
- El reenvío **no crea un nuevo registro**: actualiza `sentAt` y recalcula `expiresAt` sobre la misma Quote.
- También se permite reenviar desde ENVIADA (para recordatorios o correcciones).
- El botón "Reenviar" es manual, no automático (Q26 corregida).

### Re-cotización

- Distinto del reenvío. Crea una **nueva Quote** en BORRADOR.
- La Quote original (NO_CONFIRMADA) se vincula como padre mediante `parentQuoteId`.
- La nueva Quote puede tener cambios: precios, espacios, ítems.
- La cadena de re-cotizaciones es navegable: `parentQuoteId` → `childQuotes[]`.

### Confirmación → Creación de Reservation

- Al confirmar (pago anticipo), se crea **automáticamente** una Reservation.
- No existe creación standalone de Reservation (el módulo independiente se elimina).
- Datos heredados de Quote a Reservation: `startDate`, `endDate`, `locationType`, `locationId`, `locationName`, `totalAmount`, `guestCount`, `currency`, `exchangeRate`, `discountType`, `discountValue`.
- Los bloques de horario (`startSchedule`/`endSchedule`) se calculan a partir de los `QuoteSpace`.

### Múltiples espacios (QuoteSpace)

- Una cotización puede tener **varios espacios** de distinto tipo (salón + jardín + terraza).
- Cada QuoteSpace tiene su propio `startTime`/`endTime` en HH:MM.
- El `pricingMode` puede ser PER_PERSON (precio × asistentes) o PER_SPACE (precio fijo).
- Validación de conflictos: al agregar un espacio, se verifica si ya existe otra cotización para esa ubicación en esa fecha/hora. Se muestran **todas** las cotizaciones (cualquier estado) y se advierte al usuario.

### Descuentos

- **Por ítem** (Q22 corregida): cada QuoteItem puede tener `discountType` (PERCENT/FIXED) y `discountValue`. El total del ítem se calcula: `(quantity × unitPrice) − discount`.
- **Global** (opcional): la Quote tiene `discountType`/`discountValue` que se aplica al subtotal para obtener `totalAmount`.

### Moneda

- Una sola moneda por cotización: GTQ o USD (Q19: no se mezclan).
- Al crear la cotización, se preselecciona la moneda (Q18 corregida).
- Si es USD, los precios se muestran en dólares usando el `exchangeRate` vigente.
- Los pagos siempre se cobran en quetzales al tipo de cambio del día (Q20 corregida).

### Hora exacta (HH:MM)

- Además de los bloques MANANA/TARDE/NOCHE, cada QuoteSpace y QuoteItem (comidas) tiene `startTime`/`endTime` en formato HH:MM.
- Se permiten horas con minutos (ej: "13:15"), no solo horas en punto (Q14 corregida).

---

## Estados Obsoletos

| Estado anterior | Equivalente nuevo |
|-----------------|-------------------|
| APROBADA | CONFIRMADA |
| RECHAZADA | NO_CONFIRMADA (unificado) |

La migración de datos existentes convierte APROBADA → CONFIRMADA.
