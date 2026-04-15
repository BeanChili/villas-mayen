# Estructura de Entidades - Sistema Villas Mayen

**Fecha:** Marzo 2026
**Base de Datos:** SQLite con Entity Framework Core

---

## Diagrama de Relaciones (Resumen)

```
Cliente ──┬── Reservacion ──┬── Ubicacion
          │                 ├── Horario
          │                 └── DetalleReservacion
          │
          └── Cotizacion ──┬── DetalleCotizacion
                           └── OrdenTrabajo

Reservacion ──┬── CierreEvento ──┬── DetalleCierre
              │
              └── Gasto

Mobiliario ──┬── CategoriaMobiliario
             └── DetalleCierre

Producto ──┬── CategoriaProducto
           └── DetalleCotizacion

Habitacion ──┬── Edificio
             └── ReservacionHabitacion

Usuario ──┬── Rol
          └── Empleado
```

---

## Entidades Principales

### 1. Cliente

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdCliente | int (PK) | Sí | Identificador único |
| Nombre | string(150) | Sí | Nombre completo o razón social |
| IdTipoCliente | int (FK) | Sí | Tipo de cliente |
| Telefono | string(20) | Sí | Número de contacto |
| Correo | string(100) | No | Email de contacto |
| Direccion | string(250) | No | Dirección física |
| RFC_NIT | string(20) | No | Identificación fiscal |
| Observaciones | string(500) | No | Notas adicionales |
| FechaRegistro | DateTime | Sí | Fecha de registro |
| Activo | bool | Sí | Estado del cliente |

**Relaciones:**
- TipoCliente (N:1)
- Reservaciones (1:N)
- Cotizaciones (1:N)

---

### 2. TipoCliente

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdTipoCliente | int (PK) | Sí | Identificador único |
| Nombre | string(50) | Sí | Nombre del tipo |

**Valores predefinidos:**
- Particular
- Empresa
- Iglesia
- Institución

---

### 3. Reservacion

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdReservacion | int (PK) | Sí | Identificador único |
| IdCliente | int (FK) | Sí | Cliente que reserva |
| IdUbicacion | int (FK) | Sí | Ubicación reservada |
| IdHorario | int (FK) | Sí | Horario de la reservación |
| FechaInicio | DateTime | Sí | Fecha de inicio del evento |
| FechaFin | DateTime | Sí | Fecha de fin del evento |
| Estado | string(20) | Sí | Estado de la reservación |
| MontoTotal | decimal | Sí | Monto total de la reservación |
| MontoAnticipo | decimal | No | Monto de anticipo recibido |
| MontoPagado | decimal | No | Monto total pagado |
| SaldoPendiente | decimal (calculado) | - | MontoTotal - MontoPagado |
| Observaciones | string(1000) | No | Notas adicionales |
| FechaCreacion | DateTime | Sí | Fecha de creación |
| IdCotizacion | int (FK) | No | Cotización relacionada |

**Estados válidos:**
- Cotizado
- Anticipo
- Deposito
- Saldo
- TotalCancelado
- EnEjecucion
- Finalizado
- FinalizadoConCierre

**Relaciones:**
- Cliente (N:1)
- Ubicacion (N:1)
- Horario (N:1)
- Cotizacion (N:1)
- DetalleReservaciones (1:N)
- CierreEvento (1:1)
- Gastos (1:N)

---

### 4. Ubicacion

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdUbicacion | int (PK) | Sí | Identificador único |
| Nombre | string(100) | Sí | Nombre de la ubicación |
| IdTipoUbicacion | int (FK) | Sí | Tipo de ubicación |
| Capacidad | int | No | Capacidad estimada |
| Descripcion | string(500) | No | Descripción del espacio |
| PrecioBase | decimal | No | Precio base por evento |
| Disponible | bool | Sí | Si está disponible para reservar |
| Foto | string(250) | No | Ruta de imagen |

**Relaciones:**
- TipoUbicacion (N:1)
- Reservaciones (1:N)

---

### 5. TipoUbicacion

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdTipoUbicacion | int (PK) | Sí | Identificador único |
| Nombre | string(50) | Sí | Nombre del tipo |

**Valores predefinidos:**
- Área Libre
- Comedor
- Salón
- Jardín
- Habitación

---

### 6. Horario

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdHorario | int (PK) | Sí | Identificador único |
| Nombre | string(50) | Sí | Nombre del horario |
| HoraInicio | TimeSpan | Sí | Hora de inicio |
| HoraFin | TimeSpan | Sí | Hora de fin |

