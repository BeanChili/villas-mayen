# 🔍 AUDITORÍA COMPLETA - SISTEMA VILLAS MAYEN

**Fecha:** 1 de Abril de 2026  
**Estado del proyecto:** Pre-implementación (solo documentación)  
**Stack:** Blazor Server (.NET 9.0+) / MudBlazor / SQLite + EF Core  
**Puntuación general:** 5.8/10 — Requiere correcciones antes de implementar

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Puntuación | Hallazgos Críticos |
|-----------|:----------:|-------------------|
| **Arquitectura** | 6.5/10 | Falta definir capas y patrones de diseño |
| **Seguridad** | 4.0/10 | 5 vulnerabilidades críticas detectadas |
| **Base de Datos** | 5.2/10 | Errores en cálculos, falta índices y restricciones |
| **Frontend/UI** | 4.5/10 | Sin responsive design, calendario sin spec técnica |
| **Documentación** | 3.8/10 | 10 preguntas del cliente sin resolver, falta docs técnicos |

---

## 🚨 HALLAZGOS CRÍTICOS (P0 — BLOQUEANTES)

### 1. Preguntas del cliente sin resolver
**Impacto:** Bloquea diseño de seguridad, calendario y pagos  
**Detalle:** 10 preguntas pendientes en `PropuestaRequerimientos.md` (líneas 407-421):

| # | Pregunta | Impacto |
|---|----------|---------|
| 1 | Unidad mínima de tiempo para reservar | Bloquea diseño del calendario |
| 6 | ¿Se pueden combinar horarios? | Cambia lógica de reservación |
| 7 | ¿Pagos parciales o solo totales? | Afecta modelo de pagos |
| 10 | ¿Login o acceso interno? | **BLOQUEA toda la seguridad** |

**Acción:** Resolver TODAS antes de iniciar desarrollo.

---

### 2. Autenticación no definida
**Impacto:** Sistema sin seguridad  
**Detalle:** No se especifica:
- Política de contraseñas (longitud, complejidad, expiración)
- Algoritmo de hash (BCrypt, Argon2)
- Protección contra fuerza bruta
- Gestión de sesiones

**Recomendación:**
```csharp
// Configurar Identity con políticas seguras
builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 12;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
});
```

---

### 3. Estados como strings sin validación
**Impacto:** Integridad de datos comprometida  
**Detalle:** Todos los estados son `string(20)` sin restricción en DB. Riesgo de valores inconsistentes ("EnEjecucion" vs "En Ejecución").

**Recomendación:**
```csharp
public enum EstadoReservacion
{
    Cotizado, Anticipo, Deposito, Saldo,
    TotalCancelado, EnEjecucion, Finalizado, FinalizadoConCierre
}

// En DbContext para SQLite
modelBuilder.Entity<Reservacion>()
    .Property(r => r.Estado)
    .HasConversion<string>();
```

---

### 4. Sin índices definidos
**Impacto:** Rendimiento crítico en calendario y consultas  
**Detalle:** No se define ningún índice más allá de las PKs.

**Índices obligatorios:**
```csharp
// Reservaciones (consultas más frecuentes)
entity.HasIndex(r => new { r.IdUbicacion, r.FechaInicio, r.FechaFin, r.IdHorario });
entity.HasIndex(r => r.Estado);
entity.HasIndex(r => r.IdCliente);

// Usuarios (login)
entity.HasIndex(u => u.NombreUsuario).IsUnique();

// Mobiliario (inventario)
entity.HasIndex(m => m.NoInventario).IsUnique();
```

---

### 5. Sin estrategia responsive design
**Impacto:** Sistema inutilizable en tablets/móviles  
**Detalle:** No se mencionan breakpoints ni diseño adaptativo.

**Recomendación:**
- Definir breakpoints: mobile (320-767px), tablet (768-1023px), desktop (1024px+)
- Calendario necesita vista de lista en mobile
- Formularios multi-sección necesitan wizard/stepper
- Touch targets mínimos de 44x44px

---

## ⚠️ HALLAZGOS MAYORES (P1 — ANTES DEL RELEASE)

### 6. Relación Cotizacion ↔ Reservacion ambigua
**Impacto:** Confusión en modelo de datos  
**Detalle:** Documentación contradice si es 1:1 o N:1.

**Recomendación:**
```csharp
public class Reservacion
{
    public int? IdCotizacion { get; set; }  // Nullable: no toda reserva viene de cotización
    [ForeignKey("IdCotizacion")]
    public virtual Cotizacion? Cotizacion { get; set; }
}
```

