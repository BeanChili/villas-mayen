# prisma/ — Database Schema & Seeding

## OVERVIEW
Prisma ORM schema (SQLite dev / PostgreSQL prod) + seed script. Source of truth for all DB models.

## FILES
| File | Purpose |
|------|---------|
| `schema.prisma` | All models, enums, relations — generator target `@prisma/client` |
| `seed.ts` | Creates test users (admin, recepcionista, finanzas, almacen, visual) + sample data |

## KEY MODELS
| Model | Notes |
|-------|-------|
| `User` | Auth user — `username` unique, `password` bcrypt, `role` enum |
| `Reservation` | Core entity — polymorphic location via `locationType`+`locationId`+`locationName` |
| `Client` | `clientType`: PARTICULAR, EMPRESA, IGLESIA, INSTITUCION |
| `Quote` → `QuoteItem` | Cotización with line items (Product or Furniture) |
| `Furniture` | Inventory — `inventoryNumber` unique, has `depreciationRate` + `currentValue` |
| `Expense` | Simple expense record with `receiptPhoto` |
| `EventClosing` → `EventClosingItem` | Post-event return/damage log per reservation |
| `WorkOrder` | 1:1 with Quote — generated from approved quote |
| `Building` → `Floor` → `Room` | Room hierarchy for HABITACION reservations |

## CONVENTIONS
- Enums use SCREAMING_SNAKE_CASE Spanish
- `schedules` stored as JSON array (SQLite) or native array (PostgreSQL) — parse with `parseSchedule()` in utils.ts
- `locationName` is a denormalized display string — always set alongside `locationId`
- After any schema change: run `npm run db:generate` then `npm run db:push`

## ANTI-PATTERNS
- Do NOT run `prisma migrate dev` in dev — use `db:push` (no migration files)
- Do NOT create a second `PrismaClient` — import from `src/lib/db.ts`
- Do NOT set `currentValue` manually — it is computed from `purchaseValue`, `depreciationRate`, `purchaseDate`

## NOTES
- `seed.ts` run via `tsx` (not ts-node): `npm run db:seed`
- SQLite DB file: `prisma/dev.db` (local) — not committed
- `DATABASE_URL` for Docker: `postgresql://postgres:postgres@postgres:5432/villasmayen?schema=public`
