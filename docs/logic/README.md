# Documentación de Lógica de Negocio — Villas Mayen

> 📚 Documentación técnica de reglas de negocio, flujos y decisiones arquitectónicas del sistema.

## Documentos

| Documento | Descripción |
|-----------|-------------|
| [entidades.md](./entidades.md) | Modelos de base de datos organizados por dominio (Core, Espacios, Catálogos, Operaciones, Sistema). Significado de negocio, campos clave y relaciones. |
| [flujo-cotizaciones.md](./flujo-cotizaciones.md) | Ciclo de vida completo de una cotización: estados (BORRADOR → ENVIADA → NO_CONFIRMADA/CONFIRMADA → EN_EJECUCION → FINALIZADA), transiciones, reglas de expiración, reenvío y re-cotización. |
| [flujo-pagos.md](./flujo-pagos.md) | Flujo de pagos: anticipo, pago parcial, pago total. Multi-moneda (GTQ/USD), tipo de cambio manual, liquidación y cierre de evento. |
| [api-endpoints.md](./api-endpoints.md) | Todas las rutas de la API REST organizadas por recurso, con métodos HTTP, autenticación requerida, verificación de permisos y forma de respuesta. |
| [roles-permisos.md](./roles-permisos.md) | Matriz de permisos por rol (7 roles), módulos nuevos (catálogos, tipo de cambio, cierres, email) y uso de `hasPermission()`. |

## Lectura complementaria

- [Plan de Implementación — Reunión 2](../PlanImplementacion_Reunion2.md) — Decisiones arquitectónicas y plan de ejecución por fases.
- [CHANGELOG.md](../CHANGELOG.md) — Historial de cambios entre versiones.
- [AGENTS.md](../../AGENTS.md) — Convenciones del proyecto, estructura y anti-patrones.
- [SPEC.md](../../SPEC.md) — Especificación completa del sistema (fuente autoritativa).
- [prisma/schema.prisma](../../prisma/schema.prisma) — Esquema de base de datos (fuente de verdad).
- [src/types/index.ts](../../src/types/index.ts) — Tipos TypeScript, permisos y etiquetas.
