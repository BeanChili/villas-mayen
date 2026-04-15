# Propuesta de Requerimientos - Sistema de Reservas Villas Mayen

**Fecha:** Abril 2026  
**Versión:** 2.0 (Actualizada con respuestas del cliente)  
**Cliente:** Sistema de Reservas Villas Mayen  
**Tipo de Sistema:** Gestión de Reservaciones y Eventos

---

## Resumen Ejecutivo

Sistema integral para la gestión de un centro de eventos y hospedaje que incluye reservaciones con calendario visual, cotizaciones, control de inventario, gestión de clientes y dashboards informativos. El sistema requiere autenticación por usuario y notificaciones por email.

---

## 1. Calendario de Reservaciones

### 1.1 Vista de Calendario

- Calendario interactivo estilo Airbnb
- Colores por estado de reservación:
    - 🟡 **Anticipo** - Se recibió anticipo (50%)
    - 🔵 **Depósito** - Se recibió depósito bancario
    - 🟠 **Saldo** - Pendiente de pago final (50%)
    - 🟢 **Total Cancelado / Finalizado** - Pagado completamente
    - 🟣 **Cotizado** - Solo cotización, no confirmado
    - 🔴 **En Ejecución** - Evento en curso
- Vista mensual, semanal y diaria
- Click en reservación abre el detalle completo

### 1.2 Tipos de Reservación

El sistema maneja un único flujo de reservación que se adapta según el tipo seleccionado:

| Tipo         | Descripción                                         |
| ------------ | --------------------------------------------------- |
| Evento       | Reserva de salones, áreas libres, jardines, comedores |
| Habitación   | Reserva de habitaciones en edificios Belén o Bethel |

Ambos tipos comparten el mismo calendario y los mismos estados de seguimiento.

### 1.3 Estados de Reservación

| Estado                         | Descripción                                   |
| ------------------------------ | --------------------------------------------- |
| Cotizado                       | Cliente solicitó cotización, no ha confirmado |
| Anticipo                       | Se recibió 50% de anticipo, falta saldo       |
| Depósito                       | Se recibió depósito bancario                  |
| Saldo                          | Pendiente pago final (50%)                    |
| Total Cancelado                | Pagado al 100%                                |
| En Ejecución                   | Evento en curso                               |
| Finalizado                     | Evento completado                             |
| Finalizado con Cierre de Cobro | Completado con cobro final (botón aparte)     |

### 1.4 Horarios de Reservación

| Horario | Horas         | Descripción         |
| ------- | ------------- | ------------------- |
| Mañana  | 7:00 - 13:00  | Eventos matutinos   |
| Tarde   | 14:00 - 19:00 | Eventos vespertinos |
| Noche   | 20:00 - 01:00 | Eventos nocturnos   |

- **Unidad mínima de reserva:** Un horario (4-6 horas)
- **Combinación de horarios:** Se permite combinar horarios (ej: Mañana + Tarde, Tarde + Noche, o los tres)

### 1.5 Alarma de Doble Reservación

- El sistema alerta si se intenta reservar un espacio ya ocupado en el mismo horario
- Indicador visual en el calendario
- Bloquea la reserva duplicada

---

## 2. Pagos y Política de Cobro

### 2.1 Modelo de Pagos

El sistema acepta pagos parciales o el total de la reservación en cualquier momento:

| Modalidad        | Descripción                                              |
| ---------------- | -------------------------------------------------------- |
| Pago Total       | Se abona el 100% al momento de confirmar la reservación  |
| Anticipo + Saldo | Se abona un porcentaje inicial y el resto al finalizar   |

El monto de cada pago es definido libremente por el operador al registrarlo. El sistema lleva el seguimiento del total abonado y el saldo pendiente en todo momento.

### 2.2 Política de Cancelación

- **No hay reembolso** si ya se recibió el anticipo
- El sistema debe mostrar esta política al momento de registrar o confirmar una reservación
- Se registra en el historial del cliente