**Valores predefinidos:**

| Nombre | HoraInicio | HoraFin |
|--------|-----------|---------|
| Mañana | 07:00 | 13:00 |
| Tarde | 14:00 | 19:00 |
| Noche | 20:00 | 01:00 |

---

### 7. Cotizacion

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdCotizacion | int (PK) | Sí | Identificador único |
| IdCliente | int (FK) | Sí | Cliente de la cotización |
| IdUbicacion | int (FK) | Sí | Ubicación cotizada |
| FechaEvento | DateTime | Sí | Fecha del evento |
| IdHorario | int (FK) | Sí | Horario del evento |
| Estado | string(20) | Sí | Estado de la cotización |
| Subtotal | decimal | Sí | Subtotal sin impuestos |
| Impuestos | decimal | No | Monto de impuestos |
| Total | decimal | Sí | Total de la cotización |
| NotasDecoracion | string(2000) | No | Detalles amplios de decoración |
| FechaCreacion | DateTime | Sí | Fecha de creación |
| FechaModificacion | DateTime | No | Última modificación |

**Estados válidos:**
- Borrador
- Enviada
- Aprobada
- Rechazada

**Relaciones:**
- Cliente (N:1)
- Ubicacion (N:1)
- Horario (N:1)
- DetalleCotizaciones (1:N)
- OrdenTrabajo (1:1)
- Reservacion (1:1)

---

### 8. DetalleCotizacion

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdDetalleCotizacion | int (PK) | Sí | Identificador único |
| IdCotizacion | int (FK) | Sí | Cotización padre |
| IdProducto | int (FK) | Sí | Producto seleccionado |
| Cantidad | int | Sí | Cantidad |
| PrecioUnitario | decimal | Sí | Precio al momento de cotizar |
| Subtotal | decimal (calculado) | - | Cantidad × PrecioUnitario |
| Observaciones | string(500) | No | Notas del detalle |

**Relaciones:**
- Cotizacion (N:1)
- Producto (N:1)

---

### 9. OrdenTrabajo

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdOrdenTrabajo | int (PK) | Sí | Identificador único |
| IdCotizacion | int (FK) | Sí | Cotización relacionada |
| NumeroOrden | string(20) | Sí | Número de orden (auto) |
| FechaCreacion | DateTime | Sí | Fecha de creación |
| Estado | string(20) | Sí | Estado de la orden |
| Observaciones | string(1000) | No | Notas adicionales |

**Estados válidos:**
- Pendiente
- En Proceso
- Completada
- Cancelada

---

### 10. Gasto

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdGasto | int (PK) | Sí | Identificador único |
| Fecha | DateTime | Sí | Fecha del gasto |
| IdCategoriaGasto | int (FK) | Sí | Categoría del gasto |
| Descripcion | string(500) | Sí | Detalle del gasto |
| Monto | decimal | Sí | Valor del gasto |
| ComprobanteUrl | string(250) | No | Foto del comprobante |
| IdReservacion | int (FK) | No | Evento relacionado |
| FechaRegistro | DateTime | Sí | Cuándo se registró |

**Relaciones:**
- CategoriaGasto (N:1)
- Reservacion (N:1)

---

### 11. CategoriaGasto

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdCategoriaGasto | int (PK) | Sí | Identificador único |
| Nombre | string(50) | Sí | Nombre de la categoría |
| Descripcion | string(200) | No | Descripción |

**Valores predefinidos:**
- Mantenimiento
- Servicios
- Sueldos
- Compra de Insumos
- Decoración
- Transporte
- Otros

---

### 12. Mobiliario

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdMobiliario | int (PK) | Sí | Identificador único |
| NoInventario | string(20) | Sí | Número de inventario (único) |
| Nombre | string(100) | Sí | Nombre del artículo |
| IdCategoriaMobiliario | int (FK) | Sí | Categoría |
| ValorCompra | decimal | Sí | Precio original de compra |
| DepreciacionAnual | decimal (calculado) | - | ValorCompra × 0.10 |
| ValorActual | decimal (calculado) | - | Con depreciación aplicada |
| Estado | string(20) | Sí | Estado actual |
| FotoUrl | string(250) | No | Foto del artículo |
| FechaCompra | DateTime | Sí | Fecha de adquisición |
| Observaciones | string(500) | No | Otros detalles |
| Activo | bool | Sí | Si está activo en inventario |
| FechaBaja | DateTime | No | Fecha de baja |
| RazonBaja | string(500) | No | Razón de la baja |

