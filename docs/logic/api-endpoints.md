# API Endpoints — Villas Mayen

> Todas las rutas de la API REST organizadas por recurso. Autenticación requerida en todas (salvo auth). Formato de respuesta: `ApiResponse<T>` = `{ success: boolean, data?: T, error?: string }`.

---

## Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Inicio de sesión (CredentialsProvider). |
| GET | `/api/auth/session` | Sí | Obtener sesión actual. |
| POST | `/api/auth/signout` | Sí | Cerrar sesión. |

---

## Cotizaciones (`/api/quotes`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/quotes` | `quotes.read` | Listar cotizaciones (filtros: `status`, `clientId`, `dateFrom`, `dateTo`). |
| POST | `/api/quotes` | `quotes.create` | Crear cotización (BORRADOR). Acepta `spaces[]` para QuoteSpace. |
| GET | `/api/quotes/[id]` | `quotes.read` | Obtener cotización con `spaces`, `items`, `client`. |
| PUT | `/api/quotes/[id]` | `quotes.update` | Actualizar cotización (solo en BORRADOR). |
| DELETE | `/api/quotes/[id]` | `quotes.delete` | Eliminar cotización (solo en BORRADOR). |
| PATCH | `/api/quotes/[id]/status` | `quotes.approve` | Cambiar estado. Body: `{ status: "ENVIADA" | "CONFIRMADA" | ... }`. Al confirmar, crea Reservation. |
| POST | `/api/quotes/[id]/send` | `quotes.update` | Enviar/re-enviar al cliente. Actualiza `sentAt`, `expiresAt`, registra EmailLog. |
| POST | `/api/quotes/[id]/re-quote` | `quotes.create` | Re-cotizar desde NO_CONFIRMADA. Crea nueva Quote con `parentQuoteId`. |

---

## Reservaciones (`/api/reservations`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/reservations` | `reservations.read` | Listar reservaciones para calendario (filtros: `dateFrom`, `dateTo`, `status`). |
| GET | `/api/reservations/[id]` | `reservations.read` | Obtener reservación con `client`, `payments`, `expenses`. |
| PATCH | `/api/reservations/[id]` | `reservations.update` | Actualizar campos de reservación. |
| PATCH | `/api/reservations/[id]/status` | `reservations.update` | Cambiar estado de reservación. |
| POST | `/api/reservations` | Interno | **Solo uso interno.** Llamado desde confirmación de Quote para crear Reservation automáticamente. |

---

## Clientes (`/api/clients`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/clients` | `clients.read` | Listar clientes (búsqueda por `name`, `email`, `clientType`). |
| POST | `/api/clients` | `clients.create` | Crear cliente. |
| GET | `/api/clients/[id]` | `clients.read` | Obtener cliente con historial de cotizaciones y reservaciones. |
| PUT | `/api/clients/[id]` | `clients.update` | Actualizar cliente. |
| DELETE | `/api/clients/[id]` | `clients.delete` | Soft-delete (`active = false`). |

---

## Pagos (`/api/payments`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/reservations/[id]/payments` | `reservations.read` | Listar pagos de una reservación. |
| POST | `/api/reservations/[id]/payments` | `reservations.create` | Registrar pago. Actualiza `paidAmount` y `paymentStatus` de la Reservation. |

---

## Menús (`/api/menus`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/menus` | `catalog.read` | Listar menús (filtro: `type`, `active`). |
| POST | `/api/menus` | `catalog.create` | Crear menú (DESAYUNO/REFACCION/COFFEE_BREAK/ALMUERZO/CENA). |
| GET | `/api/menus/[id]` | `catalog.read` | Obtener menú. |
| PUT | `/api/menus/[id]` | `catalog.update` | Actualizar menú. |
| DELETE | `/api/menus/[id]` | `catalog.delete` | Soft-delete (`active = false`). |

---

## Terrazas (`/api/terraces`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/terraces` | `catalog.read` | Listar terrazas. |
| POST | `/api/terraces` | `catalog.create` | Crear terraza. |
| GET | `/api/terraces/[id]` | `catalog.read` | Obtener terraza. |
| PUT | `/api/terraces/[id]` | `catalog.update` | Actualizar terraza. |
| DELETE | `/api/terraces/[id]` | `catalog.delete` | Soft-delete (`active = false`). |

---

