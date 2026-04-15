# Diagramas de Flujo - Sistema de Reservas Villas Mayen

**Basado en:** PropuestaRequerimientos_v2 (1).md  
**Fecha:** Abril 2026  
**Versión:** Documento de Análisis de Flujos

---

## 1. FLUJO PRINCIPAL: RESERVAS (EVENTOS Y HABITACIONES)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO DE RESERVACIÓN                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────────────┐
                           │    SELECCIÓN TIPO       │
                           │    DE RESERVACIÓN       │
                           └────────────┬────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
           ▼                            ▼                            ▼
    ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
    │    EVENTO    │          │ HABITACIÓN    │          │               │
    │               │          │               │          │               │
    │ • Salones     │          │ • Belén       │          │               │
    │ • Áreas Libres│          │ • Bethel      │          │               │
    │ • Jardines   │          │ • Nivel 1/2  │          │               │
    │ • Comedores  │          │               │          │               │
    └───────┬───────┘          └───────┬───────┘          └───────────────┘
            │                          │
            │                          │
            ▼                          ▼
    ┌──────────────────────────────────────────────────────────────────────┐
    │                    CALENDARIO (VISTA UNIFICADA)                      │
    │    ┌─────────────────────────────────────────────────────────────┐   │
    │    │  M | T | W | T | F | S | S   (mensual/semanal/diaria)      │   │
    │    │  ░░ ░░ ██ ██ ░░ ░░ ░░                                     │   │
    │    │  Colores por estado: 🟡Anticipo 🔵Depósito 🟠Saldo 🟢Finalizado│   │
    │    │              🟣Cotizado 🔴En Ejecución                      │   │
    │    └─────────────────────────────────────────────────────────────┘   │
    └──────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                           ┌─────────────────────────┐
                           │  VERIFICACIÓN DE        │
                           │  DISPONIBILIDAD         │
                           └────────────┬────────────┘
                                        │
                         ┌─────────────┴─────────────┐
                         │                           │
                         ▼                           ▼
                   ┌──────────┐               ┌──────────┐
                   │ DISPONIBLE│               │ NO DISPONIBLE│
                   └────┬─────┘               └─────┬──────┘
                        │                          │
                        ▼                          ▼
                 ┌──────────────┐         ┌──────────────────┐
                 │ CREAR RESERVA│         │   ALERTA         │
                 └──────┬───────┘         │   (doble reserva)│
                        │                 │   Bloquea        │
                        ▼                 └──────────────────┘
                 ┌──────────────────────────────────┐
                 │      SELECCIÓN DE HORARIOS      │
                 └──────────────────────────────────┘
                        │
                        ▼
                 ┌──────────────────────────────────┐
                 │  Mañana (7:00-13:00)           │
                 │  Tarde   (14:00-19:00)         │
                 │  Noche  (20:00-01:00)          │
                 │                                 │
                 │  ✓ Combinación permitida        │
                 │  (Mañana+Tarde, Tarde+Noche,   │
                 │   Mañana+Tarde+Noche)          │
                 └──────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                              ESTADOS DE RESERVA
══════════════════════════════════════════════════════════════════════════════════════════════

    ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ COTIZADO │────>│ ANTICIPO │────>│  SALDO   │────>│COMPLETADO│────>│FINALIZADO│
    └──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
         │                │                │                │                │
         │                │                │                │                │
         ▼                ▼                ▼                ▼                ▼
    (Solo            (50%              (Falta          (100%           (Evento
     cotización)       pagado)           50%)            pagado)         realizado)

    ┌──────────────────┐     ┌──────────────────┐
    │ CANCELADA       │     │EN EJECUCIÓN     │
    │ (sin reembolso) │     │(evento activo)  │
    └──────────────────┘     └──────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                            PREGUNTA 1: PRECIOS COMBINADOS
