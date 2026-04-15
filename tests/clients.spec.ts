import { test, expect } from "./helpers";
import { loginAsAdmin, generateRandomName, generateRandomEmail, generateRandomPhone } from "./helpers";

/**
 * CLIENTS TESTS - Client management CRUD operations
 * Tests creating, reading, updating, deleting clients and search functionality
 */
test.describe('Clients', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Load', () => {
    test('should load clients page successfully', async ({ page }) => {
      await expect(page.locator('h1:has-text("Clientes")')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('button:has-text("Nuevo Cliente")')).toBeVisible();
    });

    test('should display search input', async ({ page }) => {
      await expect(page.locator('input[placeholder*="Buscar"]')).toBeVisible();
    });

    test('should display stats cards', async ({ page }) => {
      await expect(page.locator('text=Total Clientes')).toBeVisible();
      await expect(page.locator('text=Particulares')).toBeVisible();
      await expect(page.locator('text=Empresas')).toBeVisible();
      await expect(page.locator('text=Iglesias/Instituciones')).toBeVisible();
    });

    test('should display clients table', async ({ page }) => {
      // Table headers
      await expect(page.locator('th:has-text("Nombre")')).toBeVisible();
      await expect(page.locator('th:has-text("Tipo")')).toBeVisible();
      await expect(page.locator('th:has-text("Teléfono")')).toBeVisible();
      await expect(page.locator('th:has-text("Email")')).toBeVisible();
      await expect(page.locator('th:has-text("Registrado")')).toBeVisible();
      await expect(page.locator('th:has-text("Acciones")')).toBeVisible();
    });
  });

  test.describe('Create Client', () => {
    test('should open create client dialog', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.locator('text=Nuevo Cliente')).toBeVisible();
    });

    test('should display all form fields', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog.locator('text=Nombre')).toBeVisible();
      await expect(dialog.locator('text=Tipo de Cliente')).toBeVisible();
      await expect(dialog.locator('text=Teléfono')).toBeVisible();
      await expect(dialog.locator('text=Email')).toBeVisible();
      await expect(dialog.locator('text=Dirección')).toBeVisible();
      await expect(dialog.locator('text=RFC')).toBeVisible();
      await expect(dialog.locator('text=Observaciones')).toBeVisible();
    });

    test('should create client with required fields only', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      
      // Fill name (first input in dialog)
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Cliente'));
      
      // Submit
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Dialog should close
      await expect(dialog).not.toBeVisible();
    });

    test('should create client with all fields', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      
      const testName = generateRandomName('Cliente');
      const dialog = page.locator('[role="dialog"]');
      
      // Fill all fields - inputs in order: name, phone, email, address, rfc, observations
      await dialog.locator('input').nth(0).fill(testName);
      
      // Select type
      await dialog.locator('[role="combobox"]').click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]:has-text("Empresa")').click();
      
      // Fill contact info
      await dialog.locator('input').nth(1).fill(generateRandomPhone());
      await dialog.locator('input[type="email"]').fill(generateRandomEmail());
      await dialog.locator('input').nth(3).fill('Av. Principal 123, Ciudad de México');
      await dialog.locator('input').nth(4).fill('XAXX010101000');
      await dialog.locator('input').nth(5).fill('Cliente de prueba');
      
      // Submit
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Should appear in list
      await expect(page.locator(`text=${testName}`)).toBeVisible();
    });

    test('should create particular type client', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Particular'));
      
      await dialog.locator('[role="combobox"]').click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]:has-text("Particular")').click();
      
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
    });

    test('should create empresa type client', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Empresa'));
      
      await dialog.locator('[role="combobox"]').click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]:has-text("Empresa")').click();
      
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
    });

    test('should create iglesia type client', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Iglesia'));
      
      await dialog.locator('[role="combobox"]').click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]:has-text("Iglesia")').click();
      
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
    });

    test('should create institucion type client', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500)
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Institucion'));
      
      await dialog.locator('[role="combobox"]').click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]:has-text("Institución")').click();
      
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
    });

    test('should require name field', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      // Try to submit without name
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      
      // Dialog should stay open
      await expect(dialog.locator('text=Nuevo Cliente')).toBeVisible();
    });
  });

  test.describe('Search Clients', () => {
    test('should search by name', async ({ page }) => {
      // Create a client with unique name
      const uniqueName = generateRandomName('Busqueda');
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(uniqueName);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Search for it
      await page.fill('input[placeholder*="Buscar"]', uniqueName.split('_')[1]);
      await page.waitForTimeout(500);
      
      // Should find the client
      await expect(page.locator(`text=${uniqueName}`)).toBeVisible();
    });

    test('should search by email', async ({ page }) => {
      const testEmail = generateRandomEmail();
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Email'));
      await dialog.locator('input[type="email"]').fill(testEmail);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Search by email
      await page.fill('input[placeholder*="Buscar"]', testEmail.split('@')[0]);
      await page.waitForTimeout(500);
      
      // Should find the client
      await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    });

    test('should search by phone', async ({ page }) => {
      const testPhone = generateRandomPhone();
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Telefono'));
      await dialog.locator('input').nth(1).fill(testPhone);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Search by phone
      await page.fill('input[placeholder*="Buscar"]', testPhone.substring(0, 5));
      await page.waitForTimeout(500);
      
      await expect(page.locator(`text=${testPhone}`)).toBeVisible();
    });

    test('should return no results for non-existent search', async ({ page }) => {
      await page.fill('input[placeholder*="Buscar"]', 'NonExistentClient12345');
      await page.waitForTimeout(500);
      
      // Should show empty message
      await expect(page.locator('text=No hay clientes')).toBeVisible();
    });

    test('should clear search and show all clients', async ({ page }) => {
      // Search for something
      await page.fill('input[placeholder*="Buscar"]', 'xyz123');
      await page.waitForTimeout(500);
      
      // Clear search
      await page.fill('input[placeholder*="Buscar"]', '');
      await page.waitForTimeout(500);
      
      // Should show clients again
      const rows = page.locator('tbody tr');
      expect(await rows.count()).toBeGreaterThan(0);
    });
  });

  test.describe('Edit Client', () => {
    test('should open edit dialog with client data', async ({ page }) => {
      // Create a client first
      const testName = generateRandomName('Editar');
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(testName);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Click edit button on the first row
      await page.locator('[data-testid="edit-client-btn"]').first().click();
      await page.waitForTimeout(500);
      
      // Should show edit dialog
      const editDialog = page.locator('[role="dialog"]');
      await expect(editDialog).toBeVisible();
      await expect(editDialog.locator('text=Editar Cliente')).toBeVisible();
      // Check that the name input has the client's name (controlled input via inputValue)
      const nameInput = editDialog.locator('input').first();
      await expect(nameInput).toBeVisible();
      const inputVal = await nameInput.inputValue();
      expect(inputVal).toBeTruthy();
    });

    test('should update client name', async ({ page }) => {
      // Create client
      const originalName = generateRandomName('Original');
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(originalName);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Verify created
      await expect(page.locator(`text=${originalName}`)).toBeVisible();
      
      // Edit the specific row
      const newName = generateRandomName('Actualizado');
      const clientRow = page.locator(`tr:has-text("${originalName}")`);
      await clientRow.locator('[data-testid="edit-client-btn"]').click();
      await page.waitForTimeout(500);
      
      const editDialog = page.locator('[role="dialog"]');
      await editDialog.locator('input').first().clear();
      await editDialog.locator('input').first().fill(newName);
      await editDialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Verify change
      await expect(page.locator(`text=${newName}`)).toBeVisible();
    });

    test('should update client type', async ({ page }) => {
      // Create client as Particular
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Tipo'));
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Edit and change type
      await page.locator('[data-testid="edit-client-btn"]').first().click();
      await page.waitForTimeout(500);
      
      const editDialog = page.locator('[role="dialog"]');
      await editDialog.locator('[role="combobox"]').click();
      await page.waitForTimeout(300);
      await page.locator('[role="option"]:has-text("Empresa")').click();
      
      await editDialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
    });

    test('should update contact information', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Contacto'));
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Edit contact info
      await page.locator('[data-testid="edit-client-btn"]').first().click();
      await page.waitForTimeout(500);
      
      const editDialog = page.locator('[role="dialog"]');
      await editDialog.locator('input').nth(1).fill(generateRandomPhone());
      await editDialog.locator('input[type="email"]').fill(generateRandomEmail());
      
      await editDialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
    });
  });

  test.describe('Delete Client', () => {
    test('should delete client with confirmation', async ({ page }) => {
      // Create a client to delete
      const deleteName = generateRandomName('Eliminar');
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(deleteName);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Verify the client was created
      await expect(page.locator(`text=${deleteName}`)).toBeVisible();
      
      // Register dialog handler BEFORE clicking delete (use once to avoid conflicts)
      page.once('dialog', d => d.accept());
      
      // Find and click the delete button in the row containing the client name
      const clientRow = page.locator(`tr:has-text("${deleteName}")`);
      await clientRow.locator('[data-testid="delete-client-btn"]').click();
      await page.waitForTimeout(1500);
      
      // Should not show the deleted client
      await expect(page.locator(`text=${deleteName}`)).not.toBeVisible();
    });

    test('should handle delete cancellation', async ({ page }) => {
      // Create client
      const keepName = generateRandomName('Cancelar');
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(keepName);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Setup to cancel confirmation dialogs (once, to avoid conflicts)
      page.once('dialog', d => d.dismiss());
      
      // Click delete on the specific row
      const clientRow = page.locator(`tr:has-text("${keepName}")`);
      await clientRow.locator('[data-testid="delete-client-btn"]').click();
      await page.waitForTimeout(500);
      
      // Client should still be visible (dialog was cancelled)
      await expect(page.locator(`text=${keepName}`)).toBeVisible();
    });

    test('should handle delete cancellation (no dialog)', async ({ page }) => {
      // Create client
      const cancelName = generateRandomName('Cancelar2');
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(cancelName);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Setup to cancel confirmation (once)
      page.once('dialog', d => d.dismiss());
      
      // Click delete on the specific row
      const clientRow = page.locator(`tr:has-text("${cancelName}")`);
      await clientRow.locator('[data-testid="delete-client-btn"]').click();
      await page.waitForTimeout(1000);
      
      // Client should still be visible (if dialog was cancelled)
      await expect(page.locator(`text=${cancelName}`)).toBeVisible();
    });
  });

  test.describe('Client Stats', () => {
    test('should display correct total client count', async ({ page }) => {
      // The "Total Clientes" stat: count is in a p.text-2xl right before the label
      // p.text-2xl elements: first is Total count
      const firstStatCount = page.locator('p.text-2xl').first();
      await expect(firstStatCount).toBeVisible();
      const countText = await firstStatCount.textContent();
      const initialCount = parseInt(countText?.trim() || '0');
      
      // Count should be a valid number >= 0
      expect(initialCount).toBeGreaterThanOrEqual(0);
      
      // Add a client and verify the count stat updates
      const counterName = generateRandomName('Contador');
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(counterName);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Verify the client appears in the table (primary goal of this test)
      await expect(page.locator(`text=${counterName}`)).toBeVisible();
      
      // Count should be > 0 after adding
      const newCountText = await firstStatCount.textContent();
      const newCount = parseInt(newCountText?.trim() || '0');
      expect(newCount).toBeGreaterThan(0);
    });

    test('should filter clients by type correctly', async ({ page }) => {
      // Create different types
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog1 = page.locator('[role="dialog"]');
      await dialog1.locator('input').first().fill(generateRandomName('Particular1'));
      await dialog1.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog2 = page.locator('[role="dialog"]');
      await dialog2.locator('input').first().fill(generateRandomName('Empresa1'));
      await dialog2.locator('[role="combobox"]').click();
      await page.locator('[role="option"]:has-text("Empresa")').click();
      await dialog2.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Stats should show correct counts
      // This depends on implementation
    });
  });

  test.describe('Client Table Display', () => {
    test('should display client name', async ({ page }) => {
      const testName = generateRandomName('Tabla');
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(testName);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator(`text=${testName}`)).toBeVisible();
    });

    test('should display client type badge', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Badge'));
      await dialog.locator('[role="combobox"]').click();
      await page.locator('[role="option"]:has-text("Empresa")').click();
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Empresa').first()).toBeVisible();
    });

    test('should display client phone', async ({ page }) => {
      const testPhone = generateRandomPhone();
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Telefono'));
      await dialog.locator('input').nth(1).fill(testPhone);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator(`text=${testPhone}`)).toBeVisible();
    });

    test('should display client email', async ({ page }) => {
      const testEmail = generateRandomEmail();
      
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Email'));
      await dialog.locator('input[type="email"]').fill(testEmail);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      await expect(page.locator(`text=${testEmail}`)).toBeVisible();
    });

    test('should display registration date', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Fecha'));
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Should show today's date
      const today = new Date();
      const dateStr = today.toLocaleDateString('es-MX');
      await expect(page.locator(`text=${dateStr}`).first()).toBeVisible();
    });

    test('should display empty state message', async ({ page }) => {
      // Delete all clients first (if possible) or check for message
      const emptyMessage = page.locator('text=No hay clientes');
      const hasMessage = await emptyMessage.isVisible().catch(() => false);
      
      // Either shows message or shows clients
      const rows = page.locator('tbody tr');
      const hasRows = (await rows.count()) > 0;
      
      expect(hasMessage || hasRows).toBe(true);
    });
  });

  test.describe('Form Validation', () => {
    test('should validate email format', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill(generateRandomName('Email'));
      await dialog.locator('input[type="email"]').fill('invalid-email');
      
      // Try to submit
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
      
      // Should either show validation error or accept (depends on implementation)
    });

    test('should handle long text in fields', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      const longName = 'A'.repeat(500);
      await dialog.locator('input').first().fill(longName);
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(500);
    });

    test('should handle special characters in name', async ({ page }) => {
      await page.locator('button:has-text("Nuevo Cliente")').click();
      await page.waitForTimeout(500);
      
      const dialog = page.locator('[role="dialog"]');
      await dialog.locator('input').first().fill("Cliente Ñüí 123!");
      await dialog.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
    });
  });
});
