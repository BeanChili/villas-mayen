# Villas Mayen - Resumen de Implementación

**Fecha:** Junio 2026
**Versión del Sistema:** 2.0
**Estado:** Funcionalidades core implementadas y operativas

---

## ✅ LO QUE SE IMPLEMENTÓ

### 1. Cotizaciones (Módulo Principal)
- **Creación de cotizaciones** con múltiples espacios (salones, jardines, comedores, áreas libres)
- **Horarios exactos** por espacio (ej: 07:00 - 13:00, 14:30 - 19:00)
- **Precios por persona o precio fijo** por espacio
- **Items de cotización**: productos (comidas, adornos, servicios) + mobiliario (mesas, sillas, carpas, manteles)
- **Descuentos por ítem**: porcentaje o monto fijo en cada línea
- **Moneda**: cotizaciones en Quetzales (GTQ) o Dólares (USD) con tipo de cambio configurable
- **Estados del flujo**: Borrador → Enviada → Confirmada → En Ejecución → Finalizada
- **Vencimiento automático**: 15 días calendario para cotizaciones enviadas

### 2. Calendario
- **Vista mensual, semanal y diaria**
- **Vista de día estilo Google Calendar**: timeline vertical con eventos posicionados por hora
- **Colores por estado**: cada estado de cotización tiene un color distintivo
- **Eventos solapados**: se distribuyen en columnas automáticamente
- **Línea de hora actual**: indicador rojo que muestra la hora actual

### 3. Clientes
- **Registro de clientes** con datos de contacto
- **Categorías**: Bueno, Regular, Delicado, En Observación
- **Historial**: cada cliente ve sus cotizaciones anteriores

### 4. Habitaciones
- **Edificios y pisos**: Belén, Bethel
- **Habitaciones** con capacidad, tipo de cama, precio por noche/persona
- **Estados**: Disponible, Reservada, Ocupada, Mantenimiento

### 5. Inventario / Mobiliario
- **Registro de mobiliario** con número de inventario único
- **Categorías**: Sillas, Mesas, Manteles, Carpas, Vajilla, etc.
- **Control de depreciación** automática
- **Precio de alquiler** para incluir en cotizaciones
- **Estados**: Bueno, Regular, Dañado, Dado de Baja

### 6. Liquidación de Eventos
- **Cierre de eventos** cuando están "En Ejecución"
- **Control de mobiliario**: marcar cada item como OK, Dañado o Perdido
- **Costos de daños y pérdidas**: se calculan automáticamente
- **Cambio a Finalizada**: el evento se cierra y queda archivado

### 7. Cierres Diarios
- **Reporte diario** de eventos ejecutados
- **Totales cobrados, pendientes, daños**
- **Historial de cierres** consultable

### 8. Configuración
- **Tipo de cambio**: editable en Configuración (1 USD = X GTQ)
- **Usuarios**: creación de usuarios con diferentes roles
- **Permisos**: 7 roles predefinidos (Admin, Recepcionista, Finanzas, Almacén, Encargado, Visual, Usuario Sistema)

### 9. PDF de Cotizaciones
- **Descarga de cotización en PDF** con formato profesional
- Incluye: datos del cliente, espacios, items, totales, observaciones, términos de pago, firmas

---

## 📋 GUÍA RÁPIDA DE USO

### Para crear una cotización:
1. Ir a "Cotizaciones" → "Nueva Cotización"
2. Seleccionar cliente (o crear uno nuevo)
3. Elegir fecha del evento
4. Agregar espacios (salón, jardín, etc.) con horarios
5. Agregar productos/servicios/mobiliario desde las pestañas
6. Ver total y guardar

### Para confirmar una cotización:
1. Abrir la cotización en "Cotizaciones"
2. Clic en "Confirmar" → se crea la reservación automáticamente
3. Registrar pagos en "Reservaciones" → clic en la reservación → "Registrar Pago"

### Para liquidar un evento:
1. El evento debe estar en estado "En Ejecución"
2. Ir a "Eventos" → clic en "Liquidar"
3. Revisar cada item de mobiliario: OK / Dañado / Perdido
4. Ingresar costos de reparación si aplica
5. Clic en "Liquidar Evento" → pasa a "Finalizada"

### Para ver el calendario:
1. Ir a "Reservaciones" (es el calendario)
2. Cambiar entre Mes / Semana / Día con los botones
3. En vista día: los eventos aparecen en su horario exacto
4. Clic en cualquier evento para ver detalles

---

## ❌ LO QUE NO SE HIZO (Pendiente)

| # | Funcionalidad | Estado | Nota |
|---|--------------|--------|------|
| 1 | **Email a contabilidad** | ⏸️ Pausado | Falta configurar servicio de email (Resend). El botón está deshabilitado temporalmente. |
| 2 | **Cierres automáticos** | ⏸️ Pausado | Actualmente los cierres son manuales. Se puede agregar generación automática diaria. |
| 3 | **Roles y permisos finales** | ⏸️ Esperando | El sistema tiene 7 roles predefinidos, pero necesitamos que usted defina qué puede hacer cada uno. |
| 4 | **Hospedaje independiente** | ⏸️ Pausado | Habitaciones sin evento. Se puede agregar si lo necesita. |
| 5 | **Auto-transición de estados** | ⏸️ Pausado | El sistema no pasa automáticamente "Confirmada" → "En Ejecución" cuando llega la fecha. Debe hacerse manualmente. |

---

## 🎯 DECISIONES IMPORTANTES TOMADAS

1. **Una sola moneda por cotización**: no se mezclan GTQ y USD en la misma cotización
2. **Pagos en USD se registran en USD**: no se convierten automáticamente
3. **Descuento por ítem**: aplica a cada línea individual, no al total general
4. **Cotización inmutable después de confirmar**: si el cliente quiere cambios, se cancela y se crea una nueva
5. **15 días calendario** (no hábiles) para vencimiento de cotizaciones enviadas
6. **Mobiliario unificado**: productos y mobiliario se agregan desde la misma sección en la cotización

---

## 🔧 ACCESO AL SISTEMA

**URL:** [http://localhost:3000](http://3000) (o el dominio que configure)

**Usuarios de prueba:**
- admin / admin123
- recepcionista / recepcionista123
- finanzas / finanzas123
- almacen / almacen123
- visual / visual123

---

## 📞 SOPORTE

Para cualquier consulta o ajuste:
- Revisar este documento primero
- Si es un bug o funcionalidad nueva, documentar: qué esperaba, qué pasó, pasos para reproducir

---

*Documento generado el 30 de Mayo de 2026*
*Sistema Villas Mayen v2.0*