══════════════════════════════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────────────────────────────────────────┐
    │  Al combinar horarios (ej: Mañana + Tarde):                         │
    │                                                                     │
    │  OPCIÓN A: suma de cada horario por separado                       │
    │  → Precio = Precio Mañana + Precio Tarde                           │
    │                                                                     │
    │  OPCIÓN B: tarifa especial para combinaciones                      │
    │  → Precio = Precio Combinado (descuento por volumen)               │
    │                                                                     │
    │  [PENDIENTE] Confirmar cuál aplica                                 │
    └─────────────────────────────────────────────────────────────────────┘
```

---

## 2. FLUJO DE PAGOS

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO DE PAGOS                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

                    ┌────────────────────────┐
                    │   RESERVA CREADA      │
                    │   Estado: PENDIENTE   │
                    └───────────┬────────────┘
                                │
                                ▼
    ┌───────────────────────────────────────────────────────┐
    │              MODELO DE PAGOS                         │
    │                                                       │
    │   MODALIDAD 1: PAGO TOTAL                            │
    │   └─► Se abona el 100% al confirmar                 │
    │                                                       │
    │   MODALIDAD 2: ANTICIPO + SALDO                     │
    │   └─► Porcentaje inicial + resto al finalizar       │
    │   └─► El operador define el monto de cada pago      │
    └───────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │ PAGO 1       │   │ PAGO 2       │   │ PAGO N       │
    │ (Anticipo)   │   │ (Saldo)      │   │ (Adicional)  │
    │              │   │              │   │              │
    │ - Monto lib  │   │ - Monto lib  │   │ - Monto lib  │
    │ - Método     │   │ - Método     │   │ - Método     │
    │ - Comprobante│   │ - Comprobante│   │ - Comprobante│
    └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              ▼
                    ┌────────────────────────┐
                    │  SEGUIMIENTO EN       │
                    │  TIEMPO REAL           │
                    │                        │
                    │  Total abonado: $XXX  │
                    │  Saldo pendiente: $XXX│
                    └────────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                            POLÍTICA DE CANCELACIÓN
══════════════════════════════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────────────────────────────────┐
    │                   POLÍTICA DE CANCELACIÓN                  │
    ├─────────────────────────────────────────────────────────────┤
    │                                                             │
    │   ✗ NO HAY REEMBOLSO si ya se recibió el anticipo        │
    │                                                             │
    │   El sistema debe:                                         │
    │   ✓ Mostrar esta política al registrar/confirmar          │
    │   ✓ Registrar en historial del cliente                   │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘

    FLUJO:
    ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
    │   CLIENTE   │     │  RECEPCION    │     │   SISTEMA    │
    └──────┬──────┘     └──────┬───────┘     └──────┬───────┘
           │                   │                    │
           │ Solicita          │                    │
           │ cancelación       │                    │
           │───────────────────>>                    │
           │                   │                    │
           │                   │ ¿Tiene anticipo?   │
           │                   │───────────────────>>│
           │                   │                    │
           │                   │   NO REEMBOLSO     │
           │                   │   (se pierde       │
           │                   │    el anticipo)    │
           │                   │<<───────────────────│
           │                   │                    │
           │                   │ Registra           │
           │                   │ cancelación       │
           │                   │ en historial      │
           │                   │───────────────────>>│
           │                   │                    │
           ▼                   ▼                    ▼


══════════════════════════════════════════════════════════════════════════════════════════════
                            NOTIFICACIONES (POST-MVP)
══════════════════════════════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────────────────────────────────┐
    │                NOTIFICACIONES POR EMAIL                    │
    ├─────────────────────────────────────────────────────────────┤
    │                                                             │
    │  Al confirmar una reservación:                             │
    │  → Envío a Administradores                                 │
    │  → Envío a Encargados de Evento                           │
    │                                                             │
    │  [PENDIENTE]: ¿También se envía al cliente?               │
    │                                                             │
    │  (Funcionalidad para fase posterior al MVP)               │
    └─────────────────────────────────────────────────────────────┘
```

---

