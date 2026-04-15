# src/ — Application Source Root

## OVERVIEW
All application code. Three main domains: `app/` (routing + pages + API), `components/` (UI), `lib/` + `types/` (shared logic).

## STRUCTURE
```
src/
├── app/
│   ├── (auth)/         # Login only — wraps in minimal no-sidebar layout
│   ├── (dashboard)/    # All protected routes — layout.tsx provides sidebar
│   └── api/            # REST handlers — Next.js route.ts files only
├── components/
│   ├── ui/             # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── shared/         # EMPTY — shared components not yet extracted
│   └── providers.tsx   # SessionProvider wrapping all client pages
├── lib/
│   ├── auth.ts         # NextAuth options (CredentialsProvider + JWT callbacks)
│   ├── db.ts           # Prisma singleton
│   └── utils.ts        # cn(), formatCurrency(), formatDate(), status helpers
└── types/
    └── index.ts        # All enums, form types, ApiResponse<T>, rolePermissions, hasPermission()
```

## WHERE TO LOOK
| Task | File |
|------|------|
| Add a new page | `src/app/(dashboard)/<module>/page.tsx` |
| Add a new API route | `src/app/api/<resource>/route.ts` |
| Add/modify a role permission | `src/types/index.ts` → `rolePermissions` |
| Format money or dates | `src/lib/utils.ts` |
| Add a new label map | `src/types/index.ts` (type guard) + `src/lib/utils.ts` (display fn) |
| Add a shared UI component | `src/components/shared/` (currently empty — create here) |

## ANTI-PATTERNS
- Do NOT import from `@prisma/client` in pages/components — always use `@/lib/db` via API routes
- Do NOT use `(session.user as any)` — types are augmented in `src/types/index.ts`
- Do NOT create label maps inline in pages — add to `src/lib/utils.ts` + `src/types/index.ts`
