# src/lib/ — Shared Utilities

## OVERVIEW
Three files: Prisma singleton, NextAuth config, and all utility/formatter functions.

## FILES
| File | Purpose |
|------|---------|
| `db.ts` | Prisma client singleton — only place a PrismaClient is instantiated |
| `auth.ts` | NextAuth options: CredentialsProvider (username+bcrypt), JWT strategy, 24h session |
| `utils.ts` | `cn()`, `formatCurrency()`, `formatDate()`, `formatDateTime()`, `calculateDepreciation()`, `getStatus*()`, `getScheduleLabel()`, `getLocationTypeLabel()`, `getClientTypeLabel()`, `getQuoteStatusLabel()`, `getFurnitureStatusLabel()`, `getExpenseCategoryLabel()`, `getProductCategoryLabel()` |

## CONVENTIONS
- `cn()` = `twMerge(clsx(...))` — always use for conditional Tailwind classes
- `formatCurrency()` → es-MX / MXN locale
- `formatDate()` / `formatDateTime()` → es-MX locale
- `parseSchedule(json)` — parses SQLite JSON array of Schedule enum values

## ANTI-PATTERNS
- **`calculateDepreciation()` has a BUG**: line 43 uses `365 * 25 * 24 * 60 * 60 * 1000` — `25` should be `1000` (ms). Do NOT copy this formula. Correct: `(now - purchase) / (365 * 24 * 60 * 60 * 1000)`.
- Do NOT instantiate `new PrismaClient()` anywhere — import `prisma` from `./db`
- `auth.ts` line 53 still uses `(user as any).username` cast — known issue, do not propagate this pattern
- Do NOT hardcode labels inline — add helpers here instead

## NOTES
- `authOptions` exported from `auth.ts` is consumed by `src/app/api/auth/[...nextauth]/route.ts`
- `NEXTAUTH_SECRET` fallback is hardcoded — override in production env
