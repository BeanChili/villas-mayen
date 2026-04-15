# src/app/api/ — REST API Route Handlers

## OVERVIEW
All backend logic. Next.js Route Handlers only — no Express, no separate server. Each resource has `route.ts` (collection) and optionally `[id]/route.ts` (single item).

## STRUCTURE
```
api/
├── auth/[...nextauth]/route.ts   # NextAuth catch-all — delegates to authOptions
├── clients/
│   ├── route.ts                  # GET (list), POST
│   └── [id]/route.ts             # GET, PUT, DELETE
├── expenses/route.ts
├── furniture/route.ts
├── locations/route.ts            # GET catalog locations (areas, halls, rooms, etc.)
├── products/route.ts
├── quotes/
│   ├── route.ts
│   └── [id]/route.ts
├── reservations/route.ts
└── users/
    ├── route.ts
    └── [id]/route.ts
```

## CONVENTIONS
- Always return `ApiResponse<T>` shape: `{ success: boolean, data?, error? }`
- Always `import prisma from '@/lib/db'` — never new PrismaClient
- Auth check pattern: `const session = await getServerSession(authOptions)` then check `session?.user.role`
- Permission check: `hasPermission(session.user.role as Role, 'module', 'action')`
- Error responses: `NextResponse.json({ success: false, error: '...' }, { status: 4xx })`

## ANTI-PATTERNS
- Do NOT perform DB queries in page components — only in these route handlers
- Do NOT skip permission checks — every mutating endpoint must verify role
- Do NOT create new PrismaClient instances — `@/lib/db` only
- `locations/route.ts` appears to handle all location types polymorphically — do not create per-type location routes

## NOTES
- `furniture/` handles inventory (Furniture model) — named `furniture` not `inventory` in API
- `expenses/` and `products/` are flat (no `[id]/` subdirectory yet — may need adding)
- `auth/[...nextauth]` is the only NextAuth handler — all auth flows go through it
