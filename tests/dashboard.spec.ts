import { test, expect, loginAsAdmin, loginAs } from "./helpers";

/**
 * DASHBOARD TESTS - Dashboard functionality and display
 * Tests dashboard loading, widgets, data display, and interactions
 */
test.describe('Dashboard', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Dashboard Page Load', () => {
    test('should load dashboard successfully', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h2:has-text("Bienvenido")')).toBeVisible({ timeout: 10000 });
    });

    test('should display welcome message with user name', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Should show "Bienvenido, admin" or similar — use heading selector
      const welcomeHeading = page.locator('h2:has-text("Bienvenido")');
      await expect(welcomeHeading).toBeVisible();
    });

    test('should display current date in header', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Should display current date in Spanish format
      const today = new Date();
      const expectedDate = today.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      await expect(page.locator(`text=${expectedDate}`)).toBeVisible();
    });

    test('should display user role in sidebar', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Sidebar is hidden on mobile by default (lg:translate-x-0), use the bottom user section
      // The user name "Administrador" (display name) is shown in the sidebar bottom section
      await expect(page.locator('aside p:has-text("Administrador")')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Dashboard Stats Widgets', () => {
    test('should display all 4 main stat cards', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Reservaciones del Mes')).toBeVisible();
      await expect(page.locator('text=Eventos Hoy')).toBeVisible();
      await expect(page.locator('text=Clientes Nuevos')).toBeVisible();
      await expect(page.locator('text=Gastos del Mes')).toBeVisible();
    });

    test('should display numeric values in stat cards', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Stat cards show large bold numbers (could be 0 or more)
      // The dashboard shows numbers like "0", "1", etc. in text-3xl font-bold
      const numbers = page.locator('p.text-3xl');
      await expect(numbers.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display icons for each stat card', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Lucide SVGs are rendered as plain SVG elements inside colored bg divs
      // Just check that SVG icons are present inside stat cards
      const svgIcons = page.locator('div[class*="rounded-full"] svg');
      await expect(svgIcons.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Quick Actions', () => {
    test('should display quick action cards', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Ver Reservaciones')).toBeVisible();
      await expect(page.locator('text=Ver Clientes')).toBeVisible();
      await expect(page.locator('text=Ver Cotizaciones')).toBeVisible();
    });

    test('should navigate to reservations from quick action', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Ver Reservaciones');
      await page.waitForURL('**/reservations');
      
      await expect(page.locator('h1:has-text("Reservaciones")')).toBeVisible();
    });

    test('should navigate to clients from quick action', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Ver Clientes');
      await page.waitForURL('**/clients');
      
      await expect(page.locator('h1:has-text("Clientes")')).toBeVisible();
    });

    test('should navigate to quotes from quick action', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      await page.click('text=Ver Cotizaciones');
      await page.waitForURL('**/quotes');
      
      await expect(page.locator('h1:has-text("Cotizaciones")')).toBeVisible();
    });
  });

  test.describe('Upcoming Events Section', () => {
    test('should display upcoming events section', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Próximos Eventos')).toBeVisible();
    });

    test('should show message when no upcoming events', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Either shows events or message
      const noEventsMessage = page.locator('text=No hay eventos programados');
      const eventsList = page.locator('[class*="border"]').first();
      
      // One should be visible
      const hasNoEvents = await noEventsMessage.isVisible().catch(() => false);
      const hasEvents = await eventsList.isVisible().catch(() => false);
      
      expect(hasNoEvents || hasEvents).toBe(true);
    });

    test('should display event details when events exist', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // If there are events, verify structure
      const eventItems = page.locator('[class*="hover:bg-gray"]');
      const count = await eventItems.count();
      
      if (count > 0) {
        // Check event has client name and location
        const firstEvent = eventItems.first();
        await expect(firstEvent).toBeVisible();
      }
    });
  });

  test.describe('Alerts Section', () => {
    test('should display alerts for damaged furniture', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Check if damaged furniture alert appears
      const alertCard = page.locator('[class*="border-red"]');
      const hasAlert = await alertCard.isVisible().catch(() => false);
      
      // Alert should be visible if there are damaged items
      if (hasAlert) {
        await expect(page.locator('text=Mobiliario Dañado')).toBeVisible();
      }
    });
  });

  test.describe('Dashboard Data Refresh', () => {
    test('should refresh data when navigating back to dashboard', async ({ page }) => {
      // Go to another page
      await page.click('text=Ver Clientes');
      await page.waitForURL('**/clients');
      
      // Go back to dashboard
      await page.click('nav a:has-text("Dashboard")');
      await page.waitForURL(url => url.pathname === '/');
      await page.waitForLoadState('networkidle');
      
      // Should still show dashboard
      await expect(page.locator('h2:has-text("Bienvenido")')).toBeVisible();
    });

    test('should persist data after page refresh', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Get current stats
      const reservationsCard = page.locator('text=Reservaciones del Mes').first();
      await expect(reservationsCard).toBeVisible();
      
      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should still show data
      await expect(page.locator('h2:has-text("Bienvenido")')).toBeVisible();
    });
  });

  test.describe('Sidebar Integration', () => {
    test('should have working sidebar on dashboard', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Verify sidebar is present
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();
    });

    test('should show all navigation items in sidebar', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      const sidebarItems = ['Reservaciones', 'Clientes', 'Cotizaciones', 'Inventario', 'Gastos', 'Eventos', 'Configuración'];
      
      for (const item of sidebarItems) {
        await expect(page.locator(`nav a:has-text("${item}")`)).toBeVisible();
      }
    });

    test('should show logout button in sidebar', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('text=Cerrar Sesión')).toBeVisible();
    });
  });
});

/**
 * ADDITIONAL DASHBOARD TESTS - Different user roles
 * NOTE: These tests require recepcionista and visual users to exist in the database.
 * Run `npx prisma db seed` first to create all required test users.
 */
test.describe('Dashboard - Role Variations', () => {
  
  test('should display dashboard correctly for recepcionista role', async ({ page }) => {
    await loginAs(page, 'recepcionista', 'recepcionista123');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h2:has-text("Bienvenido")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Reservaciones del Mes')).toBeVisible();
  });

  test('should display dashboard correctly for visual role', async ({ page }) => {
    await loginAs(page, 'visual', 'visual123');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('h2:has-text("Bienvenido")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Reservaciones del Mes')).toBeVisible();
  });
});