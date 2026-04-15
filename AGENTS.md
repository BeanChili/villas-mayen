# PROJECT KNOWLEDGE BASE

**Generated:** 2026-04-14
**Branch:** master (no commits yet)

## OVERVIEW
Villas Mayen — reservation & event management system for a venue (rooms, halls, gardens, dining rooms). Stack: **Next.js 14 App Router + TypeScript + Prisma + SQLite (dev) / PostgreSQL (Docker) + NextAuth.js + shadcn/ui + Tailwind CSS**.

## STRUCTURE
```
VillasMayen/
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login route group — no sidebar layout
│   │   ├── (dashboard)/    # All protected pages — sidebar layout wraps all
│   │   └── api/            # REST API — Next.js route handlers only
│   ├── components/
│   │   ├── ui/             # shadcn/ui base components (generated, minimal edits)
│   │   ├── shared/         # Cross-cutting UI (Sidebar, DataTable, etc.) — EMPTY, TBD
│   │   └── providers.tsx   # SessionProvider wrapper
│   ├── lib/                # db.ts, auth.ts, utils.ts
│   └── types/              # index.ts — ALL app types + rolePermissions + label maps
├── prisma/                 # schema.prisma + seed.ts
├── tests/                  # Playwright E2E only
├── docs/                   # Non-code docs
└── SPEC.md                 # Full system specification (authoritative source)
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| DB schema / models | `prisma/schema.prisma` |
| Auth config (providers, JWT callbacks) | `src/lib/auth.ts` |
| Prisma client singleton | `src/lib/db.ts` |
| All TypeScript types + form types | `src/types/index.ts` |
| Role permission matrix | `src/types/index.ts` → `rolePermissions` |
| Status labels/colors for reservations | `src/lib/utils.ts` + `src/types/index.ts` |
| Sidebar navigation definition | `src/app/(dashboard)/layout.tsx` |
| Dashboard layout (sidebar + header) | `src/app/(dashboard)/layout.tsx` |
| API endpoints | `src/app/api/<resource>/route.ts` |
| E2E test helpers / user credentials | `tests/helpers.ts` |

## KEY DOMAIN CONCEPTS
- **Schedules**: MANANA (7-13h), TARDE (14-19h), NOCHE (20-01h) — reservations can use multiple
- **LocationType**: FREE_AREA, DINING_ROOM, HALL, ROOM, GARDEN — polymorphic via `locationId`+`locationName`
- **ReservationType**: EVENTO | HABITACION
- **Status flow**: COTIZADO → ANTICIPO → DEPOSITO → SALDO → TOTAL_CANCELADO → EN_EJECUCION → FINALIZADO → FINALIZADO_COBRO
- **Roles** (7): ADMIN, RECEPCIONISTA, FINANZAS, ALMACEN, ENCARGADO_EVENTO, USUARIO_SISTEMA, VISUAL

## CONVENTIONS
- Path alias `@/` → `src/` (tsconfig)
- All enum values in Spanish or SCREAMING_SNAKE_CASE Spanish (COTIZADO, EN_EJECUCION, MANANA)
- Currency: `formatCurrency()` from `src/lib/utils.ts` → es-MX / MXN
- Dates: `formatDate()` / `formatDateTime()` → es-MX locale
- Forms: react-hook-form + Zod schemas — **always** pair them
- API responses: `{ success: boolean, data?, error? }` per `ApiResponse<T>` in `src/types/index.ts`
- UI components: always use `cn()` from `src/lib/utils.ts` for conditional classes

## ANTI-PATTERNS (THIS PROJECT)
- Do NOT bypass `rolePermissions` map in `src/types/index.ts` — use `hasPermission()` for checks
- Do NOT create new Prisma client instances — only use `prisma` from `src/lib/db.ts`
- Do NOT add new base UI components manually — prefer shadcn/ui CLI or extend existing `src/components/ui/`
- Do NOT hardcode Spanish labels — use the label maps in `src/types/index.ts` or `src/lib/utils.ts`
- Do NOT use `(user as any).role` style casts — `session.user.role` is typed via `src/types/index.ts` module augmentation
- `calculateDepreciation()` in utils.ts has a **BUG**: uses `25` instead of `1000` in ms formula — do not copy that calculation

## UNIQUE PATTERNS
- **Duplicate label maps** exist in both `src/types/index.ts` AND `src/lib/utils.ts` — prefer `src/lib/utils.ts` functions for display, `src/types/index.ts` constants for type guards
- `src/components/shared/` is **empty** — shared components live inline in pages or `(dashboard)/layout.tsx`
- `data-hydrated="true"` attribute must be set on `<form>` in login page for Playwright E2E to work reliably
- Docker uses PostgreSQL; local dev uses SQLite — schema must be compatible with both

## COMMANDS
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (next lint)
npm run db:generate  # prisma generate (after schema change)
npm run db:push      # Apply schema to DB (no migration)
npm run db:seed      # Seed with test users + data
npm run db:studio    # Prisma Studio GUI
npx playwright test  # Run E2E tests (requires running dev server or webServer auto-starts)
```

```bash
# Docker
start-docker.bat     # Start PostgreSQL + app via docker-compose
docker-compose up -d postgres   # DB only
```

## TEST CREDENTIALS
```
admin / admin123
recepcionista / recepcionista123
finanzas / finanzas123
almacen / almacen123
visual / visual123
```

## NOTES
- `NEXTAUTH_SECRET` defaults to a hardcoded string — must override in production
- `src/components/shared/` is empty — modules not yet extracted to shared components
- Image uploads go to `/public/uploads/{furniture,products,receipts,damages,decorations}/`
- No CI/CD configured yet; no GitHub Actions
- Playwright config: Chromium only, `tests/` dir, webServer auto-starts `npm run dev`