---

### 7. Fórmula de depreciación con error
**Impacto:** Valores negativos posibles  
**Detalle:** Permite que `ValorActual` sea negativo después de 10 años.

**Corrección:**
```csharp
[NotMapped]
public decimal ValorActual => 
    Math.Max(0, ValorCompra - (DepreciacionAnual * AnosTranscurridos));
```

---

### 8. Campos calculados sin especificación
**Impacto:** Riesgo de desincronización  
**Detalle:** `SaldoPendiente`, `ValorActual`, `Subtotal` son "calculados" pero no especifica si se almacenan.

**Recomendación:**
- Usar `[NotMapped]` para cálculos simples
- Usar `HasComputedColumnSql` para consultas frecuentes

---

### 9. Sin protección contra doble reservación
**Impacto:** Posibles conflictos de reservas  
**Detalle:** Dos usuarios pueden verificar disponibilidad simultáneamente.

**Solución:**
```csharp
using var transaction = await _db.Database.BeginTransactionAsync(
    IsolationLevel.Serializable);
// Verificar dentro de la transacción
```

---

### 10. Formulario de cotización excesivamente complejo
**Impacto:** Fatiga cognitiva del usuario  
**Detalle:** 6 secciones en un solo formulario viola progresión gradual.

**Recomendación:** Implementar como Stepper/Wizard:
- Paso 1: Datos generales del evento
- Paso 2: Selección de productos por categoría (con tabs)
- Paso 3: Notas y fotos de decoración
- Paso 4: Resumen y confirmación

---

### 11. Dashboard con 8 widgets sin jerarquía
**Impacto:** Information overload  
**Detalle:** 12 elementos visuales compitiendo por atención.

**Recomendación:**
- **Primera fila:** KPIs grandes — Reservaciones, Ingresos, Eventos activos
- **Segunda fila:** Acciones urgentes — Próximos eventos, Alertas
- **Tercera fila:** Gráficos — Ingresos vs Gastos, Ocupación
- **Cuarta fila:** Info secundaria — Clientes nuevos, Mobiliario

---

### 12. Calendario "estilo Airbnb" sin spec técnica
**Impacto:** Componente crítico sin definición  
**Detalle:** MudBlazor NO tiene componente de calendario tipo booking.

**Opciones:**
1. Wrapper de `FullCalendar` para Blazor
2. Componente `Radzen.Blazor` Calendar
3. Implementación custom con CSS Grid

---

## 📋 HALLAZGOS MENORES (P2 — SIGUIENTE ITERACIÓN)

### 13. Inconsistencias entre documentos
| Problema | Documentos afectados |
|----------|---------------------|
| Estados con formatos diferentes | Los 3 documentos |
| Horario Noche cruza medianoche | PropuestaRequerimientos vs EstructuraEntidades |
| Permisos rol Finanzas diferentes | Los 3 documentos |
| Campo "Ubicación" en Mobiliario | ManualFase1 vs EstructuraEntidades |
| Cálculo depreciación (365 vs 365.25) | PropuestaRequerimientos vs EstructuraEntidades |

---

### 14. Nombres duplicados en Ubicaciones
**Detalle:** "Josefa" y "Magdalena" existen como Comedor Y como Salón.

**Recomendación:** Agregar campo `Codigo` único o prefijar nombres: "Comedor Josefa", "Salón Josefa".

---

### 15. Sin tabla intermedia para Mobiliario en Cotización
**Detalle:** No hay forma de reservar artículos específicos de inventario para eventos.

**Recomendación:** Crear `CotizacionMobiliario`:
```csharp
public class CotizacionMobiliario
{
    public int IdCotizacion { get; set; }
    public int IdMobiliario { get; set; }  // Artículo específico
    public int Cantidad { get; set; }
}
```

---

### 16. Sin registro de actividades (Audit Log)
**Detalle:** No se contempla trazabilidad de cambios.

**Recomendación:**
```csharp
public class AuditLog
{
    public string UserId { get; set; }
    public string Action { get; set; }  // CREATE, UPDATE, DELETE
    public string EntityType { get; set; }
    public string OldValues { get; set; }  // JSON
    public string NewValues { get; set; }  // JSON
    public DateTime Timestamp { get; set; }
}
```

---

### 17. Documentación técnica faltante
**Documentos críticos ausentes:**
- README.md con instalación
- ARCHITECTURE.md con decisión de arquitectura
- API specification (OpenAPI/Swagger)
- Guía de contribución (CONTRIBUTING.md)
- Manuales de Fase 2 y Fase 3