### 2.3 Notificaciones por Email

- Al confirmar una reservación, el sistema envía notificación automática a:
    - Administradores
    - Encargados de Evento

---

## 3. Autenticación y Acceso

- El sistema requiere **login individual por usuario**
- Cada usuario accede con su nombre de usuario y contraseña
- Las sesiones deben expirar tras un período de inactividad (tiempo a definir)

---

## 4. Usuarios y Roles

### 4.1 Roles del Sistema

| Rol                  | Permisos                                          |
| -------------------- | ------------------------------------------------- |
| Administrador        | Acceso total al sistema                           |
| Recepcionista        | Reservaciones, cotizaciones, clientes             |
| Finanzas             | Gastos, reportes financieros, cierre de cobro     |
| Almacén              | Inventario, mobiliario, cierre de eventos         |
| Encargado de Evento  | Cierre de eventos, ver reservaciones asignadas    |
| Usuario del Sistema  | Crear y consultar reservaciones propias           |
| Visual               | Solo lectura                                      |

> **Nota:** Los permisos detallados del rol "Encargado de Evento" están pendientes de confirmación. Ver sección de preguntas pendientes.

### 4.2 Campos de Usuario

- Nombre completo
- Nombre de usuario
- Contraseña (encriptada)
- Rol
- Correo electrónico
- Teléfono
- Activo (Sí/No)

---

## 5. Formularios

### 5.1 Formulario de Gastos

**Campos:**
- Fecha
- Categoría de gasto
- Descripción
- Monto
- Comprobante (foto, almacenada en la nube)
- Relacionado a evento (opcional)

### 5.2 Formulario de Mobiliario

**Campos:**
- No. de Inventario (único)
- Valor de Compra
- Fecha de Compra
- Categoría (define el % de depreciación anual)
- Depreciación anual (% configurable por categoría)
- Valor Actual (calculado automáticamente)
- Descripción
- Foto (almacenada en la nube)
- Estado (Bueno, Regular, Dañado, Dado de Baja)
- Otros detalles

**Cálculo de Depreciación:**
```
DepreciaciónAnual = ValorCompra × (% categoría / 100)
AñosDesdeCompra = (Hoy - FechaCompra).TotalDays / 365
ValorActual = ValorCompra - (DepreciaciónAnual × AñosDesdeCompra)
```

> ⏳ **Pendiente confirmar:** El porcentaje de depreciación varía por categoría. ¿Este porcentaje es editable desde el sistema por algún rol (ej: Administrador), o viene predefinido al crear la categoría y no se modifica?

**Dar de Baja:**
- Cuando un artículo se daña o se deprecia completamente
- Se debe registrar la razón de la baja
- Estado cambia a "Dado de Baja"
- Se mantiene en historial

### 5.3 Productos a Cotizar

| Categoría             | Descripción                                |
| --------------------- | ------------------------------------------ |
| Comida / Menú         | Platillos, bebidas, postres                |
| Mobiliario            | Sillas, mesas, manteles, vajilla           |
| Adornos y Decoración  | Arreglos florales, globos, centros de mesa |
| Servicios Adicionales | DJ, fotógrafos, meseros, valet parking     |

**Campos por Producto:**
- Nombre
- Categoría
- Precio unitario
- Descripción
- Foto (almacenada en la nube, aparece en la cotización)
- Disponible (Sí/No)
- Unidad de medida
- **Sin límite máximo de productos por cotización**

### 5.4 Notas y Detalles de Decoración

- Campo de texto amplio para describir detalles de decoración
- Permite adjuntar múltiples fotos (almacenadas en la nube)
- Se vincula a la cotización

---

## 6. Cotizaciones y Órdenes de Trabajo

### 6.1 Cotizaciones

