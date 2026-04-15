# tests/ — Playwright E2E Tests

## OVERVIEW
All tests are E2E (Playwright, Chromium only). No unit tests. webServer auto-starts `npm run dev` when running tests.

## FILES
| File | Coverage |
|------|---------|
| `helpers.ts` | Test utilities: `loginAsAdmin()`, `loginAs()`, `navigateTo()`, `waitForDialog()`, `clickSidebar()`, date utils, `testUsers` credentials, label helpers |
| `auth.spec.ts` | Authentication flows |
| `clients.spec.ts` | Client CRUD |
| `dashboard.spec.ts` | Dashboard page smoke |
| `e2e.spec.ts` | General end-to-end flows |
| `features.spec.ts` | Feature-specific tests |
| `navigation.spec.ts` | Sidebar navigation |
| `reservations.spec.ts` | Reservation CRUD + conflicts |

## CONVENTIONS
- Import from `./helpers` — provides typed helpers and `test`, `expect` re-exports
- Login pattern: always use `loginAsAdmin(page)` or `loginAs(page, username, password)` — never inline
- Sidebar navigation: use `clickSidebar(page, 'Reservaciones')` — handles edge case where dashboard has no sidebar
- Wait for `form[data-hydrated="true"]` before filling login form — prevents native GET form submit race
- Playwright config: `timeout: 60000`, `actionTimeout: 15000`, `navigationTimeout: 30000`, `retries: 2` in CI

## ANTI-PATTERNS
- Do NOT hardcode credentials inline — use `testUsers` from `helpers.ts`
- Do NOT use `page.waitForTimeout()` for logic waits — use `waitForSelector` / `waitForURL` / `waitForLoadState`
- Do NOT write unit tests here — this dir is Playwright only

## TEST CREDENTIALS (from helpers.ts)
```
admin / admin123
recepcionista / recepcionista123
finanzas / finanzas123
almacen / almacen123
visual / visual123
```

## NOTES
- `reuseExistingServer: !process.env.CI` — local dev reuses running server, CI always starts fresh
- `test-results/` and `playwright-report/` are gitignored artifacts
- `.playwright-mcp/` dir is Playwright MCP tool state — not test source
