# Propuesta de Requerimientos - Sistema de Reservas Villas Mayen

**Fecha:** Marzo 2026
**Cliente:** Sistema de Reservas Villas Mayen  
**Tipo de Sistema:** Gestión de Reservaciones y Eventos

---

## Resumen Ejecutivo

Sistema integral para la gestión de un centro de eventos y hospedaje que incluye reservaciones con calendario visual, cotizaciones, control de inventario, gestión de clientes y dashboards informativos.

---

## 1. Calendario de Reservaciones

### 1.1 Vista de Calendario

- Mostrar un calendario interactivo estilo Airbnb
- Colores por estado de reservación:
  - 🟡 **Anticipo** - Se recibió anticipo
  - 🔵 **Depósito** - Se recibió depósito bancario
  - 🟠 **Saldo** - Pendiente de pago total
  - 🟢 **Total Cancelado / Finalizado** - Pagado completamente
  - 🟣 **Cotizado** - Solo cotización, no confirmado
  - 🔴 **En Ejecución** - Evento en curso
- Vista mensual, semanal y diaria
- Click en evento abre detalle completo

### 1.2 Estados de Reservación


| Estado                         | Descripción                                   |
| ------------------------------ | --------------------------------------------- |
| Cotizado                       | Cliente solicitó cotización, no ha confirmado |
| Anticipo                       | Se recibió anticipo, falta saldo              |
| Depósito                       | Se recibió depósito bancario                  |
| Saldo                          | Pendiente de pago total                       |
| Total Cancelado                | Pagado al 100%                                |
| En Ejecución                   | Evento en curso                               |
| Finalizado                     | Evento completado                             |
| Finalizado con Cierre de Cobro | Completado con cobro final (botón aparte)     |


### 1.3 Horarios de Reservación

- Mañana
- Tarde
- Noche

### 1.4 Alarma de Doble Reservación

- El sistema debe alertar si se intenta reservar un espacio ya ocupado
- Mostrar indicador visual (cuadro rojo) en el calendario
- Bloquear la reserva duplicada

---

## 2. Formularios

### 2.1 Formulario de Gastos

**Campos:**

- Fecha
- Categoría de gasto
- Descripción
- Monto
- Comprobante (foto)
- Relacionado a evento (opcional)

### 2.2 Formulario de Mobiliario

**Campos:**

- No. de Inventario (único)
- Valor de Compra
- Depreciación por año (10% automático)
- Valor Actual = ValorCompra - (DepreciaciónAcumulada)
- Descripción
- Categoría
- Foto
- Estado (Bueno, Regular, Dañado, Dado de Baja)
- Fecha de Compra
- Otros detalles

**Cálculo de Depreciación:**

```
DepreciaciónAnual = ValorCompra × 0.10
AñosDesdeCompra = (Hoy - FechaCompra).TotalDays / 365
ValorActual = ValorCompra - (DepreciaciónAnual × AñosDesdeCompra)
```

**Dar de Baja:**

- Cuando un artículo se daña o se deprecia completamente
- Se debe registrar la razón de la baja
- Estado cambia a "Dado de Baja"
- Se mantiene en historial

### 2.3 Productos a Cotizar


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
- Foto (debe aparecer en la cotización)
- Disponible (Sí/No)
- Unidad de medida

### 2.4 Notas y Detalles de Decoración

- Campo de texto amplio para describir detalles de decoración
- Permite adjuntar múltiples fotos
- Se vincula a la cotización

---

## 3. Categorías de Productos

### Catálogo Principal


| Categoría             | Subcategorías                                 |
| --------------------- | --------------------------------------------- |
| Comida/Menú           | Entradas, Plato Fuerte, Postres, Bebidas      |
| Mobiliario            | Sillas, Mesas, Manteles, Vajilla, Cristalería |
| Adornos y Decoración  | Flores, Globos, Centros de Mesa, Iluminación  |
| Servicios Adicionales | Música, Fotografía, Catering, Transporte      |


### Orden de Trabajo

- Al completar la cotización, se genera automáticamente una Orden de Trabajo
- La orden incluye todos los productos y servicios seleccionados
- Puede ser modificada si la cotización cambia después de aprobada
- Si la cotización aumenta o disminuye, la orden se actualiza