---

## 🏗️ ARQUITECTURA RECOMENDADA

```
VillasMayen/
├── src/
│   ├── VillasMayen.Domain/           ← Entidades, Enums, Interfaces
│   ├── VillasMayen.Application/      ← Services, DTOs, Validators
│   ├── VillasMayen.Infrastructure/   ← EF Core, Repositories, Identity
│   └── VillasMayen.Web/              ← Blazor Server + MudBlazor
├── tests/
└── docs/
```

**Patrones de diseño:**
| Patrón | Ubicación | Propósito |
|--------|-----------|-----------|
| Repository | Infrastructure | Abstrae acceso a datos |
| Unit of Work | Infrastructure | Transacciones atómicas |
| Service Layer | Application | Orquesta lógica de negocio |
| Result Pattern | Application | Manejo de errores sin excepciones |
| Code-Behind | Web | Separa lógica de componentes Blazor |

---

## 🔒 CONFIGURACIÓN DE SEGURIDAD RECOMENDADA

### Autenticación
```csharp
// Program.cs
builder.Services.AddIdentity<Usuario, Rol>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 12;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();
```

### Autorización granular
```csharp
public static class Permissions
{
    public const string Reservaciones_Crear = "Reservaciones.Crear";
    public const string Reservaciones_Leer = "Reservaciones.Leer";
    public const string Reservaciones_Actualizar = "Reservaciones.Actualizar";
    public const string Reservaciones_Eliminar = "Reservaciones.Eliminar";
    // ... por módulo
}
```

### Protección de datos sensibles
```csharp
[ProtectedPersonalData]
public string RFC_NIT { get; set; }

[PersonalData]
public string Correo { get; set; }
```

---

## 📅 ROADMAP DE IMPLEMENTACIÓN

| Fase | Semanas | Entregables Clave |
|------|---------|-------------------|
| **F0: Preparación** | 1 | Resolver preguntas cliente, crear docs técnicos |
| **F1: Fundación** | 2-3 | Solución 4 capas, DbContext, Auth, Catálogos |
| **F2: Core** | 4-6 | Calendario, Reservaciones, Doble Reserva, Dashboard |
| **F3: Expansión** | 7-9 | Cotizaciones, Productos, Gastos, Mobiliario |
| **F4: Pulido** | 10-12 | Cierre Eventos, PDF/Excel, Empleados, Reportes |

---

## ✅ PLAN DE ACCIÓN INMEDIATO

### Semana 1: Bloqueantes
1. 🔴 Resolver 10 preguntas pendientes del cliente
2. 🔴 Definir arquitectura de capas (Clean Architecture)
3. 🔴 Crear enums para todos los estados
4. 🔴 Configurar autenticación/autorización
5. 🔴 Definir índices de base de datos

### Semana 2: Fundación
6. 🟡 Crear README.md con instalación
7. 🟡 Estandarizar nombres de estados entre documentos
8. 🟡 Corregir fórmula de depreciación
9. 🟡 Agregar restricciones UNIQUE
10. 🟡 Configurar WAL mode para SQLite

### Semana 3: UI/UX
11. 🟡 Definir estrategia responsive design
12. 🟡 Crear sistema de design tokens
13. 🟡 Diseñar componente de calendario
14. 🟡 Implementar wizard para cotizaciones
15. 🟡 Reorganizar dashboard con jerarquía

---

## 📚 REFERENCIAS

- **OWASP Top 10 2021:** https://owasp.org/www-project-top-ten/
- **Clean Architecture:** https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- **Blazor Security:** https://docs.microsoft.com/en-us/aspnet/core/blazor/security/
- **MudBlazor Components:** https://mudblazor.com/
- **SQLite Performance:** https://www.sqlite.org/whentouse.html

---

## 🎯 CONCLUSIÓN

El sistema Villas Mayen tiene una **base documental sólida** en requerimientos y modelo de datos, pero presenta **gaps críticos** que deben resolverse antes de la implementación:

1. **5 vulnerabilidades críticas de seguridad** sin resolver
2. **10 preguntas del cliente** que bloquean diseño
3. **Sin arquitectura definida** para el código
4. **Calendario crítico** sin especificación técnica
5. **Documentación técnica ausente**

**Recomendación:** NO comenzar desarrollo hasta resolver los 5 P0 críticos. El calendario "estilo Airbnb" necesita prototipo visual antes de implementación.

---

*Informe consolidado generado el 1 de Abril de 2026*  
*Próxima revisión: Después de resolver P0 críticos*