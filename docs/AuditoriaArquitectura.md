# Auditoría de Arquitectura - Sistema Villas Mayen

**Fecha:** 1 de Abril 2026  
**Tipo:** Auditoría Pre-Implementación  
**Analista:** Principal Software Architect  
**Versión:** 1.0

---

## Resumen Ejecutivo

| Aspecto | Calificación | Detalle |
|---------|-------------|---------|
| Diseño de Entidades | ✅ Bueno | 23 entidades bien definidas con relaciones claras |
| Arquitectura de Capas | ⚠️ Pendiente | No se ha definido la estructura de capas |
| Patrones de Diseño | ⚠️ Pendiente | No se han especificado patrones |
| Escalabilidad | ⚠️ Riesgo Medio | SQLite tiene limitaciones para multi-usuario |
| Seguridad | 🔴 Crítico | Falta definir estrategia de autenticación/autorización |
| Rendimiento | ⚠️ Riesgo Medio | Posibles N+1 queries sin índices definidos |

**Puntuación General: 6.5/10** (Diseño de datos sólido, arquitectura de aplicación pendiente)

---

## 1. Análisis del Diseño de Entidades

### 1.1 Fortalezas del Modelo de Datos

**Relaciones bien definidas:**
```
Cliente ──┬── Reservacion ──┬── Ubicacion
          │                 ├── Horario
          │                 └── DetalleReservacion
          │
          └── Cotizacion ──┬── DetalleCotizacion
                           └── OrdenTrabajo
```

- ✅ Claves foráneas explícitas en todas las relaciones
- ✅ Campos calculados documentados (SaldoPendiente, DepreciacionAnual, etc.)
- ✅ Estados de flujo de trabajo bien definidos (8 estados para Reservación)
- ✅ Catálogos separados correctamente (TipoCliente, TipoUbicacion, etc.)
- ✅ Campos de auditoría presentes (FechaCreacion, FechaModificacion)

### 1.2 Problemas Detectados en el Modelo de Datos

#### 🔴 P1 - CRÍTICO: Estados como Strings en lugar de Enum

```csharp
// PROBLEMA: Estados almacenados como strings
public string Estado { get; set; }  // "Cotizado", "Anticipo", etc.
```

**Riesgo:**
- Valores inconsistentes ("anticipo" vs "Anticipo" vs "ANTICIPO")
- Sin validación en base de datos
- Difícil refactorización

**Recomendación:**
```csharp
public enum EstadoReservacion
{
    Cotizado,
    Anticipo,
    Deposito,
    Saldo,
    TotalCancelado,
    EnEjecucion,
    Finalizado,
    FinalizadoConCierre
}

// En la entidad
public EstadoReservacion Estado { get; set; }

// En DbContext para SQLite
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Reservacion>()
        .Property(r => r.Estado)
        .HasConversion<string>();
}
```

#### 🟡 P2 - ALTO: Falta de Índices Definidos

No se documentan índices para consultas frecuentes:

```sql
-- ÍNDICES NECESARIOS (no documentados)
CREATE INDEX IX_Reservacion_FechaInicio ON Reservacion(FechaInicio);
CREATE INDEX IX_Reservacion_FechaFin ON Reservacion(FechaFin);
CREATE INDEX IX_Reservacion_IdUbicacion_Fecha ON Reservacion(IdUbicacion, FechaInicio, FechaFin);
CREATE INDEX IX_Reservacion_Estado ON Reservacion(Estado);
CREATE INDEX IX_Cotizacion_IdCliente ON Cotizacion(IdCliente);
CREATE INDEX IX_Gasto_Fecha ON Gasto(Fecha);
CREATE INDEX IX_Habitacion_Estado ON Habitacion(Estado);
```

**Impacto:** El calendario necesitará consultar reservaciones por rango de fechas y ubicación. Sin índices, la consulta será O(n) en lugar de O(log n).

#### 🟡 P3 - ALTO: Campos Calculados no Marcados como Computed

```csharp
// PROBLEMA: SaldoPendiente se calcula en código pero no se marca
public decimal SaldoPendiente { get; set; }  // ¿Se recalcula? ¿Se persiste?
```

**Recomendación:**
```csharp
[NotMapped]  // Si se calcula en código
public decimal SaldoPendiente => MontoTotal - MontoPagado;

// O si se persiste:
[DatabaseGenerated(DatabaseGeneratedOption.Computed)]
public decimal SaldoPendiente { get; set; }
```

#### 🟡 P4 - MEDIO: Falta de Restricciones de Unicidad

```sql
-- NECESARIO pero no documentado
ALTER TABLE Mobiliario ADD CONSTRAINT UQ_NoInventario UNIQUE (NoInventario);
ALTER TABLE Usuario ADD CONSTRAINT UQ_NombreUsuario UNIQUE (NombreUsuario);
ALTER TABLE Habitacion ADD CONSTRAINT UQ_Habitacion_Numero_Edificio 
    UNIQUE (Numero, IdEdificio);
```

