# Flujo de Pagos — Villas Mayen

> Registro de pagos, multi-moneda, tipo de cambio y liquidación de eventos.

---

## Ciclo de Pago

```
SIN_PAGO ──→ PARCIAL ──→ PAGADO
   │            │            │
   │   Anticipo │   Abonos   │  Pago total = totalAmount
   │            │ parciales  │
   └────────────┴────────────┘
```

El `paymentStatus` de la Reservation se calcula automáticamente en base a la suma de pagos registrados:

| Estado | Condición |
|--------|-----------|
| `SIN_PAGO` | `paidAmount === 0` |
| `PARCIAL` | `0 < paidAmount < totalAmount` |
| `PAGADO` | `paidAmount >= totalAmount` |

---

## Tipos de Pago en el Flujo

### 1. Anticipo

- Primer pago recibido del cliente.
- Dispara la transición de Quote: ENVIADA → CONFIRMADA.
- Al registrar el anticipo, la Quote se confirma y se crea la Reservation automáticamente.
- No hay un monto fijo de anticipo; se registra el monto que el cliente entregue.

### 2. Pagos Parciales (Abonos)

- Pagos subsecuentes entre el anticipo y el total.
- Se registran contra la Reservation.
- Cada pago puede ser en GTQ o USD (según la moneda de la cotización).

### 3. Pago Total (Liquidación)

- Cuando `paidAmount >= totalAmount`, el `paymentStatus` pasa a PAGADO.
- **Requisito para FINALIZADA:** el pago debe estar al 100% (`paymentStatus === PAGADO`).
- La liquidación incluye verificación de cierre de mobiliario y envío de email a contabilidad.

---

## Multi-Moneda (GTQ / USD)

### Reglas

- **Q19:** Una cotización tiene una sola moneda. No se mezclan GTQ y USD en la misma cotización.
- **Q18 corregida:** La moneda se preselecciona al crear la cotización (selector GTQ/USD).
- **Q20 corregida:** Al momento de pagar, **siempre se cobra en quetzales** al tipo de cambio del día.
  - Si la cotización es en USD, el pago se registra con:
    - `currency = "USD"`
    - `exchangeRate` = tipo de cambio del día
    - `amount` = monto en USD
    - `amountGTQ` = equivalente en quetzales (`amount × exchangeRate`)
  - Si la cotización es en GTQ, el pago es directo en quetzales.

### Tipo de Cambio

- **Manual:** actualizado por un usuario autorizado en `/settings/exchange-rate`.
- Se almacena en el modelo `ExchangeRate` con historial de cambios.
- Cada cotización guarda el `exchangeRate` vigente al momento de cotizar (no se actualiza retroactivamente).
- Cada pago guarda su propio `exchangeRate` del día del cobro.

---

## Liquidación de Evento

### Proceso

1. Verificar que `paymentStatus === PAGADO` (100% cobrado).
2. Completar el cierre de mobiliario (`EventClosing`):
   - Registrar estado de retorno por cada pieza (RETORNADO_OK, RETORNADO_DANADO, NO_RETORNADO).
   - Calcular costos por daños (`damageCost`) y pérdidas (`lossCost`).
3. Marcar la cotización como FINALIZADA.
4. Enviar email a contabilidad (manual, con botón).

### Email a Contabilidad

- **Q26 corregida:** Se envía con botón manual, no automáticamente.
- **Q27:** Dirección de correo pendiente de confirmar con el cliente.
- Contenido del resumen:
  - Datos del cliente
  - Resumen de la cotización (espacios, ítems, totales)
  - Total cobrado (`paidAmount`)
  - Devoluciones (si aplica)
  - Estado de mobiliario (retornado / dañado / perdido)
  - Detalle de incidencias
- Se registra en `EmailLog` con tipo `SENT_TO_ACCOUNTING`.

---

## Cierres Diarios y Semanales

### DailyClosing

- **Q28:** Verifica que todos los eventos del día estén cobrados al 100%.
- Resume: total de eventos, completados, monto cobrado, pendiente, incidencias.
- **Q29:** Puede ser automático (al final del día) y manual (botón de descarga).
- Genera reporte descargable (PDF).

### Cierre Semanal

- Agrupa los `DailyClosing` de una semana.
- Mismas métricas consolidadas.

---

## Estados de Pago (PaymentStatus)

| Estado | Significado |
|--------|-------------|
| `SIN_PAGO` | No se ha registrado ningún pago. |
| `PARCIAL` | Se ha pagado una parte del total. |
| `PAGADO` | El total ha sido cubierto completamente. |

---

## Campos del Modelo Payment

| Campo | Significado |
|-------|-------------|
| `amount` | Monto del pago en la moneda de la cotización. |
| `currency` | GTQ o USD (hereda de la cotización). |
| `exchangeRate` | Tipo de cambio al momento del pago (si es en USD). |
| `amountGTQ` | Equivalente en quetzales (`amount × exchangeRate`). |
| `notes` | Notas u observaciones del pago. |
| `createdByName` | Nombre del usuario que registró el pago. |
