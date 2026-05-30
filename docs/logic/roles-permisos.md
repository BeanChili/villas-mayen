# Roles y Permisos — Villas Mayen

> Matriz de permisos por rol, módulos del sistema y uso de `hasPermission()`.

---

## Roles

| Rol | Descripción |
|-----|-------------|
| `ADMIN` | Administrador general. Acceso total a todos los módulos. |
| `RECEPCIONISTA` | Recepcionista. Gestiona cotizaciones, reservaciones y clientes. Solo lectura en inventario. |
| `FINANZAS` | Finanzas. Gestiona gastos, ve cotizaciones y reservaciones. Acceso total a gastos. |
| `ALMACEN` | Almacén. Gestiona inventario (mobiliario, productos). Ve reservaciones y eventos. |
| `ENCARGADO_EVENTO` | Encargado de evento. Gestiona cierres de evento. Ve reservaciones e inventario. |
| `USUARIO_SISTEMA` | Usuario del sistema. Crea y gestiona reservaciones. Solo lectura en clientes. |
| `VISUAL` | Solo visual. Acceso de solo lectura a todos los módulos (excepto gastos, usuarios, configuraciones). |

---

## Módulos

| Módulo | Alcance | Nuevo en Reunión 2 |
|--------|---------|---------------------|
| `reservations` | CRUD de reservaciones y pagos. Gestión de calendario. | — |
| `clients` | CRUD de clientes. | — |
| `quotes` | CRUD de cotizaciones, envío, confirmación, re-cotización. | — |
| `inventory` | Mobiliario (Furniture) y productos (Product). | — |
| `expenses` | CRUD de gastos operativos. | — |
| `events` | Cierres de evento (EventClosing), órdenes de trabajo. | — |
| `users` | CRUD de usuarios del sistema. | — |
| `settings` | Configuraciones generales. | — |
| `catalog` | Catálogos editables: menús, terrazas, cristalería, ubicaciones. | ✅ |
| `exchangeRate` | Gestión del tipo de cambio GTQ/USD. | ✅ |
| `closings` | Cierres diarios y semanales (DailyClosing). | ✅ |
| `email` | Envío de correos (a cliente, a contabilidad). | ✅ |

---

## Matriz de Permisos

### ADMIN

| Módulo | Crear | Leer | Actualizar | Eliminar | Aprobar |
|--------|:-----:|:----:|:----------:|:--------:|:-------:|
| reservations | ✅ | ✅ | ✅ | ✅ | ✅ |
| clients | ✅ | ✅ | ✅ | ✅ | ✅ |
| quotes | ✅ | ✅ | ✅ | ✅ | ✅ |
| inventory | ✅ | ✅ | ✅ | ✅ | ✅ |
| expenses | ✅ | ✅ | ✅ | ✅ | ✅ |
| events | ✅ | ✅ | ✅ | ✅ | ✅ |
| users | ✅ | ✅ | ✅ | ✅ | ✅ |
| settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| catalog | ✅ | ✅ | ✅ | ✅ | ✅ |
| exchangeRate | ✅ | ✅ | ✅ | ✅ | ✅ |
| closings | ✅ | ✅ | ✅ | ✅ | ✅ |
| email | ✅ | ✅ | ✅ | ✅ | ✅ |

---

### RECEPCIONISTA

| Módulo | Crear | Leer | Actualizar | Eliminar | Aprobar |
|--------|:-----:|:----:|:----------:|:--------:|:-------:|
| reservations | ✅ | ✅ | ✅ | ✅ | ❌ |
| clients | ✅ | ✅ | ✅ | ✅ | ❌ |
| quotes | ✅ | ✅ | ✅ | ✅ | ❌ |
| inventory | ❌ | ✅ | ❌ | ❌ | ❌ |
| expenses | ❌ | ❌ | ❌ | ❌ | ❌ |
| events | ❌ | ❌ | ❌ | ❌ | ❌ |
| users | ❌ | ❌ | ❌ | ❌ | ❌ |
| settings | ❌ | ❌ | ❌ | ❌ | ❌ |
| catalog | ✅ | ✅ | ✅ | ✅ | ❌ |
| exchangeRate | ❌ | ✅ | ❌ | ❌ | ❌ |
| closings | ❌ | ❌ | ❌ | ❌ | ❌ |
| email | ✅ | ❌ | ❌ | ❌ | ❌ |

---

### FINANZAS

| Módulo | Crear | Leer | Actualizar | Eliminar | Aprobar |
|--------|:-----:|:----:|:----------:|:--------:|:-------:|
| reservations | ❌ | ✅ | ❌ | ❌ | ❌ |
| clients | ❌ | ✅ | ❌ | ❌ | ❌ |
| quotes | ❌ | ✅ | ❌ | ❌ | ❌ |
| inventory | ❌ | ❌ | ❌ | ❌ | ❌ |
| expenses | ✅ | ✅ | ✅ | ✅ | ✅ |
| events | ❌ | ❌ | ❌ | ❌ | ❌ |
| users | ❌ | ❌ | ❌ | ❌ | ❌ |
| settings | ❌ | ❌ | ❌ | ❌ | ❌ |
| catalog | ❌ | ✅ | ❌ | ❌ | ❌ |
| exchangeRate | ❌ | ✅ | ✅ | ❌ | ❌ |
| closings | ✅ | ✅ | ✅ | ❌ | ❌ |
| email | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### ALMACEN