## Cristalería (`/api/crystalware`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/crystalware` | `catalog.read` | Listar cristalería (filtro: `type`). |
| POST | `/api/crystalware` | `catalog.create` | Crear ítem de cristalería. |
| GET | `/api/crystalware/[id]` | `catalog.read` | Obtener ítem. |
| PUT | `/api/crystalware/[id]` | `catalog.update` | Actualizar ítem (incluye `quantity`). |
| DELETE | `/api/crystalware/[id]` | `catalog.delete` | Soft-delete (`active = false`). |

---

## Productos (`/api/products`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/products` | `inventory.read` | Listar productos (filtro: `category`, `available`). |
| POST | `/api/products` | `inventory.create` | Crear producto. |
| GET | `/api/products/[id]` | `inventory.read` | Obtener producto. |
| PUT | `/api/products/[id]` | `inventory.update` | Actualizar producto. |
| DELETE | `/api/products/[id]` | `inventory.delete` | Soft-delete (`available = false`). |

---

## Mobiliario (`/api/furniture`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/furniture` | `inventory.read` | Listar mobiliario (filtro: `category`, `status`). |
| POST | `/api/furniture` | `inventory.create` | Crear ítem de mobiliario. |
| GET | `/api/furniture/[id]` | `inventory.read` | Obtener mobiliario con historial de uso. |
| PUT | `/api/furniture/[id]` | `inventory.update` | Actualizar mobiliario. |
| DELETE | `/api/furniture/[id]` | `inventory.delete` | Dar de baja (`status = DADO_BAJA`). |

---

## Ubicaciones (`/api/locations`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/locations` | `reservations.read` | Listar todas las ubicaciones (agrupadas por tipo: areas, halls, gardens, etc.). |
| GET | `/api/locations/[type]` | `reservations.read` | Listar ubicaciones de un tipo específico. |
| GET | `/api/locations/[type]/[id]` | `reservations.read` | Obtener ubicación específica. |
| PUT | `/api/locations/[type]/[id]` | `catalog.update` | Actualizar ubicación (nombre, capacidad, precio, activo). |

---

## Gastos (`/api/expenses`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/expenses` | `expenses.read` | Listar gastos (filtro: `category`, `dateFrom`, `dateTo`, `relatedEventId`). |
| POST | `/api/expenses` | `expenses.create` | Crear gasto. |
| GET | `/api/expenses/[id]` | `expenses.read` | Obtener gasto. |
| PUT | `/api/expenses/[id]` | `expenses.update` | Actualizar gasto. |
| DELETE | `/api/expenses/[id]` | `expenses.delete` | Eliminar gasto. |

---

## Cierres de Evento (`/api/closings`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/api/closings/event` | `events.create` | Crear cierre de evento (EventClosing + EventClosingItems). |
| GET | `/api/closings/event/[reservationId]` | `events.read` | Obtener cierre de una reservación. |
| GET | `/api/closings/daily` | `closings.read` | Listar cierres diarios. |
| POST | `/api/closings/daily` | `closings.create` | Generar cierre diario (manual o automático). |
| GET | `/api/closings/weekly` | `closings.read` | Obtener cierre semanal consolidado. |
| POST | `/api/closings/email` | `email.send` | Enviar email a contabilidad con resumen de liquidación. |

---

## Tipo de Cambio (`/api/settings/exchange-rate`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/settings/exchange-rate` | `exchangeRate.read` | Obtener tasa actual e historial. |
| POST | `/api/settings/exchange-rate` | `exchangeRate.update` | Actualizar tipo de cambio. Crea nuevo registro en historial. |

---

## Usuarios (`/api/users`)

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/users` | `users.read` | Listar usuarios. |
| POST | `/api/users` | `users.create` | Crear usuario (contraseña se hashea con bcrypt). |
| GET | `/api/users/[id]` | `users.read` | Obtener usuario. |
| PUT | `/api/users/[id]` | `users.update` | Actualizar usuario. |
| DELETE | `/api/users/[id]` | `users.delete` | Soft-delete (`active = false`). |

---

## Formato de Respuesta

Todas las rutas retornan:

```typescript
// Éxito
{ success: true, data: T }

// Error
{ success: false, error: "Mensaje descriptivo" }

// Paginación
{ success: true, data: { items: T[], total: number, page: number, pageSize: number, totalPages: number } }
```

Códigos HTTP: `200` (éxito), `201` (creado), `400` (error de validación), `401` (no autenticado), `403` (sin permisos), `404` (no encontrado), `500` (error interno).