---

## 4. Cierre de Eventos

### 4.1 Proceso de Cierre

Al finalizar un evento:

1. Se abre el formulario de cierre
2. Se muestra lista de todo el mobiliario asignado al evento
3. Por cada artículo se indica:
  - ✅ Retornado en buen estado
  - ⚠️ Retornado con daño (describir daño)
  - ❌ No retornado (pérdida)
4. Se registran observaciones detalladas
5. Se calculan costos de daños/pérdidas
6. Se confirma el cierre

### 4.2 Control de Retorno

- Inventario de retorno: verificar que todo regrese
- Artículos dañados: registrar detalle del daño
- Artículos perdidos: registrar como pérdida
- Fotos de daños como evidencia
- Costo de reparación o reposición

---

## 5. Usuarios y Roles

### Roles del Sistema


| Rol           | Permisos                                      |
| ------------- | --------------------------------------------- |
| Administrador | Acceso total                                  |
| Recepcionista | Reservaciones, cotizaciones, clientes         |
| Finanzas      | Gastos, reportes financieros, cierre de cobro |
| Almacén       | Inventario, mobiliario, cierre de eventos     |
| Visual        | Solo lectura                                  |


### Campos de Usuario

- Nombre completo
- Nombre de usuario
- Contraseña (encriptada)
- Rol
- Correo electrónico
- Teléfono
- Activo (Sí/No)

---

## 6. Catálogos de Ubicaciones

### 6.1 Áreas Libres


| Área                   | Capacidad | Descripción                   |
| ---------------------- | --------- | ----------------------------- |
| Pérgola                | 50-80     | Espacio techado al aire libre |
| Plaza Jerusalén        | 100-150   | Plaza principal               |
| Bautisterio            | 30-50     | Área para ceremonias          |
| Rancho 1               | 40-60     | Espacio tipo rancho           |
| Rancho 2               | 40-60     | Espacio tipo rancho           |
| Rancho 3               | 40-60     | Espacio tipo rancho           |
| Rancho 4               | 40-60     | Espacio tipo rancho           |
| Monte Bienaventuranzas | 80-120    | Área natural                  |
| Las Mariposas          | 60-90     | Jardín temático               |


### 6.2 Comedores


| Comedor    | Capacidad |
| ---------- | --------- |
| Nehemías 1 | 80-100    |
| Nehemías 2 | 80-100    |
| Josefa     | 50-70     |
| Magdalena  | 50-70     |


### 6.3 Salones


| Salón     | Capacidad |
| --------- | --------- |
| Josefa    | 50-70     |
| Magdalena | 50-70     |
| Timoteo   | 60-80     |
| Salem     | 80-100    |
| Nehemías  | 80-100    |
| Israel    | 40-60     |
| Esther    | 40-60     |
| Jacob     | 40-60     |
| Sansón    | 40-60     |


### 6.4 Edificios y Habitaciones

**Edificios:**

- Belén (Nivel 1 y Nivel 2)
- Bethel (Nivel 1 y Nivel 2)

**Campos de Habitación:**

- Número de habitación
- Edificio (Belén / Bethel)
- Nivel (1 / 2)
- Capacidad de huéspedes
- Tipo de cama (Individual, Matrimonial, Queen, King)
- Precio por noche
- Estado (Disponible, Reservada, Ocupada, Mantenimiento)
- Foto

**Funcionalidades Especiales:**

- Mapa visual de cuartos
- Cuadritos de color por estado
- Selección de nivel (primer nivel / segundo nivel)
- Alarma de doble reservación

### 6.5 Jardines


| Jardín | Capacidad |
| ------ | --------- |
| Sharon | 60-100    |
| Juda   | 60-100    |


---

## 7. Horarios de Renta


| Horario | Horas         | Descripción         |
| ------- | ------------- | ------------------- |
| Mañana  | 7:00 - 13:00  | Eventos matutinos   |
| Tarde   | 14:00 - 19:00 | Eventos vespertinos |
| Noche   | 20:00 - 01:00 | Eventos nocturnos   |


---

## 8. Clientes

### 8.1 Tipos de Cliente


