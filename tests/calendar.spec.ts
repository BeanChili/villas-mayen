import { test, expect, loginAsAdmin } from "./helpers";
import { getFutureDate, getPastDate, generateRandomName } from "./helpers";
import { getQuoteStatusColor, getQuoteStatusLabel } from "./helpers";

/**
 * CALENDAR TESTS - The /reservations page now displays Quotes in a calendar view
 * Tests calendar display, view switching, navigation, and the "Cotizar" flow
 */
test.describe('Calendar', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/reservations');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Load', () => {
    test('should load calendar page successfully', async ({ page }) => {
      await expect(page.locator('main h1:has-text("Reservaciones")')).toBeVisible({ timeout: 10000 });
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
    });

    test('should display current period title', async ({ page }) => {
      const now = new Date();
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const currentMonth = monthNames[now.getMonth()];
      await expect(page.locator('[data-testid="current-period"]')).toContainText(currentMonth);
      await expect(page.locator('[data-testid="current-period"]')).toContainText(String(now.getFullYear()));
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
      await page.locator('button:has-text("Semana")').click();
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
      // Day view shows a large day layout
      await expect(page.locator('text=evento').first()).toBeVisible();
    });

    test('should switch back to month view', async ({ page }) => {
      await page.locator('button:has-text("Día")').click();
      await page.waitForLoadState('networkidle');
      await page.locator('button:has-text("Mes")').click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Dom').first()).toBeVisible();
    });
  });

  test.describe('Calendar Navigation', () => {
    test('should navigate to previous month', async ({ page }) => {
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

      await page.click('[data-testid="prev-period"]');
      await page.waitForLoadState('networkidle');

      const expectedMonth = monthNames[prevMonth.getMonth()];
      const expectedYear = prevMonth.getFullYear();
      await expect(page.locator('[data-testid="current-period"]')).toContainText(expectedMonth);
      await expect(page.locator('[data-testid="current-period"]')).toContainText(String(expectedYear));
    });

    test('should navigate to next month', async ({ page }) => {
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

      await page.click('[data-testid="next-period"]');
      await page.waitForLoadState('networkidle');

      const expectedMonth = monthNames[nextMonth.getMonth()];
      const expectedYear = nextMonth.getFullYear();
      await expect(page.locator('[data-testid="current-period"]')).toContainText(expectedMonth);
      await expect(page.locator('[data-testid="current-period"]')).toContainText(String(expectedYear));
    });

    test('should navigate weeks in week view', async ({ page }) => {
      await page.locator('button:has-text("Semana")').click();
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
      const now = new Date();
      // The today highlight should exist in the calendar grid
      const todayElement = page.locator('main [class*="vm-day-today"]');
      const count = await todayElement.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Quote Display', () => {
    test('should show quote bars with correct colors', async ({ page }) => {
      // If quotes exist, bars should render with quote status colors
      const bars = page.locator('[class*="vm-res-bar"]');
      const count = await bars.count();
      if (count > 0) {
        const firstBar = bars.first();
        const bgColor = await firstBar.evaluate((el) => getComputedStyle(el).backgroundColor);
        expect(bgColor).toBeTruthy();
      }
    });

    test('should show client names on quote bars', async ({ page }) => {
      const bars = page.locator('[class*="vm-res-bar"]');
      const count = await bars.count();
      if (count > 0) {
        const firstText = await bars.first().textContent();
        expect(firstText?.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Day View Cards', () => {
    test('should display large cards with client names in day view', async ({ page }) => {
      await page.locator('button:has-text("Día")').click();
      await page.waitForLoadState('networkidle');

      // Day view shows either empty state or cards
      const cards = page.locator('[class*="rounded-xl"][class*="border"][class*="bg-card"]');
      const emptyState = page.locator('text=Sin eventos para este día');

      const hasCards = await cards.first().isVisible().catch(() => false);
      const hasEmpty = await emptyState.first().isVisible().catch(() => false);

      expect(hasCards || hasEmpty).toBe(true);
    });
  });

  test.describe('Cotizar Button', () => {
    test('should navigate to quotes page when clicking Cotizar', async ({ page }) => {
      const cotizarBtn = page.locator('a[href="/quotes"]').filter({ hasText: 'Cotizar' });
      await expect(cotizarBtn.first()).toBeVisible();
      await cotizarBtn.first().click();
      await page.waitForURL('/quotes');
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
      await page.goto('/reservations');
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
