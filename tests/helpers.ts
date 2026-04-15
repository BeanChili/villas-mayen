import { test as base, Page, Locator, expect } from '@playwright/test';

// Export expect for tests
export { expect };

// Simple helper functions (not fixtures)
export const loginAsAdmin = async (page: Page) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  // Wait for form to be ready AND React to hydrate (prevents native GET form submit)
  await page.waitForSelector('form');
  // Wait for the data-hydrated attribute set by useEffect — guarantees React has mounted.
  // Falls back to a 2s pause if the attribute doesn't appear (e.g., cached page pre-recompilation).
  try {
    await page.waitForSelector('form[data-hydrated="true"]', { timeout: 5000 });
  } catch {
    // If not hydrated via attribute, wait longer for JS to take over
    await page.waitForTimeout(2000);
  }
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  // Wait for redirect away from login (retry once if native form submission occurred)
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  } catch {
    // If still on login (possibly native GET submit), go back to login and try again
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('form[data-hydrated="true"]', { timeout: 10000 });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });
  }
  await page.waitForLoadState('networkidle');
};

export const loginAs = async (page: Page, username: string, password: string) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('form');
  // Wait for the data-hydrated attribute set by useEffect — guarantees React has mounted.
  // Falls back to a 2s pause if the attribute doesn't appear.
  try {
    await page.waitForSelector('form[data-hydrated="true"]', { timeout: 5000 });
  } catch {
    await page.waitForTimeout(2000);
  }
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from login (retry once if native form submission occurred)
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  } catch {
    // If still on login (possibly native GET submit), go back to login and try again
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('form[data-hydrated="true"]', { timeout: 10000 });
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });
  }
  await page.waitForLoadState('networkidle');
};

export const navigateTo = async (page: Page, path: string) => {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
};

export const waitForDialog = async (page: Page): Promise<Locator> => {
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible' });
  return dialog;
};

export const clickSidebar = async (page: Page, item: string) => {
  // Dashboard page has no sidebar — navigate to an internal page first if needed
  const currentUrl = page.url();
  if (currentUrl.endsWith('/') || currentUrl.endsWith('/login')) {
    // Map sidebar items to their routes
    const routes: Record<string, string> = {
      'Dashboard': '/',
      'Reservaciones': '/reservations',
      'Clientes': '/clients',
      'Cotizaciones': '/quotes',
      'Inventario': '/inventory',
      'Gastos': '/expenses',
      'Eventos': '/events',
      'Catálogos': '/catalog',
      'Configuración': '/settings',
    };
    const route = routes[item];
    if (route) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      return;
    }
  }
  await page.click(`nav a:has-text("${item}")`);
  await page.waitForLoadState('networkidle');
};

// Date utilities
export const getFutureDate = (daysAhead: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
};

export const getPastDate = (daysBack: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().split('T')[0];
};

// Generate random test data
export const generateRandomName = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};

export const generateRandomEmail = (): string => {
  return `test_${Date.now()}@example.com`;
};

export const generateRandomPhone = (): string => {
  return `55${Math.floor(10000000 + Math.random() * 90000000)}`;
};

// Test users
export const testUsers = {
  admin: { username: 'admin', password: 'admin123', role: 'ADMIN' },
  recepcionista: { username: 'recepcionista', password: 'recepcionista123', role: 'RECEPCIONISTA' },
  finanzas: { username: 'finanzas', password: 'finanzas123', role: 'FINANZAS' },
  almacen: { username: 'almacen', password: 'almacen123', role: 'ALMACEN' },
  visual: { username: 'visual', password: 'visual123', role: 'VISUAL' },
};

// Timeout helpers
export const waitForResponse = async (page: Page, urlPattern: string, timeout = 30000) => {
  return page.waitForResponse(urlPattern, { timeout });
};

export const waitForElement = async (page: Page, selector: string, timeout = 10000) => {
  return page.waitForSelector(selector, { timeout });
};

// UI helpers
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    COTIZADO: '#9ca3af',
    ANTICIPO: '#fbbf24',
    DEPOSITO: '#3b82f6',
    SALDO: '#f97316',
    TOTAL_CANCELADO: '#22c55e',
    EN_EJECUCION: '#a855f7',
    FINALIZADO: '#64748b',
    FINALIZADO_COBRO: '#10b981',
  };
  return colors[status] || '#9ca3af';
};

export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    ADMIN: 'Administrador',
    RECEPCIONISTA: 'Recepcionista',
    FINANZAS: 'Finanzas',
    ALMACEN: 'Almacén',
    ENCARGADO_EVENTO: 'Encargado de Evento',
    USUARIO_SISTEMA: 'Usuario Sistema',
    VISUAL: 'Visual',
  };
  return labels[role] || role;
};

export const getClientTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    PARTICULAR: 'Particular',
    EMPRESA: 'Empresa',
    IGLESIA: 'Iglesia',
    INSTITUCION: 'Institución',
  };
  return labels[type] || type;
};

export const getLocationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    FREE_AREA: 'Área Libre',
    DINING_ROOM: 'Comedor',
    HALL: 'Salón',
    ROOM: 'Habitación',
    GARDEN: 'Jardín',
  };
  return labels[type] || type;
};

export const getScheduleLabel = (schedule: string): string => {
  const labels: Record<string, string> = {
    MANANA: 'Mañana',
    TARDE: 'Tarde',
    NOCHE: 'Noche',
  };
  return labels[schedule] || schedule;
};

// Base test - just re-export playwright's test
export const test = base;