## 3. FLUJO DE AUTENTICACIÓN

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO DE LOGIN                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────┐
    │                    PANTALLA DE LOGIN                       │
    │                                                             │
    │   ┌─────────────────────────────────────────────────┐      │
    │   │  Usuario: [___________]                         │      │
    │   │  Contraseña: [___________]                       │      │
    │   │                    [INGRESAR]                   │      │
    │   └─────────────────────────────────────────────────┘      │
    │                                                             │
    │   Sesión expira tras período de inactividad               │
    │   (tiempo a definir)                                       │
    └─────────────────────────────────────────────────────────────┘
                          │
                          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                   VALIDACIÓN                               │
    │                                                             │
    │   ┌─────────────┐     ┌─────────────┐                      │
    │   │ CREDENCIALES│     │ CREDENCIALES│                      │
    │   │ VÁLIDAS    │     │ INVÁLIDAS   │                      │
    │   └──────┬──────┘     └──────┬──────┘                      │
    │          │                   │                              │
    │          ▼                   ▼                              │
    │   ┌──────────────┐    ┌──────────────┐                      │
    │   │ GENERA TOKEN │    │ ERROR DE     │                      │
    │   │ + AUDIT LOG │    │ LOGIN        │                      │
    │   └──────────────┘    └──────────────┘                      │
    └─────────────────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                            ROLES Y PERMISOS
══════════════════════════════════════════════════════════════════════════════════════════════

    ┌────────────────────────────────────────────────────────────────────────────┐
    │                            ROLES DEL SISTEMA                               │
    ├────────────────────┬─────────────────────────────────────────────────────────┤
    │ ROL                │ PERMISOS                                             │
    ├────────────────────┼─────────────────────────────────────────────────────────┤
    │ Administrador      │ ✓ Acceso total al sistema                            │
    ├────────────────────┼─────────────────────────────────────────────────────────┤
    │ Recepcionista      │ ✓ Reservaciones                                      │
    │                    │ ✓ Cotizaciones                                        │
    │                    │ ✓ Clientes                                            │
    ├────────────────────┼─────────────────────────────────────────────────────────┤
    │ Finanzas           │ ✓ Gastos                                             │
    │                    │ ✓ Reportes financieros                                │
    │                    │ ✓ Cierre de cobro                                     │
    ├────────────────────┼─────────────────────────────────────────────────────────┤
    │ Almacén            │ ✓ Inventario                                         │
    │                    │ ✓ Mobiliario                                          │
    │                    │ ✓ Cierre de eventos                                  │
    ├────────────────────┼─────────────────────────────────────────────────────────┤
    │ Encargado de Evento│ ✓ Cierre de eventos                                  │
    │                    │ ✓ Ver reservaciones asignadas                        │
    │                    │ [PENDIENTE] Definir otros permisos                    │
    ├────────────────────┼─────────────────────────────────────────────────────────┤
    │ Usuario del Sistema│ ✓ Crear/reservaciones propias                         │
    │                    │ ✓ Consultar sus reservaciones                         │
    ├────────────────────┼─────────────────────────────────────────────────────────┤
    │ Visual             │ ✓ Solo lectura                                        │
    └────────────────────┴─────────────────────────────────────────────────────────┘

    [PENDIENTE PREGUNTA 7]: El rol "Encargado de Evento": 
    ¿qué otros módulos debería poder ver o editar además del cierre de evento?
