# Changelog — Villas Mayen

Todas las modificaciones notables al proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [Unreleased] — Reunión 2 (2026-05-29)

### Added
- Quote como entidad central del sistema (unifica cotización y reservación).
- Múltiples espacios por cotización mediante QuoteSpace (varios salones, jardines, terrazas en una misma cotización).
- Menús pre-armados editables: Desayuno, Refacción, Coffee Break, Almuerzo, Cena.
- Catálogo de cristalería: Platos, Cubiertos, Picheles, Vasos, Copas con inventario.
- Terrazas como nuevo tipo de ubicación, editables con nombre, capacidad y precio.
- Tipo de cambio manual GTQ/USD (ExchangeRate) con historial de actualizaciones.
- Cotizaciones en USD y GTQ (una moneda por cotización, sin mezclas).
- Descuento por ítem individual en cotización: porcentaje (%) y monto fijo ($).
- Hora exacta (HH:MM) en espacios y comidas, con soporte para minutos (ej: 13:15).
- Categorización de clientes: Bueno, Regular, Delicado, En Observación (referencia interna).
- Vista por día en calendario, optimizada para pantalla grande/TV (8+ eventos simultáneos).
- Dashboard del día mostrando eventos en estado EN_EJECUCION.
- Cierres diarios (DailyClosing) y semanales con resumen de eventos, cobros e incidencias.
- Email manual a contabilidad al liquidar evento con resumen completo.
- Re-cotización desde NO_CONFIRMADA: crea nueva Quote vinculada con parentQuoteId.
- Reenvío manual de cotización (actualiza sentAt sin crear nuevo registro).
- Registro de envío de correos (EmailLog) con trazabilidad.
- Amenidades configurables: checkbox "Sin costo" y precios por día/hora en productos.
- Habitaciones con precio por persona (pricePerPerson) además de precio por noche.
- Botón "Cotizar" desde el calendario con fecha pre-llenada.

### Changed
- Estados de cotización: BORRADOR → ENVIADA → NO_CONFIRMADA/CONFIRMADA → EN_EJECUCION → FINALIZADA.
- APROBADA renombrado a CONFIRMADA (migración automática de datos existentes).
- RECHAZADA unificado en NO_CONFIRMADA.
- Colores de estado actualizados: ENVIADA=gris oscuro, CONFIRMADA=verde, EN_EJECUCION=morado, FINALIZADA=rojo.
- Moneda y tipo de cambio ahora por cotización (no global).
- Pagos en USD se liquidan en GTQ al tipo de cambio del día (Q20 corregida).
- Habitaciones ahora con precio dual: por noche y/o por persona.
- Calendario muestra cotizaciones de todos los estados con colores por estado.

### Removed
- Módulo standalone de Reservaciones (creación manual eliminada; solo se crean desde Confirmación de Quote).
- Estado RECHAZADA (unificado en NO_CONFIRMADA).

---

## [0.1.0] — Versión Inicial (2026-04-14)

### Added
- Sistema base: Next.js 14 App Router + TypeScript + Prisma + NextAuth.js + shadcn/ui + Tailwind CSS.
- Modelos iniciales: User, Client, Reservation, Quote, QuoteItem, Payment, Product, Furniture, Expense, EventClosing, EventClosingItem, WorkOrder, Building, Floor, Room, FreeArea, DiningRoom, Hall, Garden.
- Autenticación con NextAuth (CredentialsProvider, JWT, 24h sesión).
- API REST con CRUD básico para reservaciones, clientes, cotizaciones, productos, mobiliario, gastos, usuarios.
- Calendario de reservaciones con vista mensual y semanal.
- Matriz de permisos RBAC con 7 roles predefinidos.
- Estados de cotización originales: BORRADOR → ENVIADA → APROBADA/RECHAZADA.
- Estados de reservación: COTIZADO → CONFIRMADO → EN_EJECUCION → FINALIZADO → CANCELADO.
- Formato de moneda en GTQ (Quetzales) con locale es-GT.
- Seed de base de datos con usuarios de prueba y datos iniciales.
- Pruebas E2E con Playwright (Chromium).
- Soporte Docker para PostgreSQL en producción.
