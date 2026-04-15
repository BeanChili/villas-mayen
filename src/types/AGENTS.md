# src/types/ — TypeScript Type Definitions

## OVERVIEW
Single file (`index.ts`, 389 lines): NextAuth module augmentation, all domain enums, form types, `ApiResponse<T>`, `rolePermissions` matrix, `hasPermission()`, and all label/color maps.

## KEY EXPORTS
| Export | Kind | Purpose |
|--------|------|---------|
| `Role`, `ClientType`, `ReservationType`, `LocationType`, `Schedule`, `PaymentStatus`, `ReservationStatus`, `QuoteStatus`, `ProductCategory`, `UnitMeasure`, `FurnitureCategory`, `FurnitureStatus`, `ExpenseCategory`, `ReturnStatus`, `ItemReturnStatus`, `BedType`, `RoomStatus` | type unions | All domain enum strings |
| `ApiResponse<T>` | interface | `{ success, data?, error? }` — standard API return shape |
| `PaginatedResponse<T>` | interface | `{ data, total, page, pageSize, totalPages }` |
| `*FormData` | interfaces | One per entity (Reservation, Client, Quote, Furniture, Product, Expense, User, EventClosing) |
| `rolePermissions` | const Record | Permissions per Role per module — source of truth for RBAC |
| `hasPermission(role, module, action)` | fn | RBAC check — use this, never bypass |
| `statusLabels`, `statusColors`, `*Labels` | const Records | Display strings — prefer `src/lib/utils.ts` get*() fns for display; use these for type guards |

## ANTI-PATTERNS
- Do NOT inline permission checks — always call `hasPermission()`
- Do NOT duplicate label maps in page files — they already exist here and in `src/lib/utils.ts`
- `session.user.role` is typed here via module augmentation — do NOT cast with `as any`

## NOTES
- `statusColors` (hex) in `types/index.ts` differ slightly from `getStatusColor()` in `utils.ts` — both define hex but `utils.ts` version is canonical for calendar rendering
- `FurnitureStatus.DANADO` in TypeScript type is `'DANADO'` but Prisma enum is `DAÑADO` — check both when comparing