```

---

## 4. FLUJO DE COTIZACIONES

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO DE COTIZACIONES                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────────┐
    │                    CREAR COTIZACIÓN                                 │
    │                                                              │
    │   1. Seleccionar cliente                                         │
    │   2. Seleccionar ubicación (salón/área/jardín/comedor)            │
    │   3. Seleccionar fecha y horarios                                 │
    └──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────────────────────┐
    │              AGREGAR PRODUCTOS                                     │
    │                                                              │
    │   [SIN LÍMITE MÁXIMO]                                            │
    │                                                              │
    │   ┌────────────────┬───────────────────────────────────────┐      │
    │   │ CATEGORÍA      │ EJEMPLOS                                │      │
    │   ├────────────────┼───────────────────────────────────────┤      │
    │   │ Comida/Menú    │ Entradas, Plato Fuerte, Postres       │      │
    │   │ Mobiliario     │ Sillas, Mesas, Manteles, Vajilla      │      │
    │   │ Adornos        │ Flores, Globos, Centros de Mesa        │      │
    │   │ Servicios     │ DJ, Fotógrafos, Meseros, Valet         │      │
    │   └────────────────┴───────────────────────────────────────┘      │
    │                                                              │
    │   Por cada producto:                                           │
    │   • Nombre, Categoría, Precio unitario                         │
    │   • Descripción, Foto (aparece en cotización)                │
    │   • Disponible (Sí/No), Unidad de medida                      │
    └──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────────────────────┐
    │              NOTAS DE DECORACIÓN                                  │
    │                                                              │
    │   Campo de texto amplio                                         │
    │   Múltiples fotos (almacenadas en la nube)                    │
    │   Se vincula a la cotización                                   │
    └──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────────────────────┐
    │              GENERAR PDF COTIZACIÓN                               │
    │                                                              │
    │   Incluye:                                                      │
    │   ✓ Productos con fotos                                        │
    │   ✓ Notas de decoración                                        │
    │   ✓ Total estimado                                             │
    └──────────────────────────────────────────────────────────────────────┘
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
           ▼                      ▼                      ▼
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │ CLIENTE      │      │ CLIENTE      │      │ COTIZACIÓN   │
    │ ACEPTA       │      │ RECHAZA      │      │ APROBADA     │
    │              │      │              │      │              │
    │ (→ Reserva)  │      │ (→ Archivada)│      │ (→ Orden     │
    └──────────────┘      └──────────────┘      │  Trabajo)    │
                                                └──────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                            ORDEN DE TRABAJO
══════════════════════════════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────────────────────────────────────┐
    │                 ORDEN DE TRABAJO (AUTO)                        │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                 │
    │   Se genera automáticamente al aprobar cotización            │
    │                                                                 │
    │   Contiene:                                                    │
    │   • Todos los productos y servicios seleccionados             │
    │   • Notas de decoración                                       │
    │   • Mobiliario asignado                                       │
    │                                                                 │
    │   [PENDIENTE PREGUNTA 3]:                                     │
    │   ¿Quién puede modificar una cotización aprobada?            │
    │   ¿Solo Administrador o también Recepcionista?               │
    │                                                                 │
    │   Si se modifica la cotización (aumenta/disminuye):           │
    │   → La Orden de Trabajo se actualiza automáticamente         │
    └─────────────────────────────────────────────────────────────────┘
```

---

## 5. FLUJO DE CIERRE DE EVENTO

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO DE CIERRE                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

                    ┌────────────────────────────┐
                    │     FIN DEL EVENTO        │
                    └────────────┬───────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │  VERIFICAR PERMISOS        │
                    │                            │
                    │  ✓ Administrador           │
                    │  ✓ Encargado de Evento    │
                    │  ✗ Otros roles            │
                    └────────────┬───────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │  LISTA DE MOBILIARIO       │
                    │  ASIGNADO AL EVENTO        │
                    └────────────┬───────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │  ✅ RETORNO │      │ ⚠️ RETORNO   │      │ ❌ NO        │
    │  EN BUEN    │      │ CON DAÑO     │      │ RETORNADO   │
    │  ESTADO     │      │              │      │ (PÉRDIDA)   │
    └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
           │                     │                     │
           │                     ▼                     │
           │              ┌──────────────┐              │
           │              │ Describir    │              │
           │              │ daño + foto  │              │
           │              │ (en la nube) │              │
           │              └──────────────┘              │
           │                     │                     │
           └──────────┬──────────┴──────────┬──────────┘
                      │                     │
                      ▼                     ▼
              ┌─────────────────────────────────┐
              │  REGISTRO DE OBSERVACIONES      │
              │  + EVIDENCIA FOTOGRÁFICA        │
              └─────────────────────────────────┘
                      │
                      ▼
              ┌─────────────────────────────────┐
              │  CÁLCULO DE COSTOS               │
              │  • Reparación                   │
              │  • Reposición                   │
              └─────────────────────────────────┘
                      │
                      ▼
              ┌─────────────────────────────────┐
              │  CONFIRMA CIERRE                │
              │  Estado: FINALIZADO              │
              └─────────────────────────────────┘
                      │
                      ▼
              ┌─────────────────────────────────┐
              │  ACTUALIZA INVENTARIO            │
              │  • Artículos devueltos           │
              │  • Artículos dañados (costo)    │
              │  • Artículos perdidos           │
              └─────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                            CONTROL DE RETORNO
