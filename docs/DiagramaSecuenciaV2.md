# Diagrama de Flujo - Sistema de Reservas Villas Mayen

**Basado en:** PropuestaRequerimientos_v2 (1).md

---

## FLUJO 1: RESERVAR EVENTO (Principal)

```
CLIENTE → RECEPCIONISTA → SISTEMA → ADMIN/ENCARGADO

1. CLIENTE solicita reserva
   │
2. RECEPCIONISTA verifica disponibilidad en calendario
   │
   ├── SI hay espacio → CONTINUA
   └── NO hay espacio → BLOQUEA (alerta doble reserva)
   │
3. RECEPCIONISTA crea reserva (estado: COTIZADO)
   │
4. CLIENTE confirma y paga anticipo (50%)
   │
5. SISTEMA cambia estado a: ANTICIPO
   │
6. SISTEMA envía email a Admin + Encargado de Evento
   │
7. CLIENTE paga saldo (50%) al finalizar evento
   │
8. SISTEMA cambia estado a: COMPLETADO → FINALIZADO
```

---

## FLUJO 2: COTIZACIÓN → RESERVA

```
CLIENTE → RECEPCIONISTA → SISTEMA

1. CLIENTE solicita cotización
   │
2. RECEPCIONISTA crea cotización
   │
3. RECEPCIONISTA agrega productos (sin límite):
   │  • Comida/Menú
   │  • Mobiliario
   │  • Adornos/Decoración
   │  • Servicios adicionales
   │
4. RECEPCIONISTA agrega notas de decoración + fotos
   │
5. SISTEMA genera PDF de cotización
   │
6. CLIENTE acepta → SISTEMA genera ORDEN DE TRABAJO (auto)
   │
7. Pasa a Flujo 1 (reserva confirmada)
```

---

## FLUJO 3: PAGOS

```
RESERVA → PAGOS → ESTADO

┌─────────────────────────────────────┐
│ RESERVA CREADA                      │
│ Estado: PENDIENTE                   │
└────────────────┬────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
PAGO 1      PAGO 2      PAGO N
(Anticipo)  (Saldo)    (Adicional)
    │            │            │
    └────────────┼────────────┘
                 ▼
    ┌─────────────────────────────────────┐
    │ SEGUIMIENTO EN TIEMPO REAL          │
    │ Total abonado: $XXX                │
    │ Saldo pendiente: $XXX               │
    └─────────────────────────────────────┘
```

---

## FLUJO 4: CANCELACIÓN

```
CLIENTE → SISTEMA

CLIENTE cancela
     │
     ▼
┌─────────────────────────┐
│ ¿Ya pagó anticipo?      │
└────────────┬────────────┘
     ┌───────┴───────┐
     ▼               ▼
    SÍ              NO
     │               │
     ▼               ▼
┌─────────┐    ┌─────────────────┐
│NO HAY   │    │ Cancela normal  │
│REEMBOLSO│    │ Libera horarios │
│(pierde  │    │                 │
│anticipo)│    └─────────────────┘
└─────────┘
     │
     ▼
┌─────────────────────────┐
│ Registra en historial   │
│ del cliente             │
└─────────────────────────┘
```

---

## FLUJO 5: CIERRE DE EVENTO

```
EVENTO TERMINA → ADMIN/ENCARGADO → SISTEMA

1. Evento finaliza
   │
2. ADMIN o ENCARGADO DE EVENTO abre formulario de cierre
   │  (otros roles NO pueden cerrar)
   │
3. SISTEMA muestra mobiliario asignado al evento
   │
4. Por cada artículo:
   │
   ├── ✅ Retornado en buen estado
   │
   ├── ⚠️ Retornado con daño → registrar detalle + foto
   │
   └── ❌ No retornado → registrar como pérdida
   │
5. Registrar observaciones + fotos de evidencia
   │
6. Calcular costos de daños/pérdidas
   │
7. Confirmar cierre → Estado: FINALIZADO
   │
8. SISTEMA actualiza inventario
```

---

## FLUJO 6: INVENTARIO - MOBILIARIO

```
ALMACÉN → SISTEMA → EVENTO

1. ALMACÉN registra mobiliario:
   │  • No. Inventario (único)
   │  • Valor de Compra
   │  • Categoría (define % depreciación)
   │  • Foto (Cloudflare)
   │  • Estado
   │
2. SISTEMA calcula depreciación:
   │
   │  ValorActual = ValorCompra - (DepreciaciónAnual × Años)
   │
3. ¿Se incluye en cotización?
   │
   ├── SI → verificar disponibilidad (no comprometidos en otro evento)
   └── NO → queda en inventario disponible
   │
4. ¿Se daña durante evento?
   │
   ├── SI → Registrar daño + costo → actualizar estado
   └── NO → Regresa al inventario
```