- Una cotización puede tener **cualquier cantidad de productos** (sin límite máximo)
- Las fotos de platillos, mobiliario y otros productos aparecen en la cotización
- Una cotización puede ser modificada luego de ser aprobada
- Si se modifica (aumenta o disminuye), la Orden de Trabajo relacionada se actualiza automáticamente

### 6.2 Orden de Trabajo

- Se genera automáticamente al completar y aprobar una cotización
- Incluye todos los productos y servicios seleccionados
- Se actualiza si la cotización es modificada posterior a la aprobación

---

## 7. Almacenamiento de Archivos

- Las fotos (productos, mobiliario, gastos, daños) se almacenan **en la nube**
- Aplica para: fotos de mobiliario, productos a cotizar, evidencias de daños, comprobantes de gastos

---

## 8. Cierre de Eventos

### 8.1 Permisos de Cierre

El cierre de evento puede ser ejecutado por:
- **Administrador**
- **Encargado de Evento**

### 8.2 Proceso de Cierre

Al finalizar un evento:
1. Se abre el formulario de cierre
2. Se muestra lista de todo el mobiliario asignado al evento
3. Por cada artículo se indica:
    - ✅ Retornado en buen estado
    - ⚠️ Retornado con daño (describir daño + foto)
    - ❌ No retornado (pérdida)
4. Se registran observaciones detalladas
5. Se calculan costos de daños/pérdidas
6. Se confirma el cierre

### 8.3 Control de Retorno

- Inventario de retorno: verificar que todo regrese
- Artículos dañados: registrar detalle del daño + evidencia fotográfica
- Artículos perdidos: registrar como pérdida
- Costo de reparación o reposición

---

## 9. Catálogos de Ubicaciones

### 9.1 Áreas Libres

| Área                   | Descripción                   |
| ---------------------- | ----------------------------- |
| Pérgola                | Espacio techado al aire libre |
| Plaza Jerusalén        | Plaza principal               |
| Bautisterio            | Área para ceremonias          |
| Rancho 1               | Espacio tipo rancho           |
| Rancho 2               | Espacio tipo rancho           |
| Rancho 3               | Espacio tipo rancho           |
| Rancho 4               | Espacio tipo rancho           |
| Monte Bienaventuranzas | Área natural                  |
| Las Mariposas          | Jardín temático               |

### 9.2 Comedores

| Comedor    |
| ---------- |
| Nehemías 1 |
| Nehemías 2 |
| Josefa     |
| Magdalena  |

### 9.3 Salones

| Salón     |
| --------- |
| Josefa    |
| Magdalena |
| Timoteo   |
| Salem     |
| Nehemías  |
| Israel    |
| Esther    |
| Jacob     |
| Sansón    |

### 9.4 Edificios y Habitaciones

**Edificios:**
- Belén (Nivel 1 y Nivel 2)
- Bethel (Nivel 1 y Nivel 2)

**Campos de Habitación:**
- Número de habitación
- Edificio (Belén / Bethel)
- Nivel (1 / 2) — seleccionable al crear/reservar
- Capacidad de huéspedes
- Tipo de cama (Individual, Matrimonial, Queen, King)
- Precio por noche
- Estado (Disponible, Reservada, Ocupada, Mantenimiento)
- Foto (almacenada en la nube)

**Funcionalidades Especiales:**
- Mapa visual de cuartos con cuadritos de color por estado
- Selección de nivel (primer nivel / segundo nivel)
- Alarma de doble reservación

### 9.5 Jardines

| Jardín |
| ------ |
| Sharon |
| Juda   |

---

## 10. Clientes

### 10.1 Historial de Ventas

- Lista de todas las reservaciones del cliente
- Lista de cotizaciones
- Total de ventas realizadas
- Monto total gastado
- Exportable a Excel y PDF

---

## 11. Dashboards

Vista principal con contadores y alertas clave.