#### 🟡 P5 - MEDIO: Relación Reservacion-Cotizacion Ambigua

```
Reservacion.IdCotizacion (FK nullable) → Cotizacion
Cotizacion.Reservacion (1:1)
```

**Problema:** La documentación muestra la relación bidireccional pero no aclara:
- ¿Una cotización puede existir sin reservación? (Sí, estado Borrador)
- ¿Una reservación puede existir sin cotización? (¿Walk-in?)
- ¿Quién es el padre de la relación 1:1?

**Recomendación:**
```csharp
// Cotizacion es el padre, Reservacion es el hijo
public class Cotizacion
{
    public int IdCotizacion { get; set; }
    // Sin navegación a Reservacion (o nullable)
    public Reservacion? Reservacion { get; set; }
}

public class Reservacion
{
    public int IdReservacion { get; set; }
    public int? IdCotizacion { get; set; }  // Nullable para walk-ins
    public Cotizacion? Cotizacion { get; set; }
}
```

---

## 2. Arquitectura de Capas Recomendada

### 2.1 Arquitectura Propuesta: Clean Architecture Adaptada

```
VillasMayen/
├── src/
│   ├── VillasMayen.Domain/           # Capa de Dominio
│   │   ├── Entities/                 # Las 23 entidades
│   │   │   ├── Cliente.cs
│   │   │   ├── Reservacion.cs
│   │   │   └── ...
│   │   ├── Enums/                    # Estados, tipos
│   │   │   ├── EstadoReservacion.cs
│   │   │   ├── TipoCliente.cs
│   │   │   └── ...
│   │   ├── ValueObjects/             # Objetos de valor
│   │   │   ├── Money.cs
│   │   │   ├── DateRange.cs
│   │   │   └── ...
│   │   ├── Interfaces/               # Contratos de repositorio
│   │   │   ├── IReservacionRepository.cs
│   │   │   ├── IClienteRepository.cs
│   │   │   └── ...
│   │   └── Exceptions/               # Excepciones de dominio
│   │       ├── DobleReservacionException.cs
│   │       └── ...
│   │
│   ├── VillasMayen.Application/      # Capa de Aplicación
│   │   ├── Services/                 # Lógica de negocio
│   │   │   ├── ReservacionService.cs
│   │   │   ├── CotizacionService.cs
│   │   │   ├── CalendarioService.cs
│   │   │   └── ...
│   │   ├── DTOs/                     # Data Transfer Objects
│   │   │   ├── ReservacionDTO.cs
│   │   │   ├── CalendarioEventoDTO.cs
│   │   │   └── ...
│   │   ├── Validators/               # Validaciones con FluentValidation
│   │   │   ├── ReservacionValidator.cs
│   │   │   └── ...
│   │   └── Mappings/                 # AutoMapper profiles
│   │       └── MappingProfile.cs
│   │
│   ├── VillasMayen.Infrastructure/   # Capa de Infraestructura
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs       # EF Core DbContext
│   │   │   ├── Configurations/       # Fluent API configs
│   │   │   │   ├── ReservacionConfiguration.cs
│   │   │   │   └── ...
│   │   │   ├── Migrations/
│   │   │   └── SeedData.cs           # Datos iniciales
│   │   ├── Repositories/             # Implementaciones
│   │   │   ├── ReservacionRepository.cs
│   │   │   ├── GenericRepository.cs
│   │   │   └── ...
│   │   ├── Services/                 # Servicios externos
│   │   │   ├── FileStorageService.cs
│   │   │   ├── PdfExportService.cs
│   │   │   └── ...
│   │   └── Identity/                 # Autenticación
│   │       ├── AuthService.cs
│   │       └── PasswordHasher.cs
│   │
│   └── VillasMayen.Web/              # Capa de Presentación (Blazor Server)
│       ├── Components/
│       │   ├── Layout/
│       │   │   ├── MainLayout.razor
│       │   │   ├── NavMenu.razor
│       │   │   └── ...
│       │   ├── Pages/
│       │   │   ├── Calendario/
│       │   │   │   ├── CalendarioPage.razor
│       │   │   │   └── CalendarioPage.razor.cs
│       │   │   ├── Reservaciones/
│       │   │   │   ├── ReservacionForm.razor
│       │   │   │   ├── ReservacionList.razor
│       │   │   │   └── ...
│       │   │   ├── Cotizaciones/
│       │   │   ├── Gastos/
│       │   │   ├── Mobiliario/
│       │   │   ├── Clientes/
│       │   │   ├── Dashboard/
│       │   │   └── ...
│       │   └── Shared/
│       │       ├── CalendarioMensual.razor
│       │       ├── MapaHabitaciones.razor
│       │       └── ...
│       ├── Services/                  # Servicios de Blazor
│       │   ├── CalendarioS