**Estados válidos:**
- Bueno
- Regular
- Dañado
- DadoDeBaja

**Cálculos:**
```
DepreciacionAnual = ValorCompra × 0.10
AñosTranscurridos = (DateTime.Now - FechaCompra).Days / 365.25
DepreciacionAcumulada = DepreciacionAnual × AñosTranscurridos
ValorActual = Math.Max(0, ValorCompra - DepreciacionAcumulada)
```

**Relaciones:**
- CategoriaMobiliario (N:1)
- DetalleCierres (1:N)

---

### 13. CategoriaMobiliario

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdCategoriaMobiliario | int (PK) | Sí | Identificador único |
| Nombre | string(50) | Sí | Nombre de la categoría |

**Valores predefinidos:**
- Sillas
- Mesas
- Manteles
- Vajilla
- Cristalería
- Cubertería
- Decoración
- Equipos de Sonido
- Iluminación
- Carpas
- Otros

---

### 14. Producto

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdProducto | int (PK) | Sí | Identificador único |
| Nombre | string(100) | Sí | Nombre del producto |
| IdCategoriaProducto | int (FK) | Sí | Categoría |
| PrecioUnitario | decimal | Sí | Precio de venta |
| Descripcion | string(500) | No | Detalle del producto |
| FotoUrl | string(250) | No | Imagen referencial |
| Disponible | bool | Sí | Si está activo para cotizar |
| UnidadMedida | string(20) | Sí | Unidad de medida |

**Unidades de medida:**
- Pieza
- Persona
- Hora
- Evento
- Paquete

**Relaciones:**
- CategoriaProducto (N:1)
- DetalleCotizaciones (1:N)

---

### 15. CategoriaProducto

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdCategoriaProducto | int (PK) | Sí | Identificador único |
| Nombre | string(50) | Sí | Nombre de la categoría |

**Valores predefinidos:**
- Comida / Menú
- Mobiliario
- Adornos y Decoración
- Servicios Adicionales

---

### 16. CierreEvento

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdCierreEvento | int (PK) | Sí | Identificador único |
| IdReservacion | int (FK) | Sí | Reservación cerrada |
| FechaCierre | DateTime | Sí | Fecha del cierre |
| EstadoRetorno | string(20) | Sí | Estado general del retorno |
| CostoTotalDaños | decimal (calculado) | - | Suma de daños |
| CostoTotalPerdidas | decimal (calculado) | - | Suma de pérdidas |
| Observaciones | string(1000) | No | Detalle general |

**Estados de retorno:**
- Completo
- ConDaños
- ConPerdidas

**Relaciones:**
- Reservacion (N:1)
- DetalleCierres (1:N)

---

### 17. DetalleCierre

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdDetalleCierre | int (PK) | Sí | Identificador único |
| IdCierreEvento | int (FK) | Sí | Cierre padre |
| IdMobiliario | int (FK) | Sí | Artículo verificado |
| EstadoRetorno | string(20) | Sí | Estado del artículo |
| DescripcionDaño | string(500) | No | Detalle del daño |
| FotoDañoUrl | string(250) | No | Evidencia del daño |
| CostoReparacion | decimal | No | Costo de reparación/reposición |
| Observaciones | string(500) | No | Notas adicionales |

**Estados de retorno:**
- Bueno
- Dañado
- Perdido

**Relaciones:**
- CierreEvento (N:1)
- Mobiliario (N:1)

---

### 18. Habitacion

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdHabitacion | int (PK) | Sí | Identificador único |
| Numero | string(10) | Sí | Número de habitación |
| IdEdificio | int (FK) | Sí | Edificio al que pertenece |
| Nivel | int | Sí | Nivel/piso (1 o 2) |
| Capacidad | int | Sí | Número de huéspedes |
| TipoCama | string(20) | Sí | Tipo de cama |
| PrecioPorNoche | decimal | Sí | Tarifa de hospedaje |
| Estado | string(20) | Sí | Estado actual |
| FotoUrl | string(250) | No | Imagen de la habitación |
| Descripcion | string(500) | No | Descripción adicional |

**Tipos de cama:**
- Individual
- Matrimonial
- Queen
- King

**Estados:**
- Disponible
- Reservada
- Ocupada
- Mantenimiento

**Relaciones:**
- Edificio (N:1)
- ReservacionHabitaciones (1:N)

---

