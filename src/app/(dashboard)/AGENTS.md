# src/app/(dashboard)/ — Protected Dashboard Routes

## OVERVIEW
All authenticated pages behind the sidebar layout. Every route here requires a valid session; the layout enforces the sidebar + header shell.

## STRUCTURE
```
(dashboard)/
├── layout.tsx          # Sidebar + header — defines the navigation array; "use client"
├── page.tsx            # Dashboard home (widgets, stats)
├── dashboard-content.tsx
├── reservations/page.tsx
├── clients/page.tsx
├── quotes/page.tsx
├── inventory/page.tsx
├── expenses/page.tsx
├── events/page.tsx
├── settings/           # (placeholder)
└── (catalog not yet created as a dir)
```

## CONVENTIONS
- `layout.tsx` is `"use client"` — contains sidebar state, `useSession`, `usePathname`
- Navigation items defined in `navigation` array inside `layout.tsx` — add new routes there
- Active link detection: `pathname === item.href || pathname.startsWith(item.href + "/")`
- Page content wrapped in `<main className="p-4 lg:p-8">` — do not add extra outer padding in pages
- Mobile sidebar uses `translate-x` toggle, overlay backdrop — sidebar state via `useState`

## ANTI-PATTERNS
- Do NOT add auth redirects in individual pages — auth is handled by NextAuth middleware / session
- Do NOT use `(session.user as any).role` — type is augmented; use `session.user.role` directly
- Line 112 in `layout.tsx` still uses `(session.user as any)?.role` for lowercase display — known tech debt
- Do NOT hardcode page titles inline — header reads from the `navigation` array

## NOTES
- Sidebar is defined inline in `layout.tsx` — no separate `Sidebar.tsx` component exists yet
- `dashboard-content.tsx` extracted to avoid full-page client boundary at route level
- `/catalog` route referenced in sidebar but directory does not exist yet — TBD