══════════════════════════════════════════════════════════════════════════════════════════════

    [PENDIENTE PREGUNTA 4]: 
    ¿El sistema debe controlar que el mobiliario propio (incluido en cotización) 
    no quede comprometido en dos eventos al mismo tiempo?

    FLUJO PROPUESTO:
    
    COTIZACIÓN ──► MOBILIARIO ASIGNADO ──► VERIFICAR DISPONIBILIDAD
                                                    │
                                   ┌───────────────┴───────────────┐
                                   ▼                               ▼
                             ┌──────────┐                   ┌──────────┐
                             │DISPONIBLE│                   │NO DISPONIBLE│
                             └────┬─────┘                   └─────┬──────┘
                                  │                             │
                                  ▼                             ▼
                           Asignar                 ALERTA: Conflicto
                           al evento               de inventario
```

---

## 6. FLUJO DE INVENTARIO

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO DE INVENTARIO                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────────┐
    │                    REGISTRO DE MOBILIARIO                           │
    │                                                                      │
    │   Campos:                                                            │
    │   • No. Inventario (único)                                          │
    │   • Valor de Compra                                                  │
    │   • Fecha de Compra                                                 │
    │   • Categoría (define % depreciación anual)                         │
    │   • Depreciación anual (% configurable por categoría)             │
    │   • Valor Actual (calculado automáticamente)                       │
    │   • Descripción                                                     │
    │   • Foto (almacenada en la nube)                                   │
    │   • Estado: Bueno | Regular | Dañado | Dado de Baja                │
    │   • Otros detalles                                                  │
    └──────────────────────────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                            CÁLCULO DE DEPRECIACIÓN
══════════════════════════════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────────────────────────────────────┐
    │                    FÓRMULA DE DEPRECIACIÓN                     │
    ├─────────────────────────────────────────────────────────────────┤
    │                                                                 │
    │  DepreciaciónAnual = ValorCompra × (% depreciación categoría) │
    │                                                                 │
    │  AñosDesdeCompra = (FechaActual - FechaCompra) / 365          │
    │                                                                 │
    │  ValorActual = ValorCompra - (DepreciaciónAnual × Años)       │
    │                                                                 │
    └─────────────────────────────────────────────────────────────────┘

    EJEMPLO:
    ├── ValorCompra: $10,000
    ├── Categoría: Sillas → 10% depreciación anual
    ├── Años: 3 años
    └── ValorActual: $10,000 - ($1,000 × 3) = $7,000


══════════════════════════════════════════════════════════════════════════════════════════════
                    [PENDIENTE] PREGUNTA 5: DEPRECIACIÓN EDITABLE
══════════════════════════════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────────────────────────────────────┐
    │  El porcentaje de depreciación por categoría:                 │
    │                                                                 │
    │  OPCIÓN A: Se define una sola vez al crear la categoría        │
    │           y no se modifica posteriormente                     │
    │                                                                 │
    │  OPCIÓN B: El Administrador puede editar desde el sistema      │
    │           en cualquier momento                                 │
    │                                                                 │
    │  [PENDIENTE] Confirmar cuál aplica                            │
    └─────────────────────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                            FLUJO DE DAR DE BAJA
══════════════════════════════════════════════════════════════════════════════════════════════

    Se da de baja cuando:
    • El artículo se daña
    • Se deprecia completamente

    Proceso:
    1. Registrar razón de la baja
    2. Cambiar estado a "Dado de Baja"
    3. Mantener en historial (no se elimina)

    El artículo queda marcado pero visible en histórico
```

---

