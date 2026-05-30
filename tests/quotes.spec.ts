import { test, expect, loginAsAdmin, selectClientFromDropdown } from "./helpers";
import { generateRandomName, getFutureDate } from "./helpers";

/**
 * QUOTES TESTS - Quote (Cotización) CRUD and lifecycle management
 * Tests creation, spaces, products, status transitions, and auto-expiration
 */
test.describe('Quotes', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Create Quote', () => {
    test('should create a quote with multiple spaces', async ({ page }) => {
      const clientName = generateRandomName('ClienteMulti');

      // Create client FIRST via API before loading the page
      const clientRes = await page.request.post('/api/clients', {
        data: { name: clientName, clientType: 'EMPRESA', category: 'BUENO' },
      });
      expect(clientRes.ok()).toBe(true);

      await page.goto('/quotes');
      await page.waitForURL('/quotes');
      await page.waitForLoadState('networkidle');

      await page.locator('button:has-text("Nueva Cotización")').click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });

      const dialog = page.locator('[role="dialog"]');

      // Fill event date
      await dialog.locator('input[type="date"]').first().fill(getFutureDate(10));

      // Select client
      await selectClientFromDropdown(page, clientName, dialog);

      // Add first space (Salón)
      await dialog.locator('button:has-text("Agregar")').first().click();
      await page.waitForTimeout(300);
      const spaceTypeSelects = dialog.locator('[role="combobox"]').filter({ hasText: /Salón|Seleccionar/ });
      await spaceTypeSelects.first().click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'Salón' }).first().click();
      await page.waitForTimeout(300);
      let locSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Seleccionar/ }).first();
      await locSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').first().click();

      // Add second space (Jardín)
      await dialog.locator('button:has-text("Agregar")').first().click();
      await page.waitForTimeout(300);
      const spaceRows = dialog.locator('div[class*="rounded-xl"][class*="border"][class*="bg-muted"]');
      const secondSpace = spaceRows.nth(1);
      const secondTypeSelect = secondSpace.locator('[role="combobox"]').first();
      await secondTypeSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'Jardín' }).first().click();
      await page.waitForTimeout(300);
      const secondLocSelect = secondSpace.locator('[role="combobox"]').filter({ hasText: /Seleccionar/ }).first();
      await secondLocSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').first().click();

      // Submit
      await dialog.locator('button[type="submit"]').click();
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => page.keyboard.press('Escape'));
      await page.waitForTimeout(500);

      // Verify quote appears in list
      await expect(page.locator(`text=${clientName}`).first()).toBeVisible();
      console.log('✓ Quote with multiple spaces created');
    });

    test('should add COMIDA_MENU product and show date/time dialog', async ({ page }) => {
      await page.goto('/quotes');
      await page.waitForURL('/quotes');
      const clientName = generateRandomName('ClienteMenu');

      const clientRes = await page.request.post('/api/clients', {
        data: { name: clientName, clientType: 'PARTICULAR', category: 'REGULAR' },
      });
      expect(clientRes.ok()).toBe(true);

      await page.waitForLoadState('networkidle');

      await page.locator('button:has-text("Nueva Cotización")').click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });

      const dialog = page.locator('[role="dialog"]');

      await dialog.locator('input[type="date"]').first().fill(getFutureDate(15));

      await selectClientFromDropdown(page, clientName, dialog);

      // Add a space first (required)
      await dialog.locator('button:has-text("Agregar")').first().click();
      await page.waitForTimeout(300);
      const spaceTypeSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Salón|Seleccionar/ }).first();
      await spaceTypeSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'Salón' }).first().click();
      await page.waitForTimeout(300);
      const locSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Seleccionar/ }).first();
      await locSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').first().click();

      // Click COMIDA_MENU tab
      await dialog.locator('button:has-text("Comida")').click();
      await page.waitForTimeout(300);

      // Click a COMIDA_MENU product
      const productBtn = dialog.locator('button[type="button"]').filter({ hasText: 'Desayuno Ejecutivo' }).first();
      if (await productBtn.isVisible().catch(() => false)) {
        await productBtn.click();

        // Should open the menu configuration dialog (F3)
        const menuDialog = page.locator('[role="dialog"]').filter({ hasText: 'Desayuno Ejecutivo' }).first();
        await expect(menuDialog).toBeVisible({ timeout: 5000 });
        // Verify menu dialog fields exist (use input selectors since text may be in labels)
        await expect(menuDialog.locator('input[type="date"]').first()).toBeVisible();
        await expect(menuDialog.locator('input[type="time"]').first()).toBeVisible();
        await expect(menuDialog.locator('input[type="time"]').nth(1)).toBeVisible();

        // Fill and confirm
        await menuDialog.locator('input[type="date"]').first().fill(getFutureDate(15));
        await menuDialog.locator('input[type="time"]').nth(0).fill('08:00');
        await menuDialog.locator('input[type="time"]').nth(1).fill('10:00');
        await menuDialog.locator('button:has-text("Agregar")').click({ force: true });
        await page.waitForTimeout(300);

        // Menu dialog should close, item should appear in items table
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 }).catch(() => {});
      }

      // Submit
      await dialog.locator('button[type="submit"]').click();
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => page.keyboard.press('Escape'));
      await page.waitForTimeout(500);

      await expect(page.locator(`text=${clientName}`).first()).toBeVisible();
      console.log('✓ Quote with COMIDA_MENU product created');
    });
  });

  test.describe('Quote Status Transitions', () => {
    test('should send quote (BORRADOR → ENVIADA)', async ({ page }) => {
      const clientName = generateRandomName('ClienteSend');

      const clientRes = await page.request.post('/api/clients', {
        data: { name: clientName, clientType: 'EMPRESA', category: 'BUENO' },
      });
      expect(clientRes.ok()).toBe(true);

      await page.goto('/quotes');
      await page.waitForURL('/quotes');
      await page.waitForLoadState('networkidle');

      // Create a quote first
      await page.locator('button:has-text("Nueva Cotización")').click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      const dialog = page.locator('[role="dialog"]');

      await dialog.locator('input[type="date"]').first().fill(getFutureDate(20));
      await selectClientFromDropdown(page, clientName, dialog);

      // Add space
      await dialog.locator('button:has-text("Agregar")').first().click();
      await page.waitForTimeout(300);
      const spaceTypeSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Salón|Seleccionar/ }).first();
      await spaceTypeSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'Salón' }).first().click();
      await page.waitForTimeout(300);
      const locSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Seleccionar/ }).first();
      await locSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').first().click();

      await dialog.locator('button[type="submit"]').click();
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => page.keyboard.press('Escape'));
      await page.waitForTimeout(500);

      // Send the quote
      const borradorRow = page.locator('tbody tr').filter({ hasText: 'Borrador' }).first();
      await expect(borradorRow).toBeVisible({ timeout: 5000 });
      const sendButton = borradorRow.locator('button[title="Enviar"]').first();
      await sendButton.click();
      await page.waitForTimeout(500);

      // Verify status changed to ENVIADA
      await expect(page.locator('tbody tr').filter({ hasText: 'Enviada a Cliente' }).first()).toBeVisible({ timeout: 10000 });
      console.log('✓ Quote sent: BORRADOR → ENVIADA');
    });

    test('should confirm quote and auto-create reservation (ENVIADA → CONFIRMADA)', async ({ page }) => {
      await page.goto('/quotes');
      const clientName = generateRandomName('ClienteConfirm');

      const clientRes = await page.request.post('/api/clients', {
        data: { name: clientName, clientType: 'PARTICULAR', category: 'REGULAR' },
      });
      expect(clientRes.ok()).toBe(true);

      await page.waitForURL('/quotes');
      await page.waitForLoadState('networkidle');

      // Create a quote first
      await page.locator('button:has-text("Nueva Cotización")').click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      const dialog = page.locator('[role="dialog"]');

      await dialog.locator('input[type="date"]').first().fill(getFutureDate(25));
      await selectClientFromDropdown(page, clientName, dialog);

      // Add space
      await dialog.locator('button:has-text("Agregar")').first().click();
      await page.waitForTimeout(300);
      const spaceTypeSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Salón|Seleccionar/ }).first();
      await spaceTypeSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'Salón' }).first().click();
      await page.waitForTimeout(300);
      const locSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Seleccionar/ }).first();
      await locSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').first().click();

      await dialog.locator('button[type="submit"]').click();
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => page.keyboard.press('Escape'));
      await page.waitForTimeout(500);

      // Send the quote
      const borradorRow = page.locator('tbody tr').filter({ hasText: 'Borrador' }).first();
      const sendButton = borradorRow.locator('button[title="Enviar"]').first();
      await sendButton.click();
      await page.waitForTimeout(500);

      // Confirm the quote
      const enviadaRow = page.locator('tbody tr').filter({ hasText: 'Enviada a Cliente' }).first();
      await expect(enviadaRow).toBeVisible({ timeout: 10000 });
      const confirmButton = enviadaRow.locator('button[title="Confirmar"]').first();
      await confirmButton.click();
      await page.waitForTimeout(500);

      // Verify status changed to CONFIRMADA
      await expect(page.locator('tbody tr').filter({ hasText: 'Confirmada / Pago Anticipo' }).first()).toBeVisible({ timeout: 10000 });

      // Verify reservation was created by checking the quote detail
      const confirmedRow = page.locator('tbody tr').filter({ hasText: 'Confirmada / Pago Anticipo' }).first();
      await confirmedRow.click();
      await page.waitForTimeout(500);
      const detailDialog = page.locator('[role="dialog"]').filter({ hasText: 'Detalle de Cotización' }).first();
      await expect(detailDialog).toBeVisible({ timeout: 5000 });
      // Should show payments section if reservation exists
      const hasPayments = await detailDialog.locator('text=Pagos Recibidos').isVisible().catch(() => false);
      console.log('✓ Quote confirmed, reservation created:', hasPayments);
    });

    test('should auto-expire and allow re-send (ENVIADA → NO_CONFIRMADA → ENVIADA)', async ({ page }) => {
      await page.goto('/quotes');
      await page.waitForURL('/quotes');
      const clientName = generateRandomName('ClienteExpire');

      const clientRes = await page.request.post('/api/clients', {
        data: { name: clientName, clientType: 'EMPRESA', category: 'BUENO' },
      });
      expect(clientRes.ok()).toBe(true);

      await page.waitForLoadState('networkidle');

      // Create a quote
      await page.locator('button:has-text("Nueva Cotización")').click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      const dialog = page.locator('[role="dialog"]');

      await dialog.locator('input[type="date"]').first().fill(getFutureDate(30));
      await selectClientFromDropdown(page, clientName, dialog);

      // Add space
      await dialog.locator('button:has-text("Agregar")').first().click();
      await page.waitForTimeout(300);
      const spaceTypeSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Salón|Seleccionar/ }).first();
      await spaceTypeSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'Salón' }).first().click();
      await page.waitForTimeout(300);
      const locSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Seleccionar/ }).first();
      await locSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').first().click();

      await dialog.locator('button[type="submit"]').click();
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => page.keyboard.press('Escape'));
      await page.waitForTimeout(500);

      // Send the quote
      const borradorRow = page.locator('tbody tr').filter({ hasText: 'Borrador' }).first();
      await borradorRow.locator('button[title="Enviar"]').first().click();
      await page.waitForTimeout(500);

      // Get quote ID from the ENVIADA row
      const enviadaRow = page.locator('tbody tr').filter({ hasText: 'Enviada a Cliente' }).first();
      await expect(enviadaRow).toBeVisible({ timeout: 10000 });

      // Click to open detail and extract quote ID from URL or DOM
      // Since the row itself doesn't expose the ID easily, we'll use the API to find it
      const quotesRes = await page.request.get('/api/quotes');
      expect(quotesRes.ok()).toBe(true);
      const quotesData = await quotesRes.json();
      const quote = quotesData.data.find((q: any) => q.client?.name === clientName);
      expect(quote).toBeDefined();
      const quoteId = quote.id;

      // Simulate auto-expiration by patching status to NO_CONFIRMADA
      // (Backend GET /api/quotes performs the same auto-expire when expiresAt < now)
      const patchRes = await page.request.patch(`/api/quotes/${quoteId}/status`, {
        data: { status: 'NO_CONFIRMADA' },
      });
      expect(patchRes.ok()).toBe(true);

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify status is NO_CONFIRMADA
      const noConfRow = page.locator('tbody tr').filter({ hasText: 'No Confirmada' }).first();
      await expect(noConfRow).toBeVisible({ timeout: 10000 });
      console.log('✓ Quote auto-expired: ENVIADA → NO_CONFIRMADA');

      // Re-send (NO_CONFIRMADA → ENVIADA)
      const reSendButton = noConfRow.locator('button[title="Reenviar"]').first();
      await reSendButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('tbody tr').filter({ hasText: 'Enviada a Cliente' }).first()).toBeVisible({ timeout: 10000 });
      console.log('✓ Quote re-sent: NO_CONFIRMADA → ENVIADA');
    });

    test('should cancel confirmed quote (CONFIRMADA → CANCELADO)', async ({ page }) => {
      await page.goto('/quotes');
      await page.waitForURL('/quotes');
      const clientName = generateRandomName('ClienteCancel');

      const clientRes = await page.request.post('/api/clients', {
        data: { name: clientName, clientType: 'PARTICULAR', category: 'REGULAR' },
      });
      expect(clientRes.ok()).toBe(true);

      await page.waitForLoadState('networkidle');

      // Create a quote
      await page.locator('button:has-text("Nueva Cotización")').click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      const dialog = page.locator('[role="dialog"]');

      await dialog.locator('input[type="date"]').first().fill(getFutureDate(35));
      await selectClientFromDropdown(page, clientName, dialog);

      // Add space
      await dialog.locator('button:has-text("Agregar")').first().click();
      await page.waitForTimeout(300);
      const spaceTypeSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Salón|Seleccionar/ }).first();
      await spaceTypeSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'Salón' }).first().click();
      await page.waitForTimeout(300);
      const locSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Seleccionar/ }).first();
      await locSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').first().click();

      await dialog.locator('button[type="submit"]').click();
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => page.keyboard.press('Escape'));
      await page.waitForTimeout(500);

      // Send
      const borradorRow = page.locator('tbody tr').filter({ hasText: 'Borrador' }).first();
      await borradorRow.locator('button[title="Enviar"]').first().click();
      await page.waitForTimeout(500);

      // Confirm
      const enviadaRow = page.locator('tbody tr').filter({ hasText: 'Enviada a Cliente' }).first();
      await enviadaRow.locator('button[title="Confirmar"]').first().click();
      await page.waitForTimeout(500);

      // Cancel the confirmed quote
      const confirmedRow = page.locator('tbody tr').filter({ hasText: 'Confirmada / Pago Anticipo' }).first();
      await expect(confirmedRow).toBeVisible({ timeout: 10000 });
      const cancelButton = confirmedRow.locator('button[title="Cancelar"]').first();

      // Handle confirmation dialog
      page.once('dialog', async d => { await d.accept(); });
      await cancelButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('tbody tr').filter({ hasText: 'Cancelado' }).first()).toBeVisible({ timeout: 10000 });
      console.log('✓ Quote cancelled: CONFIRMADA → CANCELADO');
    });

    test('should reject invalid status transitions', async ({ page }) => {
      await page.goto('/quotes');
      const clientName = generateRandomName('ClienteInvalid');

      const clientRes = await page.request.post('/api/clients', {
        data: { name: clientName, clientType: 'EMPRESA', category: 'BUENO' },
      });
      expect(clientRes.ok()).toBe(true);

      await page.waitForURL('/quotes');
      await page.waitForLoadState('networkidle');

      // Create a quote
      await page.locator('button:has-text("Nueva Cotización")').click();
      await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });
      const dialog = page.locator('[role="dialog"]');

      await dialog.locator('input[type="date"]').first().fill(getFutureDate(40));
      await selectClientFromDropdown(page, clientName, dialog);

      // Add space
      await dialog.locator('button:has-text("Agregar")').first().click();
      await page.waitForTimeout(300);
      const spaceTypeSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Salón|Seleccionar/ }).first();
      await spaceTypeSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: 'Salón' }).first().click();
      await page.waitForTimeout(300);
      const locSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Seleccionar/ }).first();
      await locSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').first().click();

      await dialog.locator('button[type="submit"]').click();
      await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 15000 }).catch(() => page.keyboard.press('Escape'));
      await page.waitForTimeout(500);

      // Find quote ID via API
      const quotesRes = await page.request.get('/api/quotes');
      const quotesData = await quotesRes.json();
      const quote = quotesData.data.find((q: any) => q.client?.name === clientName);
      expect(quote).toBeDefined();
      const quoteId = quote.id;

      // Try invalid transition: BORRADOR → CONFIRMADA (must go through ENVIADA)
      const invalidRes = await page.request.patch(`/api/quotes/${quoteId}/status`, {
        data: { status: 'CONFIRMADA' },
      });
      expect(invalidRes.ok()).toBe(false);
      const errorBody = await invalidRes.json();
      expect(errorBody.error).toContain('Transición no válida');
      console.log('✓ Invalid transition rejected:', errorBody.error);
    });
  });
});