### 19. Edificio

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdEdificio | int (PK) | Sí | Identificador único |
| Nombre | string(50) | Sí | Nombre del edificio |
| NumeroNiveles | int | Sí | Cantidad de niveles |
| Descripcion | string(200) | No | Descripción |

**Valores predefinidos:**

| Nombre | Niveles |
|--------|---------|
| Belén | 2 |
| Bethel | 2 |

**Relaciones:**
- Habitaciones (1:N)

---

### 20. ReservacionHabitacion

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdReservacionHabitacion | int (PK) | Sí | Identificador único |
| IdReservacion | int (FK) | Sí | Reservación relacionada |
| IdHabitacion | int (FK) | Sí | Habitación reservada |
| FechaCheckIn | DateTime | Sí | Fecha de entrada |
| FechaCheckOut | DateTime | Sí | Fecha de salida |
| PrecioPorNoche | decimal | Sí | Tarifa aplicada |
| TotalNoches | int (calculado) | - | Cantidad de noches |
| TotalHospedaje | decimal (calculado) | - | TotalNoches × PrecioPorNoche |

**Relaciones:**
- Reservacion (N:1)
- Habitacion (N:1)

---

### 21. Usuario

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdUsuario | int (PK) | Sí | Identificador único |
| Nombre | string(100) | Sí | Nombre completo |
| NombreUsuario | string(50) | Sí | Usuario para login (único) |
| Contrasena | string(250) | Sí | Contraseña encriptada |
| IdRol | int (FK) | Sí | Rol asignado |
| Correo | string(100) | No | Email |
| Telefono | string(20) | No | Teléfono |
| Activo | bool | Sí | Si está habilitado |
| FechaCreacion | DateTime | Sí | Fecha de alta |

**Relaciones:**
- Rol (N:1)

---

### 22. Rol

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdRol | int (PK) | Sí | Identificador único |
| Nombre | string(50) | Sí | Nombre del rol |
| Descripcion | string(200) | No | Descripción del rol |

**Valores predefinidos:**

| Rol | Permisos |
|-----|----------|
| Administrador | Acceso total |
| Recepcionista | Reservaciones, cotizaciones, clientes |
| Finanzas | Gastos, reportes |
| Almacén | Inventario, mobiliario, cierre |
| Visual | Solo lectura |

---

### 23. Empleado

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| IdEmpleado | int (PK) | Sí | Identificador único |
| Nombre | string(100) | Sí | Nombre completo |
| Puesto | string(50) | Sí | Cargo/puesto |
| Telefono | string(20) | No | Teléfono |
| Correo | string(100) | No | Email |
| Area | string(50) | No | Área de trabajo |
| FechaIngreso | DateTime | Sí | Fecha de ingreso |
| Activo | bool | Sí | Si está activo |

---

## Resumen de Entidades

| # | Entidad | Descripción |
|---|---------|-------------|
| 1 | Cliente | Clientes del centro |
| 2 | TipoCliente | Particular, Empresa, Iglesia, Institución |
| 3 | Reservacion | Reservaciones de espacios |
| 4 | Ubicacion | Espacios disponibles |
| 5 | TipoUbicacion | Área Libre, Comedor, Salón, Jardín, Habitación |
| 6 | Horario | Mañana, Tarde, Noche |
| 7 | Cotizacion | Cotizaciones de eventos |
| 8 | DetalleCotizacion | Productos/servicios en cotización |
| 9 | OrdenTrabajo | Órdenes generadas desde cotización |
| 10 | Gasto | Gastos operativos |
| 11 | CategoriaGasto | Tipos de gasto |
| 12 | Mobiliario | Inventario de mobiliario |
| 13 | CategoriaMobiliario | Tipos de mobiliario |
| 14 | Producto | Productos/servicios a cotizar |
| 15 | CategoriaProducto | Comida, Mobiliario, Decoración, Servicios |
| 16 | CierreEvento | Cierre de eventos |
| 17 | DetalleCierre | Retorno de artículos por evento |
| 18 | Habitacion | Habitaciones de hospedaje |
| 19 | Edificio | Belén, Bethel |
| 20 | ReservacionHabitacion | Reservación de habitaciones |
| 21 | Usuario | Usuarios del sistema |
| 22 | Rol | Roles de acceso |
| 23 | Empleado | Empleados del centro |

---

## Datos Predefinidos (Seed Data)

### Tipos de Cliente
```sql
INSERT INTO TipoCliente (Nombre) VALUES ('Particular');
INSERT INTO TipoCliente (Nombre) VALUES ('Empresa');
INSERT INTO TipoCliente (Nombre) VALUES ('Iglesia');
INSERT INTO TipoCliente (Nombre) VALUES ('Institución');
```

