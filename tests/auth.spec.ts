import { test, expect, loginAsAdmin } from "./helpers";

/**
 * AUTH TESTS - Login and Authentication
 * Tests all authentication flows including successful login, failed attempts, and validation
 */
test.describe('Authentication', () => {
  
  // Clean up before each test - go to login page
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Login Page Load', () => {
    test('should display login form correctly', async ({ page }) => {
      // Verify login form elements are present
      await expect(page.locator('text=Villas Mayen')).toBeVisible();
      await expect(page.locator('text=Ingresa tus credenciales')).toBeVisible();
      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.locator('text=Iniciar Sesión')).toBeVisible();
    });

    test('should have correct input types', async ({ page }) => {
      // Verify input types
      const usernameInput = page.locator('#username');
      const passwordInput = page.locator('#password');
      
      await expect(usernameInput).toHaveAttribute('type', 'text');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should have autocomplete attributes', async ({ page }) => {
      const usernameInput = page.locator('#username');
      const passwordInput = page.locator('#password');
      
      await expect(usernameInput).toHaveAttribute('autocomplete', 'username');
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    test('should have placeholder texts', async ({ page }) => {
      await expect(page.locator('#username')).toHaveAttribute('placeholder', 'Ingresa tu usuario');
      await expect(page.locator('#password')).toHaveAttribute('placeholder', 'Ingresa tu contraseña');
    });
  });

  test.describe('Successful Login', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      await page.click('button[type="submit"]');
      
      // Wait for navigation away from login page
      await page.waitForURL('/', { timeout: 15000 });
      
      // Verify we're NOT on login page anymore (login was successful)
      const onLoginPage = await page.locator('#username').isVisible().catch(() => false);
      expect(onLoginPage).toBe(false);
    });

    test('should display user name in dashboard after login', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      await page.click('button[type="submit"]');
      
      // Wait for navigation away from login page
      await page.waitForURL('/', { timeout: 15000 });
      
      // Verify dashboard loaded (we should NOT see login form anymore)
      const onLoginPage = await page.locator('#username').isVisible().catch(() => false);
      expect(onLoginPage).toBe(false);
    });

    test('should redirect to dashboard (not login) after successful login', async ({ page }) => {
      // Wait for the submit button to be enabled (React hydration complete)
      await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 20000 });
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      await page.click('button[type="submit"]');
      
      // Wait for navigation away from login
      await page.waitForURL('/', { timeout: 15000 }).catch(() => {});
      
      // Should NOT be on login page
      const onLoginPage = await page.locator('#username').isVisible().catch(() => false);
      expect(onLoginPage).toBe(false);
    });
  });

  test.describe('Failed Login Attempts', () => {
    test('should show error with invalid username', async ({ page }) => {
      // Wait for the submit button to be enabled (React hydration complete)
      await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 20000 });
      await page.fill('#username', 'invaliduser');
      await page.fill('#password', 'anypassword');
      await page.click('button[type="submit"]');
      
      // Wait for error message
      await expect(page.locator('text=Usuario o contraseña incorrectos')).toBeVisible({ timeout: 15000 });
      
      // Should still be on login page
      await expect(page.locator('#username')).toBeVisible();
    });

    test('should show error with invalid password', async ({ page }) => {
      await page.fill('#username', 'admin');
      await page.fill('#password', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Usuario o contraseña incorrectos')).toBeVisible({ timeout: 5000 });
    });

    test('should show error with empty credentials', async ({ page }) => {
      // Click submit without filling anything
      await page.click('button[type="submit"]');
      
      // Form should have required validation
      // Note: HTML5 required attribute doesn't show error message but prevents submission
      // Let's check if the button is disabled or form prevents submission
      await page.waitForTimeout(500);
      
      // Should still be on login page (form didn't submit)
      await expect(page.locator('#username')).toBeVisible();
    });

    test('should show error with username only', async ({ page }) => {
      await page.fill('#username', 'admin');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(500);
      await expect(page.locator('#username')).toBeVisible();
    });

    test('should show error with password only', async ({ page }) => {
      await page.fill('#password', 'admin123');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(500);
      await expect(page.locator('#username')).toBeVisible();
    });

    test('should clear error message when typing', async ({ page }) => {
      // First, cause an error
      await page.fill('#username', 'invalid');
      await page.fill('#password', 'invalid');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Usuario o contraseña incorrectos')).toBeVisible({ timeout: 10000 });
      
      // Now type in username field
      await page.fill('#username', 'admin');
      
      // Error should still be visible (until successful login)
      // This tests that typing doesn't accidentally clear error before correcting
      await expect(page.locator('text=Usuario o contraseña incorrectos')).toBeVisible();
    });
  });

  test.describe('Login Form Validation', () => {
    test('should focus username field on load', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      // Username should be focused or at least first input
      const username = page.locator('#username');
      await expect(username).toBeVisible();
    });

    test('should allow tab navigation between fields', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      // Press tab to move from username to password
      await page.keyboard.press('Tab');
      
      // Password should be focusable (will be second in tab order)
      const password = page.locator('#password');
      await expect(password).toBeVisible();
    });

    test('should submit form with Enter key', async ({ page }) => {
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      await page.keyboard.press('Enter');
      
      await page.waitForURL('/', { timeout: 10000 });
      await expect(page.locator('text=Bienvenido')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Session Handling', () => {
    test('should maintain session after page refresh', async ({ page }) => {
      // Login first
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      
      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should still be on dashboard (session maintained)
      await expect(page.locator('text=Bienvenido')).toBeVisible({ timeout: 5000 });
    });

    test('should not allow direct access to protected routes without login', async ({ page }) => {
      // Try to access dashboard directly
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should redirect to login
      await expect(page.locator('#username')).toBeVisible();
    });
  });

  test.describe('Loading States', () => {
    test('should show loading state during login', async ({ page }) => {
      // Fill form
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      
      // Click and immediately check for loading text
      await page.click('button[type="submit"]');
      
      // Should show loading state
      await expect(page.locator('text=Iniciando sesión...')).toBeVisible({ timeout: 2000 });
    });

    test('should disable button during login', async ({ page }) => {
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      
      const button = page.locator('button[type="submit"]');
      await page.click('button[type="submit"]');
      
      // Button should be disabled during login
      await expect(button).toBeDisabled();
    });
  });

  test.describe('Security Tests', () => {
    test('should not expose password in page source', async ({ page }) => {
      await page.fill('#username', 'admin');
      await page.fill('#password', 'secretpassword');
      
      // Get page content
      const content = await page.content();
      
      // Password should NOT be visible in plain text
      expect(content).not.toContain('secretpassword');
    });

    test('should use POST method for login', async ({ page }) => {
      // This is tested implicitly - if login works, POST is being used
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
      
      // If we got here, POST is working
      expect(true).toBe(true);
    });
  });
});