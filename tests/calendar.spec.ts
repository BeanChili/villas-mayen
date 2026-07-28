import { test, expect, loginAsAdmin } from "./helpers";

/**
 * CALENDAR TESTS - The /calendar page displays Quotes in a calendar view
 * Views: 2 Semanas (default) / Semana / Día, plus Lista/Calendario display modes.
 * Tests calendar display, view switching, navigation, and the "Cotizar" flow
 */
test.describe('Calendar', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Load', () => {
    test('should load calendar page successfully', async ({ page }) => {
      await expect(page.locator('main h1:has-text("Calendario de Eventos")')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Cotizar').first()).toBeVisible();
    });

    test('should display calendar grid', async ({ page }) => {
      await expect(page.locator('text=Dom').first()).toBeVisible();
      await expect(page.locator('text=Lun').first()).toBeVisible();
      await expect(page.locator('text=Mar').first()).toBeVisible();
      await expect(page.locator('text=Mié').first()).toBeVisible();
      await expect(page.locator('text=Jue').first()).toBeVisible();
      await expect(page.locator('text=Vie').first()).toBeVisible();
      await expect(page.locator('text=Sáb').first()).toBeVisible();
    });

    test('should display period navigation', async ({ page }) => {
      await expect(page.locator('[data-testid="prev-period"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-period"]')).toBeVisible();
      await expect(page.locator('[data-testid="today-button"]')).toBeVisible();
    });

    test('should display current period title', async ({ page }) => {
      const monthPattern = /Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre/i;
      await expect(page.locator('[data-testid="current-period"]')).toContainText(monthPattern);
      await expect(page.locator('[data-testid="current-period"]')).toContainText(/\d{4}/);
    });

    test('should display quote status legend', async ({ page }) => {
      const statuses = ['Borrador', 'Enviada a Cliente', 'No Confirmada', 'Confirmada / Pago Anticipo', 'En Ejecución', 'Cancelado', 'Finalizada / Liquidada'];
      for (const label of statuses) {
        const count = await page.locator(`text=${label}`).count();
        expect(count).toBeGreaterThan(0);
      }
    });
  });

  test.describe('View Switcher', () => {
    test('should switch to week view', async ({ page }) => {
      await page.locator('button:has-text("Semana")').last().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="current-period"]')).toBeVisible();
      // Week view should show day names in headers
      const dayHeaders = page.locator('main').locator('text=Dom');
      const count = await dayHeaders.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should switch to day view', async ({ page }) => {
      await page.locator('button:has-text("Día")').click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="current-period"]')).toBeVisible();
      // Day view shows the event count or the empty state
      await expect(page.locator('text=evento').first()).toBeVisible();
    });

    test('should switch back to biweek view', async ({ page }) => {
      await page.locator('button:has-text("Día")').click();
      await page.waitForLoadState('networkidle');
      await page.locator('button:has-text("2 Semanas")').click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Dom').first()).toBeVisible();
    });

    test('should switch to list view', async ({ page }) => {
      await page.locator('button:has-text("Lista")').click();
      await page.waitForLoadState('networkidle');
      // List view shows a table with these headers (or the empty message)
      await expect(page.locator('th:has-text("Cliente")')).toBeVisible();
      await expect(page.locator('th:has-text("Fechas")')).toBeVisible();
      await expect(page.locator('th:has-text("Estado")')).toBeVisible();
    });
  });

  test.describe('Calendar Navigation', () => {
    test('should navigate to previous period', async ({ page }) => {
      const titleBefore = await page.locator('[data-testid="current-period"]').textContent();
      await page.click('[data-testid="prev-period"]');
      await page.waitForLoadState('networkidle');
      const titleAfter = await page.locator('[data-testid="current-period"]').textContent();
      expect(titleAfter).not.toBe(titleBefore);
    });

    test('should navigate to next period', async ({ page }) => {
      const titleBefore = await page.locator('[data-testid="current-period"]').textContent();
      await page.click('[data-testid="next-period"]');
      await page.waitForLoadState('networkidle');
      const titleAfter = await page.locator('[data-testid="current-period"]').textContent();
      expect(titleAfter).not.toBe(titleBefore);
    });

    test('should return to today with the Hoy button', async ({ page }) => {
      const titleToday = await page.locator('[data-testid="current-period"]').textContent();
      await page.click('[data-testid="next-period"]');
      await page.waitForLoadState('networkidle');
      await page.click('[data-testid="today-button"]');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="current-period"]')).toHaveText(titleToday || '');
    });

    test('should navigate weeks in week view', async ({ page }) => {
      await page.locator('button:has-text("Semana")').last().click();
      await page.waitForLoadState('networkidle');

      const titleBefore = await page.locator('[data-testid="current-period"]').textContent();
      await page.click('[data-testid="next-period"]');
      await page.waitForLoadState('networkidle');
      const titleAfter = await page.locator('[data-testid="current-period"]').textContent();
      expect(titleAfter).not.toBe(titleBefore);
    });

    test('should navigate days in day view', async ({ page }) => {
      await page.locator('button:has-text("Día")').click();
      await page.waitForLoadState('networkidle');

      const titleBefore = await page.locator('[data-testid="current-period"]').textContent();
      await page.click('[data-testid="next-period"]');
      await page.waitForLoadState('networkidle');
      const titleAfter = await page.locator('[data-testid="current-period"]').textContent();
      expect(titleAfter).not.toBe(titleBefore);
    });

    test('should highlight current day', async ({ page }) => {
      // The today highlight should exist in the default (biweek) grid
      const todayElement = page.locator('main [class*="vm-day-today"]');
      const count = await todayElement.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Quote Display', () => {
    test('should show quote chips with correct colors', async ({ page }) => {
      // If quotes exist in the visible range, chips render with quote status colors
      const chips = page.locator('main button[class*="rounded-full"][style*="background"]');
      const count = await chips.count();
      if (count > 0) {
        const firstChip = chips.first();
        const bgColor = await firstChip.evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(bgColor).toBeTruthy();
      }
    });

    test('should show client names on quote chips', async ({ page }) => {
      const chips = page.locator('main button[class*="rounded-full"][style*="background"]');
      const count = await chips.count();
      if (count > 0) {
        const firstText = await chips.first().textContent();
        expect(firstText?.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Day View', () => {
    test('should display timeline or empty state in day view', async ({ page }) => {
      await page.locator('button:has-text("Día")').click();
      await page.waitForLoadState('networkidle');

      // Day view shows either the empty state or the hour timeline
      const timeline = page.locator('text=a.m.');
      const emptyState = page.locator('text=Sin eventos para este día');

      const hasTimeline = await timeline.first().isVisible().catch(() => false);
      const hasEmpty = await emptyState.first().isVisible().catch(() => false);

      expect(hasTimeline || hasEmpty).toBe(true);
    });
  });

  test.describe('Cotizar Button', () => {
    test('should navigate to quotes page when clicking Cotizar', async ({ page }) => {
      const cotizarBtn = page.locator('a[href^="/quotes"]').filter({ hasText: 'Cotizar' });
      await expect(cotizarBtn.first()).toBeVisible();
      await cotizarBtn.first().click();
      await page.waitForURL(url => url.pathname === '/quotes');
      await expect(page.locator('main h1:has-text("Cotizaciones")')).toBeVisible();
    });

    test('should show Cotizar button in empty day view', async ({ page }) => {
      await page.locator('button:has-text("Día")').click();
      await page.waitForLoadState('networkidle');

      const emptyState = page.locator('text=Sin eventos para este día');
      if (await emptyState.first().isVisible().catch(() => false)) {
        await expect(page.locator('button:has-text("Cotizar")').first()).toBeVisible();
      }
    });
  });

  test.describe('Calendar Performance', () => {
    test('should load calendar within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle period navigation quickly', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      const startTime = Date.now();
      await page.click('[data-testid="next-period"]');
      await page.waitForLoadState('networkidle');
      const navTime = Date.now() - startTime;
      expect(navTime).toBeLessThan(2000);
    });
  });
});
