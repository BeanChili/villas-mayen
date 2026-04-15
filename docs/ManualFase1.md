# Manual de Usuario - Fase 1
## Sistema Villas Mayen

**Fecha:** Marzo 2026
**Version:** 1.0
**Tipo:** Sistema de Gestión de Reservaciones y Eventos (estilo Airbnb)

---

## Tabla de Contenidos

1. [Descripción General del Sistema](#1-descripción-general-del-sistema)
2. [Módulos Principales](#2-módulos-principales)
   - 2.1 [Calendario de Reservaciones](#21-calendario-de-reservaciones)
   - 2.2 [Cotizaciones](#22-cotizaciones)
   - 2.3 [Gastos](#23-gastos)
   - 2.4 [Mobiliario e Inventario](#24-mobiliario-e-inventario)
   - 2.5 [Productos a Cotizar](#25-productos-a-cotizar)
   - 2.6 [Cierre de Eventos](#26-cierre-de-eventos)
   - 2.7 [Usuarios y Roles](#27-usuarios-y-roles)
3. [Catálogos de Ubicaciones](#3-catálogos-de-ubicaciones)
   - 3.1 [Áreas Libres](#31-áreas-libres)
   - 3.2 [Comedores](#32-comedores)
   - 3.3 [Salones](#33-salones)
   - 3.4 [Edificios y Habitaciones](#34-edificios-y-habitaciones)
   - 3.5 [Jardines](#35-jardines)
4. [Clientes](#4-clientes)
5. [Dashboard](#5-dashboard)
6. [Flujo de Trabajo Principal](#6-flujo-de-trabajo-principal)

---

## 1. Descripción General del Sistema

**Villas Mayen** es un sistema integral de gestión de reservaciones, eventos y hospedaje inspirado en el modelo Airbnb. Permite administrar:

- Reservaciones con calendario visual por colores
- Cotizaciones de eventos
- Control de gastos
- Inventario de mobiliario con depreciación
- Catálogo de productos y servicios
- Cierre de eventos con control de retorno de bienes
- Gestión de clientes e historial de ventas
- Dashboards informativos

### Tecnología

| Componente | Tecnología |
|-----------|------------|
| Framework | Blazor Server (.NET 9.0+) |
| UI | MudBlazor |
| Base de Datos | SQLite con Entity Framework Core |
| Exportación | Excel (.xlsx) y PDF |

---

## 2. Módulos Principales

### 2.1 Calendario de Reservaciones

**Ubicación:** Menu lateral → Reservaciones → Calendario

**Descripción:** Vista de calendario estilo Airbnb que muestra todas las reservaciones con código de colores según el estado.

**Estados y Colores:**

| Estado | Color | Descripción |
|--------|-------|-------------|
| Anticipo | 🟡 Amarillo | Se recibió anticipo, falta saldo |
| Depósito | 🔵 Azul | Se recibió depósito bancario |
| Saldo | 🟠 Naranja | Pendiente de pago total |
| Total Cancelado | 🟢 Verde | Pagado completamente |
| Finalizado | ⚪ Gris | Evento completado |
| Cotizado | 🟣 Morado | Solo cotización, no confirmado |
| En Ejecución | 🔴 Rojo | Evento en curso |

**Funcionalidades:**
- Vista mensual/semanal/diaria del calendario
- Click en día abre detalle de reservaciones
- Filtro por tipo de ubicación (salón, área libre, habitación)
- Alerta visual de doble reservación (cuadro rojo)
- Botón "Finalizado con cierre de cobro" para cerrar evento

**Formulario de Reservación:**
- Cliente (selector con búsqueda)
- Tipo de ubicación y ubicación específica
- Horario (Mañana / Tarde / Noche)
- Fecha inicio y fin
- Estado de pago
- Observaciones

> **CAPTURA 1:** Tomar captura del calendario mensual mostrando eventos de diferentes colores.

---

### 2.2 Cotizaciones

**Ubicación:** Menu lateral → Cotizaciones

**Descripción:** Módulo para crear y gestionar cotizaciones de eventos. Las cotizaciones pueden ser modificadas incluso después de ser aprobadas, y la orden de trabajo se actualiza automáticamente.

**Estructura de una Cotización:**

| Sección | Contenido |
|---------|-----------|
| Datos Generales | Cliente, fecha evento, ubicación, horario |
| Comida/Menú | Platillos seleccionados con fotos |
| Mobiliario | Artículos de inventario a utilizar |
| Adornos y Decoración | Elementos decorativos |
| Servicios Adicionales | Extras contratados |
| Notas y Detalles | Información amplia de decoración |

**Funcionalidades:**
- Crear cotización con múltiples secciones
- Agregar fotos a platillos, mobiliario, etc.
- Modificar cotización aprobada (actualiza orden automáticamente)
- Generar Orden de Trabajo al completar cotización
- Exportar a PDF con formato profesional
- Estados: Borrador → Enviada → Aprobada → Rechazada

**Categorías de Productos:**
- Comida / Menú
- Mobiliario
- Adornos y Decoración
- Servicios Adicionales

> **CAPTURA 2:** Tomar captura del formulario de cotización mostrando las secciones de productos.

---

### 2.3 Gastos

**Ubicación:** Menu lateral → Finanzas → Gastos

**Descripción:** Registro y control de gastos operativos del centro de eventos.

**Campos del Formulario:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Fecha | Date | Fecha del gasto |
| Categoría | Selector | Tipo de gasto |
| Descripción | Texto | Detalle del gasto |
| Monto | Decimal | Valor del gasto |
| Comprobante | Imagen | Foto de factura/recibo |
| Relacionado a | Selector | Evento o reservación (opcional) |

**Categorías de Gastos:**
- Mantenimiento
- Servicios (luz, agua, internet)
- Sueldos
- Compra de insumos
- Decoración
- Transporte
- Otros

**Reportes:**
- Gastos por período
- Gastos por categoría
- Gráfico de distribución
- Exportación a Excel y PDF

> **CAPTURA 3:** Tomar captura del formulario de gastos y listado.

---

### 2.4 Mobiliario e Inventario

**Ubicación:** Menu lateral → Inventario → Mobiliario

**Descripción:** Control de inventario de mobiliario con número de inventario, depreciación anual y registro fotográfico.

**Campos del Mobiliario:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| No. Inventario | Texto | Número único de inventario |
| Nombre | Texto | Descripción del artículo |
| Categoría | Selector | Tipo de mobiliario |
| Valor de Compra | Decimal | Precio original de compra |
| Depreciación Anual | Decimal | 10% del valor de compra |
| Valor Actual | Calculado | ValorCompra - (depreciación × años) |
| Estado | Selector | Bueno, Regular, Dañado, Dado de Baja |
| Foto | Imagen | Fotografía del artículo |
| Fecha Compra | Date | Cuándo se adquirió |
| Ubicación | Selector | Dónde se almacena |
| Observaciones | Texto | Otros detalles |

**Categorías de Mobiliario:**
- Sillas
- Mesas
- Manteles
- Vajilla
- Cristalería
- Cubertería
- Decoración
- Equipos de sonido
- Iluminación
- Carpas
- Otros

**Funcionalidades:**
- CRUD completo de mobiliario
- Cálculo automático de depreciación (10% anual)
- Registro fotográfico
- Dar de baja con razón (daño o depreciación total)
- Reporte de inventario actual
- Historial de uso por evento

> **CAPTURA 4:** Tomar captura del listado de mobiliario con fotos y estados.

---

### 2.5 Productos a Cotizar

**Ubicación:** Menu lateral → Catálogos → Productos

**Descripción:** Catálogo de productos y servicios disponibles para agregar a cotizaciones.

**Categorías:**

| Categoría | Ejemplos |
|-----------|----------|
| Comida / Menú | Platillos, bebidas, postres |
| Mobiliario | Sillas, mesas, manteles |
| Adornos y Decoración | Arreglos florales, globos, centros de mesa |
| Servicios Adicionales | DJ, fotógrafos, meseros, valet parking |

**Campos por Producto:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Nombre | Texto | Nombre del producto/servicio |
| Categoría | Selector | Categoría a la que pertenece |
| Precio Unitario | Decimal | Precio de venta |
| Descripción | Texto | Detalle del producto |
| Foto | Imagen | Imagen referencial |
| Disponible | Boolean | Si está activo para cotizar |
| Unidad de Medida | Selector | Pieza, persona, hora, evento |

> **CAPTURA 5:** Tomar captura del catálogo de productos con fotos y precios.

---

### 2.6 Cierre de Eventos

**Ubicación:** Menu lateral → Eventos → Cierre

**Descripción:** Al finalizar un evento, se debe hacer el cierre verificando el retorno de todos los bienes prestados y registrando cualquier daño o pérdida.

**Proceso de Cierre:**

1. Seleccionar el evento/reservación a cerrar
2. El sistema muestra la lista de mobiliario asignado
3. Por cada artículo, indicar:
   - ✅ Retornado en buen estado
   - ⚠️ Retornado con daño (describir)
   - ❌ No retornado (pérdida)
4. Registrar observaciones de cada artículo
5. Calcular costos de daños/pérdidas
6. Confirmar cierre

**Campos del Cierre:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Evento | Selector | Reservación a cerrar |
| Fecha Cierre | Date | Fecha del cierre |
| Estado Retorno | Selector | Completo, Con Daños, Con Pérdidas |
| Observaciones | Texto | Detalle general |
| Costo Daños | Calculado | Suma de artículos dañados |
| Costo Pérdidas | Calculado | Suma de artículos perdidos |

**Detalle de Retorno por Artículo:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Artículo | Referencia | Mobiliario asignado |
| Estado Retorno | Selector | Bueno, Dañado, Perdido |
| Descripción Daño | Texto | Detalle del daño si aplica |
| Foto Daño | Imagen | Evidencia del daño |
| Costo Reparación | Decimal | Valor de reparación o reposición |

> **CAPTURA 6:** Tomar captura del formulario de cierre de evento.

---

### 2.7 Usuarios y Roles

**Ubicación:** Menu lateral → Configuración → Usuarios

**Descripción:** Gestión de usuarios del sistema con control de acceso por roles.

**Roles del Sistema:**

| Rol | Permisos |
|-----|----------|
| Administrador | Acceso total al sistema |
| Recepcionista | Reservaciones, cotizaciones, clientes |
| Finanzas | Gastos, reportes financieros |
| Almacén | Inventario, mobiliario, cierre de eventos |
| Visual | Solo consulta, sin edición |

**Campos del Usuario:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Nombre | Texto | Nombre completo |
| Usuario | Texto | Nombre de usuario para login |
| Contraseña | Texto | Contraseña encriptada |
| Rol | Selector | Rol asignado |
| Correo | Email | Correo electrónico |
| Teléfono | Texto | Número de contacto |
| Activo | Boolean | Si el usuario está habilitado |

> **CAPTURA 7:** Tomar captura de la pantalla de usuarios.

---

## 3. Catálogos de Ubicaciones

### 3.1 Áreas Libres

**Ubicación:** Menu lateral → Catálogos → Áreas Libres

| Área | Capacidad Estimada | Descripción |
|------|-------------------|-------------|
| Pérgola | 50-80 | Espacio techado al aire libre |
| Plaza Jerusalén | 100-150 | Plaza principal para eventos grandes |
| Bautisterio | 30-50 | Área especial para ceremonias |
| Rancho 1 | 40-60 | Espacio tipo rancho |
| Rancho 2 | 40-60 | Espacio tipo rancho |
| Rancho 3 | 40-60 | Espacio tipo rancho |
| Rancho 4 | 40-60 | Espacio tipo rancho |
| Monte Bienaventuranzas | 80-120 | Área natural para eventos |
| Las Mariposas | 60-90 | Jardín temático |

---

### 3.2 Comedores

**Ubicación:** Menu lateral → Catálogos → Comedores

| Comedor | Capacidad | Descripción |
|---------|-----------|-------------|
| Nehemías 1 | 80-100 | Comedor principal sección 1 |
| Nehemías 2 | 80-100 | Comedor principal sección 2 |
| Josefa | 50-70 | Comedor intermedio |
| Magdalena | 50-70 | Comedor intermedio |

---

### 3.3 Salones

**Ubicación:** Menu lateral → Catálogos → Salones

| Salón | Capacidad | Tipo |
|-------|-----------|------|
| Josefa | 50-70 | Interior |
| Magdalena | 50-70 | Interior |
| Timoteo | 60-80 | Interior |
| Salem | 80-100 | Interior grande |
| Nehemías | 80-100 | Interior grande |
| Israel | 40-60 | Interior |
| Esther | 40-60 | Interior |
| Jacob | 40-60 | Interior |
| Sansón | 40-60 | Interior |

---

### 3.4 Edificios y Habitaciones

**Ubicación:** Menu lateral → Catálogos → Edificios

**Edificio Belén:**

| Nivel | Habitaciones | Descripción |
|-------|--------------|-------------|
| Nivel 1 | Varias | Planta baja |
| Nivel 2 | Varias | Segundo piso |

**Edificio Bethel:**

| Nivel | Habitaciones | Descripción |
|-------|--------------|-------------|
| Nivel 1 | Varias | Planta baja |
| Nivel 2 | Varias | Segundo piso |

**Campos de Habitación:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Número | Texto | Número de habitación |
| Edificio | Selector | Belén o Bethel |
| Nivel | Selector | 1 o 2 |
| Capacidad | Número | Número de huéspedes |
| Tipo de Cama | Selector | Individual, Matrimonial, Queen, King |
| Precio por Noche | Decimal | Tarifa de hospedaje |
| Estado | Selector | Disponible, Reservada, Mantenimiento |
| Foto | Imagen | Imagen de la habitación |

**Funcionalidades Adicionales:**
- Mapa visual de cuartos (vista gráfica)
- Cuadritos de color según estado (reservado, cotizado, en pagos)
- Alarma de doble reservación

> **CAPTURA 8:** Tomar captura del mapa de habitaciones.

---

### 3.5 Jardines

**Ubicación:** Menu lateral → Catálogos → Jardines

| Jardín | Capacidad | Descripción |
|--------|-----------|-------------|
| Sharon | 60-100 | Jardín principal |
| Juda | 60-100 | Jardín secundario |

---

## 4. Clientes

**Ubicación:** Menu lateral → Clientes

**Descripción:** Gestión de clientes con tipificación e historial de ventas.

**Campos del Cliente:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| Nombre | Texto | Nombre completo o razón social |
| Tipo Cliente | Selector | Particular, Empresa, Iglesia, Institución |
| Teléfono | Texto | Número de contacto |
| Correo | Email | Email de contacto |
| Dirección | Texto | Dirección física |
| RFC/NIT | Texto | Identificación fiscal |
| Observaciones | Texto | Notas adicionales |
| Fecha Registro | Date | Cuándo se registró |

**Historial del Cliente:**
- Lista de todas las reservaciones
- Lista de todas las cotizaciones
- Total de ventas realizadas
- Monto total gastado
- Exportación a Excel y PDF

> **CAPTURA 9:** Tomar captura de la ficha del cliente con historial.

---

## 5. Dashboard

**Ubicación:** Página principal al ingresar al sistema

**Widgets Disponibles:**

| Widget | Descripción |
|--------|-------------|
| Reservaciones del Mes | Contador y mini-calendario |
| Eventos en Ejecución | Lista de eventos activos hoy |
| Próximos Eventos | Eventos de los próximos 7 días |
| Gastos del Mes | Total de gastos del mes actual |
| Clientes Nuevos | Clientes registrados este mes |
| Mobiliario en Uso | Artículos asignados a eventos |
| Alertas de Inventario | Mobiliario dañado o dado de baja |
| Ingresos del Mes | Resumen financiero |

**Gráficos:**
- Reservaciones por tipo de ubicación
- Ingresos vs Gastos mensuales
- Ocupación de habitaciones
- Eventos por categoría

> **CAPTURA 10:** Tomar captura del Dashboard completo.

---

## 6. Flujo de Trabajo Principal

### Flujo de una Reservación

```
1. Cliente solicita cotización
   ↓
2. Se crea Cotización (estado: Borrador)
   ↓
3. Se envía cotización al cliente (estado: Enviada)
   ↓
4. Cliente aprueba (estado: Aprobada)
   ↓
5. Se genera Orden de Trabajo
   ↓
6. Se registra Reservación en calendario
   ↓
7. Cliente paga anticipo (estado: Anticipo)
   ↓
8. Cliente completa pago (estado: Total Cancelado)
   ↓
9. Evento se ejecuta (estado: En Ejecución)
   ↓
10. Se realiza Cierre de Evento
    ↓
11. Estado: Finalizado
```

### Flujo de Hospedaje

```
1. Cliente reserva habitación
   ↓
2. Se verifica disponibilidad (evita doble reserva)
   ↓
3. Se registra reserva con fechas
   ↓
4. Cliente realiza check-in
   ↓
5. Cliente realiza check-out
   ↓
6. Se libera habitación
```

---

## Resumen de Funcionalidades - Fase 1

| # | Funcionalidad | Estado | Ubicación |
|---|--------------|--------|-----------|
| 1 | Calendario de Reservaciones | 📋 Por implementar | Reservaciones → Calendario |
| 2 | Módulo de Cotizaciones | 📋 Por implementar | Cotizaciones |
| 3 | Registro de Gastos | 📋 Por implementar | Finanzas → Gastos |
| 4 | Inventario de Mobiliario | 📋 Por implementar | Inventario → Mobiliario |
| 5 | Catálogo de Productos | 📋 Por implementar | Catálogos → Productos |
| 6 | Cierre de Eventos | 📋 Por implementar | Eventos → Cierre |
| 7 | Usuarios y Roles | 📋 Por implementar | Configuración → Usuarios |
| 8 | Catálogos de Ubicaciones | 📋 Por implementar | Catálogos |
| 9 | Gestión de Clientes | 📋 Por implementar | Clientes |
| 10 | Dashboard | 📋 Por implementar | Principal |
| 11 | Mapa de Habitaciones | 📋 Por implementar | Catálogos → Edificios |
| 12 | Alarma Doble Reservación | 📋 Por implementar | Reservaciones |

---

**Fin del Manual - Fase 1**

*Documento generado el 31 de Marzo 2026*