### Tipos de Ubicación
```sql
INSERT INTO TipoUbicacion (Nombre) VALUES ('Área Libre');
INSERT INTO TipoUbicacion (Nombre) VALUES ('Comedor');
INSERT INTO TipoUbicacion (Nombre) VALUES ('Salón');
INSERT INTO TipoUbicacion (Nombre) VALUES ('Jardín');
INSERT INTO TipoUbicacion (Nombre) VALUES ('Habitación');
```

### Horarios
```sql
INSERT INTO Horario (Nombre, HoraInicio, HoraFin) VALUES ('Mañana', '07:00', '13:00');
INSERT INTO Horario (Nombre, HoraInicio, HoraFin) VALUES ('Tarde', '14:00', '19:00');
INSERT INTO Horario (Nombre, HoraInicio, HoraFin) VALUES ('Noche', '20:00', '01:00');
```

### Áreas Libres
```sql
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Pérgola', 1, 80);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Plaza Jerusalén', 1, 150);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Bautisterio', 1, 50);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Rancho 1', 1, 60);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Rancho 2', 1, 60);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Rancho 3', 1, 60);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Rancho 4', 1, 60);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Monte Bienaventuranzas', 1, 120);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Las Mariposas', 1, 90);
```

### Comedores
```sql
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Nehemías 1', 2, 100);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Nehemías 2', 2, 100);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Josefa', 2, 70);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Magdalena', 2, 70);
```

### Salones
```sql
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Josefa', 3, 70);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Magdalena', 3, 70);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Timoteo', 3, 80);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Salem', 3, 100);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Nehemías', 3, 100);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Israel', 3, 60);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Esther', 3, 60);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Jacob', 3, 60);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Sansón', 3, 60);
```

### Jardines
```sql
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Sharon', 4, 100);
INSERT INTO Ubicacion (Nombre, IdTipoUbicacion, Capacidad) VALUES ('Juda', 4, 100);
```

### Edificios
```sql
INSERT INTO Edificio (Nombre, NumeroNiveles) VALUES ('Belén', 2);
INSERT INTO Edificio (Nombre, NumeroNiveles) VALUES ('Bethel', 2);
```

### Roles
```sql
INSERT INTO Rol (Nombre, Descripcion) VALUES ('Administrador', 'Acceso total al sistema');
INSERT INTO Rol (Nombre, Descripcion) VALUES ('Recepcionista', 'Reservaciones, cotizaciones, clientes');
INSERT INTO Rol (Nombre, Descripcion) VALUES ('Finanzas', 'Gastos, reportes financieros');
INSERT INTO Rol (Nombre, Descripcion) VALUES ('Almacén', 'Inventario, mobiliario, cierre de eventos');
INSERT INTO Rol (Nombre, Descripcion) VALUES ('Visual', 'Solo lectura');
```

### Categorías de Gasto
```sql
INSERT INTO CategoriaGasto (Nombre) VALUES ('Mantenimiento');
INSERT INTO CategoriaGasto (Nombre) VALUES ('Servicios');
INSERT INTO CategoriaGasto (Nombre) VALUES ('Sueldos');
INSERT INTO CategoriaGasto (Nombre) VALUES ('Compra de Insumos');
INSERT INTO CategoriaGasto (Nombre) VALUES ('Decoración');
INSERT INTO CategoriaGasto (Nombre) VALUES ('Transporte');
INSERT INTO CategoriaGasto (Nombre) VALUES ('Otros');
```

### Categorías de Mobiliario
```sql
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Sillas');
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Mesas');
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Manteles');
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Vajilla');
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Cristalería');
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Cubertería');
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Decoración');
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Equipos de Sonido');
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Iluminación');
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Carpas');
INSERT INTO CategoriaMobiliario (Nombre) VALUES ('Otros');
```

### Categorías de Producto
```sql
INSERT INTO CategoriaProducto (Nombre) VALUES ('Comida / Menú');
INSERT INTO CategoriaProducto (Nombre) VALUES ('Mobiliario');
INSERT INTO CategoriaProducto (Nombre) VALUES ('Adornos y Decoración');
INSERT INTO CategoriaProducto (Nombre) VALUES ('Servicios Adicionales');
```

---

**Fin del Documento de Estructura de Entidades**

*Documento generado el 31 de Marzo 2026*
