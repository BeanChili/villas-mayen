# src/components/ui/ — shadcn/ui Primitives

## OVERVIEW
Generated shadcn/ui base components. Minimal manual edits. Do NOT modify internals — extend via composition.

## COMPONENTS
| File | Component |
|------|-----------|
| `button.tsx` | `Button` + variants (default, destructive, outline, secondary, ghost, link) |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `badge.tsx` | `Badge` + variants |
| `dialog.tsx` | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` |
| `dropdown-menu.tsx` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, etc. |
| `input.tsx` | `Input` |
| `label.tsx` | `Label` |
| `select.tsx` | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, etc. |
| `tabs.tsx` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| `data-table.tsx` | `DataTable` (TanStack Table wrapper with sorting, filtering, pagination) |

## ANTI-PATTERNS
- Do NOT add new base components manually — use `npx shadcn-ui@latest add <component>`
- Do NOT edit generated component internals for one-off styling — use `className` prop + `cn()`
- `data-table.tsx` is custom (TanStack Table) — it belongs here but is project-specific, not generated

## NOTES
- Colors/radius via CSS variables in `globals.css` → `hsl(var(--primary))` etc.
- `tailwindcss-animate` plugin provides accordion keyframes used by Radix components
- Toast component not present yet — `@radix-ui/react-toast` is installed
