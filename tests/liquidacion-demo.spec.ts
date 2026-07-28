import { test, expect, loginAsAdmin, selectClientFromDropdown, generateRandomName, getFutureDate } from "./helpers";

/**
 * DEMO EN VIDEO - Proceso de Liquidación
 *
 * Graba un recorrido completo del flujo solicitado por el cliente (item 15):
 * crear una cotización, cambiar su estado (Borrador -> Enviada -> Confirmada
 * -> En Ejecución) y finalmente realizar la Liquidación del evento, mostrando
 * el control de mobiliario, costos de daños y el cambio final a "Finalizada".
 *
 * El video queda en test-results/.../video.webm (Playwright lo genera porque
 * este spec habilita `video: 'on'`).
 */
test.use({ video: "on", viewport: { width: 1440, height: 900 } });

test.describe("Demo: Proceso de Liquidación", () => {
  test("recorrido completo: crear cotización, cambiar estados y liquidar evento", async ({ page }) => {
    test.setTimeout(180000);

    await loginAsAdmin(page);

    const clientName = generateRandomName("ClienteDemoLiquidacion");
    const clientRes = await page.request.post("/api/clients", {
      data: { name: clientName, clientType: "PARTICULAR", category: "BUENO" },
    });
    expect(clientRes.ok()).toBe(true);

    await page.goto("/quotes");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // ── 1. Crear cotización ────────────────────────────────────────────────
    await page.locator('button:has-text("Nueva Cotización")').click();
    await page.waitForSelector('[role="dialog"]', { state: "visible" });
    const dialog = page.locator('[role="dialog"]');

    await dialog.locator('input[type="date"]').first().fill(getFutureDate(2));
    await page.waitForTimeout(300);

    await selectClientFromDropdown(page, clientName, dialog);
    await page.waitForTimeout(500);

    // Agregar un espacio (Salón)
    await dialog.locator('button:has-text("Agregar")').first().click();
    await page.waitForTimeout(300);
    const spaceTypeSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Salón|Seleccionar/ }).first();
    await spaceTypeSelect.click();
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
    await page.locator('[role="listbox"] [role="option"]').filter({ hasText: "Salón" }).first().click();
    await page.waitForTimeout(300);
    const locSelect = dialog.locator('[role="combobox"]').filter({ hasText: /Seleccionar/ }).first();
    await locSelect.click();
    await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
    await page.locator('[role="listbox"] [role="option"]').first().click();
    await page.waitForTimeout(500);

    // Agregar un item de mobiliario para mostrar el control de retorno luego
    await dialog.locator('button:has-text("Mobiliario")').click();
    await page.waitForTimeout(500);
    const furniturePanel = dialog.locator('[role="tabpanel"]').filter({ visible: true });
    const furnitureButton = furniturePanel.locator('button[type="button"]').first();
    if (await furnitureButton.isVisible().catch(() => false)) {
      await furnitureButton.click();
      // Se abre el dialogo de mobiliario (cantidades por día): cargar una cantidad y confirmar
      const furnitureDialog = page.locator('[role="dialog"]').filter({ hasText: "cantidad para cada día" });
      await expect(furnitureDialog).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);
      await furnitureDialog.locator('input[type="number"]').first().fill("2");
      await page.waitForTimeout(300);
      await furnitureDialog.locator("button").filter({ hasText: /^Agregar$/ }).click();
      await expect(furnitureDialog).toBeHidden({ timeout: 5000 });
      await page.waitForTimeout(500);
    }

    // Guardar cotización
    await dialog.locator('button[type="submit"]').click();
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 15000 }).catch(() => page.keyboard.press("Escape"));
    await page.waitForTimeout(800);

    // ── 2. Cambiar estado: Borrador -> Enviada ─────────────────────────────
    const quoteRow = page.locator("tbody tr").filter({ hasText: clientName }).first();
    await expect(quoteRow).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);
    await quoteRow.locator('button[title="Enviar"]').first().click();

    // Confirmar el dialogo "Registrar Envío" (sin mail: solo marca como enviada)
    const sendDialog = page.locator('[role="dialog"]').filter({ hasText: "Registrar Envío" });
    await expect(sendDialog).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);
    await sendDialog.locator('button:has-text("Registrar envío")').click();
    await expect(sendDialog).toBeHidden({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // ── 3. Cambiar estado: Enviada -> Confirmada (con anticipo) ────────────
    await expect(quoteRow.locator("text=Enviada a Cliente")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);
    await quoteRow.locator('button[title="Confirmar"]').first().click();
    await page.waitForSelector('[role="dialog"]', { state: "visible", timeout: 5000 });
    await page.waitForTimeout(800);

    const advanceDialog = page.locator('[role="dialog"]').filter({ hasText: "Confirmar Cotización" });
    await advanceDialog.locator('button:has-text("Total")').click();
    await page.waitForTimeout(500);
    await advanceDialog.locator('button:has-text("Confirmar")').click();
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await expect(quoteRow.locator("text=Confirmada / Pago Anticipo")).toBeVisible({ timeout: 10000 });

    // ── 4. Abrir detalle y cambiar estado: Confirmada -> En Ejecución ──────
    await page.waitForTimeout(800);
    await quoteRow.click();
    const detailDialog = page.locator('[role="dialog"]').filter({ hasText: "Detalle de Cotización" });
    await expect(detailDialog).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    await detailDialog.locator('button:has-text("Poner en ejecución")').click();
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    await expect(quoteRow.locator("text=En Ejecución")).toBeVisible({ timeout: 10000 });

    // ── 5. Liquidar el evento ───────────────────────────────────────────────
    await page.waitForTimeout(800);
    await quoteRow.click();
    const detailDialogEjecucion = page.locator('[role="dialog"]').filter({ hasText: "Detalle de Cotización" });
    await expect(detailDialogEjecucion).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);
    await detailDialogEjecucion.locator('button:has-text("Liquidar")').click();

    const liquidationDialog = page.locator('[role="dialog"]').filter({ hasText: "Liquidar Evento" });
    await expect(liquidationDialog).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Marcar el primer item como "Dañado" para mostrar el control de costos
    const firstItemRow = liquidationDialog.locator("tbody tr").first();
    if (await firstItemRow.isVisible().catch(() => false)) {
      const statusSelect = firstItemRow.locator('[role="combobox"]').first();
      await statusSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: "Dañado" }).first().click();
      await page.waitForTimeout(500);

      await firstItemRow.locator('input[placeholder="Descripción de daño..."]').fill("Mancha en la tela, requiere limpieza profunda");
      await page.waitForTimeout(300);
      await firstItemRow.locator('input[type="number"]').fill("150");
      await page.waitForTimeout(800);

      // Reflejar el daño en el estado general de devolución
      const generalStatusSelect = liquidationDialog.locator('[role="combobox"]').first();
      await generalStatusSelect.click();
      await page.waitForSelector('[role="listbox"]', { timeout: 5000 });
      await page.locator('[role="listbox"] [role="option"]').filter({ hasText: "Con Daños" }).first().click();
      await page.waitForTimeout(500);
    }

    // Observaciones generales
    await liquidationDialog.locator('input[placeholder="Observaciones generales de la liquidación"]').fill("Evento finalizado sin incidentes mayores. Mobiliario revisado.");
    await page.waitForTimeout(1000);

    // Guardar liquidación
    await liquidationDialog.locator('button:has-text("Guardar Liquidación")').click();
    await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // ── 6. Verificar resultado: cotización "Finalizada / Liquidada" ───────
    await expect(quoteRow.locator("text=Finalizada / Liquidada")).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    console.log("✓ Demo de liquidación completada");
  });
});
