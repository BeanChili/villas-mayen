import { test, expect, loginAs } from './helpers';

// Roles nuevos del seed: benjamin (Contador) y eric (Finanzas Restringido).
// El enforcement real esta en la API; aca se valida la experiencia completa.

test.describe('Roles y permisos', () => {
  test('benjamin (contador) ve cotizaciones pero no gastos ni configuracion', async ({ page }) => {
    await loginAs(page, 'benjamin', 'benjamin123');

    const nav = page.locator('nav');
    await expect(nav).toContainText('Cotizaciones');
    await expect(nav).toContainText('Cierres');
    await expect(nav).not.toContainText('Gastos');
    await expect(nav).not.toContainText('Configuración');

    // La API de gastos le responde 403
    const res = await page.request.get('/api/expenses');
    expect(res.status()).toBe(403);

    // Entrar por URL directa muestra la pantalla de sin acceso
    await page.goto('/expenses');
    await expect(page.getByText('Sin acceso')).toBeVisible();
  });

  test('benjamin no puede modificar precios en el wizard de cotizaciones', async ({ page }) => {
    await loginAs(page, 'benjamin', 'benjamin123');
    await page.goto('/quotes');

    await page.click('button:has-text("Nueva Cotización")');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Agregar un espacio para que aparezcan los campos de precio
    await dialog.locator('button:has-text("Agregar")').first().click();
    const priceInput = dialog.locator('div:has(> label:text-matches("^Precio")) input[type="number"]').first();
    await expect(priceInput).toBeDisabled();
  });

  test('eric (finanzas restringido) entra por gastos y no ve ventas', async ({ page }) => {
    await loginAs(page, 'eric', 'eric123');

    // Sin dashboard: la raiz lo redirige a su primer modulo visible
    await expect(page).toHaveURL(/\/expenses/);

    const nav = page.locator('nav');
    await expect(nav).toContainText('Gastos');
    await expect(nav).not.toContainText('Cotizaciones');
    await expect(nav).not.toContainText('Cierres');

    const res = await page.request.get('/api/users');
    expect(res.status()).toBe(403);

    await page.goto('/quotes');
    await expect(page.getByText('Sin acceso')).toBeVisible();
  });

  test('admin administra los roles desde configuracion', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');
    await page.goto('/settings/roles');

    await expect(page.getByRole('heading', { name: 'Roles y Permisos' })).toBeVisible();
    const tabla = page.getByRole('table');
    await expect(tabla.getByText('Superadmin')).toBeVisible();
    await expect(tabla.getByText('Contador', { exact: true })).toBeVisible();
    await expect(tabla.getByText('Finanzas Restringido')).toBeVisible();
  });
});