| Módulo | Crear | Leer | Actualizar | Eliminar | Aprobar |
|--------|:-----:|:----:|:----------:|:--------:|:-------:|
| reservations | ❌ | ✅ | ❌ | ❌ | ❌ |
| clients | ❌ | ❌ | ❌ | ❌ | ❌ |
| quotes | ❌ | ❌ | ❌ | ❌ | ❌ |
| inventory | ✅ | ✅ | ✅ | ✅ | ❌ |
| expenses | ❌ | ❌ | ❌ | ❌ | ❌ |
| events | ❌ | ✅ | ❌ | ❌ | ❌ |
| users | ❌ | ❌ | ❌ | ❌ | ❌ |
| settings | ❌ | ❌ | ❌ | ❌ | ❌ |
| catalog | ✅ | ✅ | ✅ | ❌ | ❌ |
| exchangeRate | ❌ | ❌ | ❌ | ❌ | ❌ |
| closings | ❌ | ❌ | ❌ | ❌ | ❌ |
| email | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### ENCARGADO_EVENTO

| Módulo | Crear | Leer | Actualizar | Eliminar | Aprobar |
|--------|:-----:|:----:|:----------:|:--------:|:-------:|
| reservations | ❌ | ✅ | ❌ | ❌ | ❌ |
| clients | ❌ | ❌ | ❌ | ❌ | ❌ |
| quotes | ❌ | ❌ | ❌ | ❌ | ❌ |
| inventory | ❌ | ✅ | ❌ | ❌ | ❌ |
| expenses | ❌ | ❌ | ❌ | ❌ | ❌ |
| events | ✅ | ✅ | ✅ | ❌ | ❌ |
| users | ❌ | ❌ | ❌ | ❌ | ❌ |
| settings | ❌ | ❌ | ❌ | ❌ | ❌ |
| catalog | ❌ | ✅ | ❌ | ❌ | ❌ |
| exchangeRate | ❌ | ❌ | ❌ | ❌ | ❌ |
| closings | ❌ | ✅ | ❌ | ❌ | ❌ |
| email | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### USUARIO_SISTEMA

| Módulo | Crear | Leer | Actualizar | Eliminar | Aprobar |
|--------|:-----:|:----:|:----------:|:--------:|:-------:|
| reservations | ✅ | ✅ | ✅ | ✅ | ❌ |
| clients | ❌ | ✅ | ❌ | ❌ | ❌ |
| quotes | ❌ | ❌ | ❌ | ❌ | ❌ |
| inventory | ❌ | ❌ | ❌ | ❌ | ❌ |
| expenses | ❌ | ❌ | ❌ | ❌ | ❌ |
| events | ❌ | ❌ | ❌ | ❌ | ❌ |
| users | ❌ | ❌ | ❌ | ❌ | ❌ |
| settings | ❌ | ❌ | ❌ | ❌ | ❌ |
| catalog | ❌ | ✅ | ❌ | ❌ | ❌ |
| exchangeRate | ❌ | ❌ | ❌ | ❌ | ❌ |
| closings | ❌ | ❌ | ❌ | ❌ | ❌ |
| email | ❌ | ❌ | ❌ | ❌ | ❌ |

---

### VISUAL

| Módulo | Crear | Leer | Actualizar | Eliminar | Aprobar |
|--------|:-----:|:----:|:----------:|:--------:|:-------:|
| reservations | ❌ | ✅ | ❌ | ❌ | ❌ |
| clients | ❌ | ✅ | ❌ | ❌ | ❌ |
| quotes | ❌ | ✅ | ❌ | ❌ | ❌ |
| inventory | ❌ | ✅ | ❌ | ❌ | ❌ |
| expenses | ❌ | ❌ | ❌ | ❌ | ❌ |
| events | ❌ | ✅ | ❌ | ❌ | ❌ |
| users | ❌ | ❌ | ❌ | ❌ | ❌ |
| settings | ❌ | ❌ | ❌ | ❌ | ❌ |
| catalog | ❌ | ✅ | ❌ | ❌ | ❌ |
| exchangeRate | ❌ | ❌ | ❌ | ❌ | ❌ |
| closings | ❌ | ❌ | ❌ | ❌ | ❌ |
| email | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Uso de `hasPermission()`

La función `hasPermission()` en `src/types/index.ts` es la única forma autorizada de verificar permisos:

```typescript
import { hasPermission } from '@/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// En un API route handler:
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ success: false, error: 'No autenticado' }, { status: 401 })

  const role = session.user.role as Role
  if (!hasPermission(role, 'catalog', 'create')) {
    return Response.json({ success: false, error: 'Sin permisos' }, { status: 403 })
  }
  // ... lógica del endpoint
}
```

**Acciones disponibles:** `'create'`, `'read'`, `'update'`, `'delete'`, `'approve'`.

---

## Notas

- La matriz de permisos está definida en `src/types/index.ts` → `rolePermissions`. Es la fuente de verdad autoritativa.
- Los permisos en base de datos (`Permission` model) son un espejo para administración dinámica futura. Actualmente la matriz en código tiene prioridad.
- Los módulos nuevos (`catalog`, `exchangeRate`, `closings`, `email`) deben agregarse a `rolePermissions` antes de implementar sus API routes.
- Los roles y permisos están **pendientes de revisión final por el cliente** (Fase 11). La matriz aquí presentada es una propuesta inicial.
- No usar casts como `(user as any).role` — el tipo `session.user.role` está aumentado en `src/types/index.ts`.