| Tipo        | Descripción                 |
| ----------- | --------------------------- |
| Particular  | Persona física              |
| Empresa     | Persona moral / corporativo |
| Iglesia     | Institución religiosa       |
| Institución | Escuela, gobierno, ONG      |


### 8.2 Historial de Ventas

- Lista de todas las reservaciones del cliente
- Lista de cotizaciones
- Total de ventas realizadas
- Monto total gastado
- Exportable a Excel y PDF

---

## 9. Dashboards

### Widgets Principales


| Widget                | Descripción                    |
| --------------------- | ------------------------------ |
| Reservaciones del Mes | Contador y gráfico             |
| Eventos en Ejecución  | Lista de eventos activos hoy   |
| Próximos Eventos      | Eventos de los próximos 7 días |
| Ingresos del Mes      | Resumen financiero             |
| Gastos del Mes        | Total de gastos                |
| Clientes Nuevos       | Clientes registrados este mes  |
| Mobiliario en Uso     | Artículos asignados            |
| Alertas de Inventario | Artículos dañados o bajos      |


### Gráficos

- Reservaciones por tipo de ubicación
- Ingresos vs Gastos mensuales
- Ocupación de habitaciones
- Eventos por categoría

---

## 10. Facturación

- **No** se requiere factura relacionada en la venta de cliente
- El sistema solo registra la venta, no genera factura fiscal

---

## 11. Registro de Empleados

### 11.1 Equipo de Trabajo

- Registro de empleados del centro
- Datos básicos: nombre, puesto, teléfono, correo
- Asignación a áreas (recepción, cocina, mantenimiento, etc.)
- Control de activos/inactivos

---

## Resumen de Requerimientos por Prioridad

### Alta Prioridad (Fase 1)


| #   | Requerimiento                           | Módulo        |
| --- | --------------------------------------- | ------------- |
| 1   | Calendario de reservaciones con colores | Reservaciones |
| 2   | Formulario de reservación completo      | Reservaciones |
| 3   | Alarma de doble reservación             | Reservaciones |
| 4   | Gestión de clientes con tipos           | Clientes      |
| 5   | Catálogos de ubicaciones                | Catálogos     |
| 6   | Usuarios y roles                        | Configuración |
| 7   | Dashboard básico                        | Principal     |


### Media Prioridad (Fase 2)


| #   | Requerimiento                             | Módulo       |
| --- | ----------------------------------------- | ------------ |
| 8   | Módulo de cotizaciones                    | Cotizaciones |
| 9   | Catálogo de productos                     | Catálogos    |
| 10  | Orden de trabajo automática               | Cotizaciones |
| 11  | Inventario de mobiliario con depreciación | Inventario   |
| 12  | Formulario de gastos                      | Finanzas     |


### Baja Prioridad (Fase 3)


| #   | Requerimiento                    | Módulo        |
| --- | -------------------------------- | ------------- |
| 13  | Cierre de eventos con retorno    | Eventos       |
| 14  | Mapa visual de habitaciones      | Catálogos     |
| 15  | Reportes exportables (Excel/PDF) | Reportes      |
| 16  | Fotos en cotizaciones            | Cotizaciones  |
| 17  | Registro de empleados            | Configuración |


---

## Respuestas del Cliente (Pendientes de Confirmación)


| #   | Pregunta                                                                           | Respuesta |
| --- | ---------------------------------------------------------------------------------- | --------- |
| 1   | ¿Cuál es la unidad minima de tiempo para reservar?                                 |           |
| 2   | ¿Cuántos productos máximos puede tener una cotización?                             |           |
| 3   | ¿El 10% de depreciación anual del mobiliario es fijo o puede variar por categoría? |           |
| 4   | ¿Quién tiene permiso para hacer el cierre de evento?                               |           |
| 5   | ¿Las fotos se almacenan en servidor local o en la nube?                            |           |
| 6   | ¿Se pueden combinar horarios (ej: mañana + tarde)?                                 |           |
| 7   | ¿Se aceptan pagos parciales o solo totales?                                        |           |
| 8   | ¿Hay política de reembolso por cancelaciones?                                      |           |
| 9   | ¿Se requiere notificación por email cuando se confirma una reservación?            |           |
| 10  | ¿El sistema necesita login o es de acceso interno sin autenticación?               |           |


---

**Fin del Documento de Requerimientos**