| Widget                | Descripción                               |
| --------------------- | ----------------------------------------- |
| Reservaciones del Mes | Total de reservaciones en el mes          |
| Eventos Hoy           | Lista de eventos activos hoy              |
| Próximos Eventos      | Eventos de los próximos 7 días            |
| Ingresos del Mes      | Total de ingresos del mes                 |
| Gastos del Mes        | Total de gastos del mes                   |
| Clientes Nuevos       | Cantidad de clientes registrados este mes |
| Alertas de Inventario | Artículos dañados o dados de baja         |

---

## 12. Facturación

- **No** se requiere factura relacionada en la venta de cliente
- El sistema solo registra la venta, no genera factura fiscal

---

## 13. Registro de Empleados y Equipo

- Registro de empleados del centro
- Datos básicos: nombre, puesto, teléfono, correo
- Asignación a áreas (recepción, cocina, mantenimiento, etc.)
- Control de activos/inactivos

---

## 14. Resumen de Requerimientos por Prioridad

### Alta Prioridad (Fase 1)

| # | Requerimiento                           | Módulo        |
| - | --------------------------------------- | ------------- |
| 1 | Autenticación con login por usuario     | Seguridad     |
| 2 | Calendario de reservaciones con colores | Reservaciones |
| 3 | Formulario de reservación completo      | Reservaciones |
| 4 | Alarma de doble reservación             | Reservaciones |
| 5 | Modelo de pagos 50/50                   | Reservaciones |
| 6 | Gestión de clientes con tipos           | Clientes      |
| 7 | Catálogos de ubicaciones                | Catálogos     |
| 8 | Usuarios y roles                        | Configuración |
| 9 | Dashboard básico                        | Principal     |

### Media Prioridad (Fase 2)

| #  | Requerimiento                             | Módulo       |
| -- | ----------------------------------------- | ------------ |
| 10 | Módulo de cotizaciones                    | Cotizaciones |
| 11 | Catálogo de productos con fotos           | Catálogos    |
| 12 | Orden de trabajo automática               | Cotizaciones |
| 13 | Inventario de mobiliario con depreciación por categoría | Inventario |
| 14 | Formulario de gastos                      | Finanzas     |
| 15 | Notificaciones por email al confirmar reservación | Comunicación |

### Baja Prioridad (Fase 3)

| #  | Requerimiento                    | Módulo        |
| -- | -------------------------------- | ------------- |
| 16 | Cierre de eventos con retorno    | Eventos       |
| 17 | Mapa visual de habitaciones      | Catálogos     |
| 18 | Reportes exportables (Excel/PDF) | Reportes      |
| 19 | Fotos en cotizaciones            | Cotizaciones  |
| 20 | Registro de empleados            | Configuración |

---

## 15. Respuestas Pendientes de Confirmación

| # | Tema | Pregunta |
| - | ---- | -------- |
| 1 | Reservaciones | Al combinar horarios (ej: Mañana + Tarde), ¿se cobra la suma de cada horario por separado o existe una tarifa especial para combinaciones? |
| 2 | Calendario | ¿Las habitaciones del hotel aparecen en el mismo calendario que los eventos, o prefieren una vista separada? |
| 3 | Cotizaciones | Cuando una cotización se modifica después de aprobada, ¿quién tiene permiso? ¿Solo el Administrador o también el Recepcionista? |
| 4 | Inventario | Cuando se incluye mobiliario propio en una cotización, ¿el sistema debe controlar que no quede comprometido en dos eventos al mismo tiempo? |
| 5 | Inventario | El porcentaje de depreciación por categoría de mobiliario, ¿puede editarlo el Administrador desde el sistema o se define una sola vez y no se modifica? |
| 6 | Notificaciones | Al confirmar una reservación, ¿también se le envía confirmación por correo al cliente? |
| 7 | Roles | El rol "Encargado de Evento": ¿qué otros módulos debería poder ver o editar además del cierre de evento? |

---

**Fin del Documento de Requerimientos v2.0**