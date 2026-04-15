# Comparativa Propuesta v1 vs Respuestas del Cliente - Villas Mayen

**Fecha:** Abril 2026
**Versión:** Propuesta v2 (Comparación de cambios)

---

## Resumen de Cambios Identificados

| # | Área Afectada | Cambio Requerido | Estado en Propuesta v1 |
|---|---------------|------------------|------------------------|
| 1 | Depreciación | El 10% debe poder variar por categoría | Fijo (10%) |
| 2 | Cierre de Evento | Solo Administrador y Encargado de Evento pueden cerrar | Admin, Finanzas, Almacén |
| 3 | Almacenamiento | Fotos en la nube (no especificado antes) | No especificado |
| 4 | Horarios | Se pueden combinar (mañana + tarde) | Solo un bloque |
| 5 | Pagos | Acepta pagos parciales (50% anticipo, 50% al final) | Solo total |
| 6 | Reembolso | No hay reembolso si se cancela con anticipo | No especificado |
| 7 | Notificaciones | Email a admins/encargados al confirmar reservación | No especificado |
| 8 | Login | Todos los usuarios deben hacer login | Roles con acceso interno |

---

## Detalle de Cambios por Módulo

### 1. Módulo de Inventario - Depreciación

**Propuesta v1:**
```
DepreciaciónAnual = ValorCompra × 0.10 (fijo 10%)
```

**Cambio requerido:**
- La depreciación debe ser configurable por categoría
- Cada categoría de mobiliario puede tener un % diferente
- Mantener 10% como valor por defecto

**Acción:** Modificar cálculo para permitir porcentaje variable por categoría

---

### 2. Módulo de Cierre de Eventos

**Propuesta v1:**
| Rol           | Permisos                            |
| ------------- | ----------------------------------- |
| Administrador | Acceso total                       |
| Finanzas      | Cierre de cobro                    |
| Almacén       | Cierre de eventos                  |

**Cambio requerido:**
- Solo **Administrador** y **Encargado de Evento** pueden realizar el cierre
- Revisar si existe el rol "Encargado de Evento" o crear nuevos roles

**Acción:** Actualizar lista de roles, agregar rol "Encargado de Evento" si no existe, restringir cierre a estos roles

---

### 3. Almacenamiento de Fotos

**Propuesta v1:**
- No especificaba dónde se almacenan las fotos

**Cambio requerido:**
- Todas las fotos se almacenan en la **nube**
- Fotos de: mobiliario, productos, daños, eventos, comprobantes

**Acción:** Especificar que el sistema debe integrar almacenamiento en la nube (ej: AWS S3, Cloudinary, etc.)

---

### 4. Horarios de Reservación

**Propuesta v1:**
- Mañana (7:00 - 13:00)
- Tarde (14:00 - 19:00)
- Noche (20:00 - 01:00)
- Bloques únicos, no combinables

**Cambio requerido:**
- Los clientes pueden combinar horarios
- Ejemplo: Mañana + Tarde = 4-6 horas (reserva continua)
- Permitir seleccionar múltiples bloques

**Acción:** Modificar formulario de reservación para permitir selección múltiple de horarios

---

### 5. Sistema de Pagos

**Propuesta v1:**
- No especificaba política de pagos parciales

**Cambio requerido:**
- Pagos parciales aceptados
- Estructura: 50% anticipo al confirmar + 50% al finalizar evento
- Registro de pagos parciales en el sistema

**Acción:** Agregar módulo de pagos parciales, registrar cada abono, calcular saldos pendientes

---

### 6. Política de Cancelaciones

**Propuesta v1:**
- No especificaba política de reembolso

**Cambio requerido:**
- **Sin reembolso** si el cliente ya dio anticipo y cancela
- Solo se pierde el dinero del anticipo
- No hay devolución aunque cancele con anticipo

**Acción:** Documentar esta política en el sistema y en términos de servicio

---

### 7. Notificaciones por Email

**Propuesta v1:**
- No especificaba notificaciones

**Cambio requerido:**
- Enviar email de confirmación cuando se confirma una reservación
- Destinatarios: Administradores y Encargados de Evento
- Incluir detalles de la reservación en el email

**Acción:** Implementar sistema de notificaciones por email

---

### 8. Autenticación/Login

**Propuesta v1:**
- Roles definidos pero no especificaba si todos necesitan login

**Cambio requerido:**
- **Todos los usuarios deben hacer login** para acceder al sistema
- Cada usuario con credenciales propias
- Registro de actividad por usuario

**Acción:** Implementar sistema de autenticación completo con login para todos los usuarios

---

## Resumen de Cambios Técnicos

### Nuevas Funcionalidades a Implementar:

1. **Depreciación variable por categoría** - Modificar modelo de mobiliario
2. **Selección múltiple de horarios** - Actualizar formulario de reserva
3. **Pagos parciales** - Nuevo módulo de cobranza
4. **Notificaciones por email** - Sistema de emails
5. **Login obligatorio** - Sistema de autenticación

### Ajustes en Roles:

| Rol                 | Permisos                                                    |
| ------------------- | ----------------------------------------------------------- |
| Administrador       | Acceso total, cierre de eventos, ver notificaciones        |
| Encargado de Evento | Cierre de eventos, ver notificaciones (NUEVO)              |
| Recepcionista       | Reservaciones, cotizaciones, clientes                      |
| Finanzas            | Gastos, reportes financieros (sin cierre de eventos)      |
| Almacén             | Inventario, mobiliario (sin cierre de eventos)            |
| Visual              | Solo lectura                                               |

---

## Pendientes de Confirmar (Antes de Proceder)

- [ ] Confirmar proveedor de almacenamiento en la nube
- [ ] Confirmar servicio de email (SMTP, SendGrid, etc.)
- [ ] Confirmar si el rol "Encargado de Evento" requiere permisos adicionales
- [ ] Definir formato/template del email de confirmación

---

**Fin del documento comparativo**