## 7. FLUJO DE CATÁLOGOS

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              UBICACIONES DISPONIBLES                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────────────────────────────────────┐
    │                         CATÁLOGO DE UBICACIONES                                      │
    ├───────────────┬───────────────┬───────────────┬─────────────────────────────────────┤
    │ ÁREAS LIBRES  │   COMEDORES   │    SALONES    │      EDIFICIOS/HABITACIONES         │
    ├───────────────┼───────────────┼───────────────┼─────────────────────────────────────┤
    │ Pérgola       │ Nehemías 1    │ Josefa        │ Bethlehem Nivel 1: 1, 2, 3, 4...    │
    │ Plaza Jerus.  │ Nehemías 2    │ Magdalena     │ Bethlehem Nivel 2: 1, 2, 3, 4...    │
    │ Bautisterio   │ Josefa        │ Timoteo       │ Bethel Nivel 1: 1, 2, 3, 4...       │
    │ Rancho 1-4    │ Magdalena     │ Salem         │ Bethel Nivel 2: 1, 2, 3, 4...       │
    │ Monte Bienav. │               │ Nehemías      │                                     │
    │ Las Mariposas │               │ Israel        │                                      │
    │               │               │ Esther        │                                      │
    │               │               │ Jacob         │                                      │
    │               │               │ Sansón        │                                      │
    └───────────────┴───────────────┴───────────────┴─────────────────────────────────────┘

    JARDINES:
    • Sharon
    • Juda


══════════════════════════════════════════════════════════════════════════════════════════════
                    [PENDIENTE] PREGUNTA 2: CALENDARIO DE HABITACIONES
══════════════════════════════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────────────────────────────────────┐
    │  Las habitaciones del hotel:                                   │
    │                                                                 │
    │  OPCIÓN A: Appears in the same calendar as events              │
    │                                                                 │
    │  OPCIÓN B: Vista separate                                      │
    │                                                                 │
    │  [PENDIENTE] Confirmar cuál aplica                            │
    └─────────────────────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                            MAPA VISUAL DE HABITACIONES
══════════════════════════════════════════════════════════════════════════════════════════════

        EDIFICIO BELÉN                    EDIFICIO BETHEL
        
    ┌──────────────┐                 ┌──────────────┐
    │   NIVEL 1    │                 │   NIVEL 1    │
    ├──────────────┤                 ├──────────────┤
    │ 🟢 🟢 🔵 🟡  │                 │ 🟢 🟢 🟢 🟢  │
    │  1  2  3  4  │                 │  1  2  3  4  │
    └──────────────┘                 └──────────────┘
    
    ┌──────────────┐                 ┌──────────────┐
    │   NIVEL 2    │                 │   NIVEL 2    │
    ├──────────────┤                 ├──────────────┤
    │ 🔴 🟢 🟢 🟢  │                 │ 🟡 🟢 🟢 🟢  │
    │  1  2  3  4  │                 │  1  2  3  4  │
    └──────────────┘                 └──────────────┘

    COLORES:
    🟢 Verde = Disponible    🔵 Azul = Reservada
    🔴 Rojo = Ocupada        🟡 Amarillo = Mantenimiento
```

---

## 8. DASHBOARD

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              WIDGETS DEL DASHBOARD                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────┐
    │                         PANEL PRINCIPAL                                │
    │                                                                         │
    │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
    │  │ RESERVACIONES    │  │ EVENTOS          │  │ PRÓXIMOS        │          │
    │  │ DEL MES          │  │ EN EJECUCIÓN     │  │ EVENTOS         │          │
    │  │ (contador)       │  │ (lista hoy)      │  │ (próximos 7 días)│         │
    │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
    │                                                                         │
    │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
    │  │ INGRESOS        │  │ GASTOS           │  │ CLIENTES        │          │
    │  │ DEL MES         │  │ DEL MES          │  │ NUEVOS          │          │
    │  │ (total $)        │  │ (total $)        │  │ (contador)       │          │
    │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
    │                                                                         │
    │  ┌────────────────────────────────────────────────────────────────────┐ │
    │  │ ALERTAS DE INVENTARIO                                           │ │
    │  │ • Artículos dañados                                            │ │
    │  │ • Artículos dados de baja                                      │ │
    │  └────────────────────────────────────────────────────────────────────┘ │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. FLUJO DE CLIENTES

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO DE CLIENTES                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    TIPOS DE CLIENTE                          │
    ├────────────────────────────────────────────────────────────────┤
    │  Particular   │ Persona física                               │
    │  Empresa      │ Persona moral / corporativo                  │
    │  Iglesia      │ Institución religiosa                        │
    │  Institución  │ Escuela, gobierno, ONG                       │
    └────────────────────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                            HISTORIAL DE VENTAS
══════════════════════════════════════════════════════════════════════

    Por cada cliente:
    • Lista de todas las reservaciones
    • Lista de cotizaciones
    • Total de ventas realizadas
    • Monto total gastado
    • Exportable a Excel y PDF
```