---

## FLUJO 7: LOGIN / AUTENTICACIÓN

```
USUARIO → SISTEMA

1. USUARIO ingresa credenciales
   │
2. SISTEMA valida usuario/password
   │
   ├── VÁLIDO → Genera token + permite acceso
   └── INVÁLIDO → Error de login
   │
3. Según ROL, permite acciones:

   ┌────────────────────┬────────────────────┐
   │ ROL               │ PUEDE              │
   ├────────────────────┼────────────────────┤
   │ Administrador     │ TODO               │
   │ Recepcionista     │ Reservas, Clients  │
   │ Finanzas          │ Gastos, Reportes   │
   │ Almacén           │ Inventario, Cierre │
   │ Encargado Evento  │ Cierre eventos     │
   │ Usuario Sistema   │ Crear propias      │
   │ Visual            │ Solo lectura       │
   └────────────────────┴────────────────────┘
```

---

## FLUJO 8: CALENDARIO - ESTADOS

```
VISUALIZACIÓN DEL CALENDARIO

┌─────────────────────────────────────────────────────┐
│                ESTADOS DE RESERVA                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  COTIZADO ──► ANTICIPO ──► SALDO ──► COMPLETADO  │
│     │            │           │          │           │
│     │            │           │          ▼           │
│     │            │           │     FINALIZADO      │
│     │            │           │                     │
│     │            │           └─────────────────────┤
│     │            │                                 │
│     │            └─────────────────────────────────│
│     │                                          │
│     └───────────────────────────────────────────│
│                                                  │
│  EN EJECUCIÓN (evento activo)                    │
│  CANCELADA (sin reembolso)                       │
│                                                     │
└─────────────────────────────────────────────────────┘

COLORES EN CALENDARIO:
🟡 Anticipo   🔵 Depósito   🟠 Saldo   🟢 Completado
🟣 Cotizado   🔴 En Ejecución
```

---

## FLUJO 9: RESERVAR HABITACIÓN

```
CLIENTE → RECEPCIONISTA → SISTEMA

1. CLIENTE solicita habitación
   │
2. RECEPCIONISTA selecciona:
   │  • Edificio (Belén / Bethel)
   │  • Nivel (1 / 2)
   │  • Habitación específica
   │
3. SISTEMA verifica disponibilidad
   │
4. CLIENTE paga (total o parcial)
   │
5. SISTEMA actualiza estado: RESERVADA
   │
[MAPA VISUAL]: Cuadritos de color por estado
🟢 Disponible   🔵 Reservada   🔴 Ocupada   🟡 Mantenimiento
```

---

## FLUJO 10: DASHBOARD

```
SISTEMA → VISUALIZACIÓN

┌─────────────────────────────────────────────┐
│                 DASHBOARD                   │
├─────────────────────────────────────────────┤
│                                             │
│  RESERVACIONES DEL MES    │ EVENTOS HOY    │
│        (contador)         │   (lista)      │
│───────────────────────────┼────────────────│
│  PRÓXIMOS EVENTOS         │ INGRESOS MES   │
│   (próximos 7 días)        │   (total $)    │
│───────────────────────────┼────────────────│
│  GASTOS MES               │ CLIENTES NUEVOS │
│    (total $)              │   (contador)    │
│───────────────────────────┴────────────────│
│                                             │
│  ALERTAS INVENTARIO                         │
│  • Artículos dañados                        │
│  • Artículos dados de baja                  │
│                                             │
└─────────────────────────────────────────────┘
```

---

## RESUMEN: 7 PREGUNTAS PENDIENTES

| # | Pregunta | Ubicación en Flujo |
|---|----------|-------------------|
| 1 | ¿Precio combinado = suma o tarifa especial? | Flujo 1 (Reservar) |
| 2 | ¿Habitaciones en mismo calendario o separado? | Flujo 9 |
| 3 | ¿Quién modifica cotización aprobada? | Flujo 2 |
| 4 | ¿Controlar mobiliario en 2 eventos a la vez? | Flujo 6 |
| 5 | ¿% depreciación editable por Admin? | Flujo 6 |
| 6 | ¿Enviar email también al cliente? | Flujo 1 |
| 7 | ¿Permisos de Encargado de Evento? | Flujo 7 |

---

**Fin del Diagrama**