---

## 10. RESUMEN: PREGUNTAS PENDIENTES

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                    7 PREGUNTAS PENDIENTES DE CONFIRMACIÓN                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌───┬─────────────────────────────────────────────────────────────────────────┬──────────────┐
│ # │ PREGUNTA                                                                  │ SUGERENCIA   │
├───┼─────────────────────────────────────────────────────────────────────────┼──────────────┤
│ 1 │ Al combinar horarios (Mañana+Tarde), ¿se cobra suma por separado o      │ Suma por     │
│   │ tarifa especial?                                                       │ separado     │
├───┼─────────────────────────────────────────────────────────────────────────┼──────────────┤
│ 2 │ Las habitaciones aparecen en el mismo calendario que eventos,          │ Mismo        │
│   │ o vista separada?                                                       │ calendario   │
├───┼─────────────────────────────────────────────────────────────────────────┼──────────────┤
│ 3 │ ¿Quién puede modificar cotización aprobada? (Solo Admin o también       │ Admin        │
│   │ Recepcionista?)                                                         │             │
├───┼─────────────────────────────────────────────────────────────────────────┼──────────────┤
│ 4 │ ¿Controlar que mobiliario en cotización no quede comprometido en       │ Sí,        │
│   │ dos eventos al mismo tiempo?                                           │ controlar    │
├───┼─────────────────────────────────────────────────────────────────────────┼──────────────┤
│ 5 │ El % de depreciación por categoría: ¿editable por Admin o se define     │ Editable     │
│   │ una sola vez y no se modifica?                                         │ por Admin    │
├───┼─────────────────────────────────────────────────────────────────────────┼──────────────┤
│ 6 │ Al confirmar reservación, ¿se envía email también al cliente?          │ Sí, enviar   │
├───┼─────────────────────────────────────────────────────────────────────────┼──────────────┤
│ 7 │ Rol "Encargado de Evento": ¿qué otros módulos puede ver/editar         │ Definir      │
│   │ además del cierre de evento?                                           │ permisos     │
└───┴─────────────────────────────────────────────────────────────────────────┴──────────────┘


══════════════════════════════════════════════════════════════════════════════════════════════
                            PRIORIDADES DE IMPLEMENTACIÓN
══════════════════════════════════════════════════════════════════════════════════════════════

    FASE 1 (ALTA):
    ├── Autenticación con login por usuario
    ├── Calendario de reservaciones con colores
    ├── Formulario de reservación completo
    ├── Alarma de doble reservación
    ├── Modelo de pagos 50/50
    ├── Gestión de clientes con tipos
    ├── Catálogos de ubicaciones
    ├── Usuarios y roles
    └── Dashboard básico

    FASE 2 (MEDIA):
    ├── Módulo de cotizaciones
    ├── Catálogo de productos con fotos
    ├── Orden de trabajo automática
    ├── Inventario de mobiliario con depreciación por categoría
    ├── Formulario de gastos
    └── Notificaciones por email al confirmar

    FASE 3 (BAJA):
    ├── Cierre de eventos con retorno
    ├── Mapa visual de habitaciones
    ├── Reportes exportables (Excel/PDF)
    ├── Fotos en cotizaciones
    └── Registro de empleados


══════════════════════════════════════════════════════════════════════════════════════════════
** Fin del Documento de Diagramas de Flujo **
══════════════════════════════════════════════════════════════════════════════════════════════
```

---

**Fin del Documento**