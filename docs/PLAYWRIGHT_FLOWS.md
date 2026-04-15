# Playwright Test Flows - Villas Mayen

## Overview
This document describes all user flows in the Villas Mayen application for automated testing with Playwright.

**Base URL:** `http://localhost:3001` (dev server)  
**Authenticated Base URL:** After login, redirect to `http://localhost:3001/`

---

## 1. Login Flow

### 1.1 Successful Login
```
URL: /login
Steps:
1. Navigate to /login
2. Fill username input with "admin"
3. Fill password input with "admin123"
4. Click "Iniciar Sesión" button
5. Wait for redirect to dashboard (/)
6. Verify dashboard loads with "Bienvenido" text
```

### 1.2 Failed Login (Invalid Credentials)
```
URL: /login
Steps:
1. Navigate to /login
2. Fill username input with "invalid"
3. Fill password input with "wrongpass"
4. Click "Iniciar Sesión" button
5. Verify error message appears: "Usuario o contraseña incorrectos"
6. Verify still on login page
```

### 1.3 Empty Credentials
```
URL: /login
Steps:
1. Navigate to /login
2. Click "Iniciar Sesión" button without filling fields
3. Verify form validation prevents submission (required fields)
```

---

## 2. Dashboard Flow

### 2.1 Dashboard Load
```
URL: /
Steps:
1. Ensure logged in (complete login flow first)
2. Navigate to /
3. Wait for dashboard content to load
4. Verify presence of:
   - "Bienvenido" text
   - Stats cards: "Reservaciones del Mes", "Eventos Hoy", "Clientes Nuevos", "Gastos del Mes"
   - Quick actions: "Ver Reservaciones", "Ver Clientes", "Ver Cotizaciones"
5. Verify sidebar navigation is visible
```

### 2.2 Navigation from Dashboard
```
URL: /
Steps:
1. On dashboard, click "Ver Reservaciones" card
2. Verify URL changes to /reservations
3. Go back to dashboard
4. Click "Ver Clientes" card
5. Verify URL changes to /clients
6. Go back to dashboard
7. Click "Ver Cotizaciones" card
8. Verify URL changes to /quotes
```

---

## 3. Navigation Flow

### 3.1 Sidebar Navigation
```
Steps:
1. Ensure logged in
2. From any dashboard page, verify sidebar contains:
   - Dashboard (/)
   - Reservaciones (/reservations)
   - Clientes (/clients)
   - Cotizaciones (/quotes)
   - Inventario (/inventory)
   - Gastos (/expenses)
   - Eventos (/events)
   - Configuración (/settings)
3. Click each sidebar item and verify navigation works
```

### 3.2 Logout Flow
```
URL: Any authenticated page
Steps:
1. Click user menu/logout button in sidebar
2. Verify redirect to /login
3. Verify session is cleared
```

---

## 4. Reservations (Calendario) Flow

### 4.1 Reservations Page Load
```
URL: /reservations
Steps:
1. Navigate to /reservations
2. Wait for calendar to load
3. Verify presence of:
   - "Reservaciones" header
   - "Nueva Reservación" button
   - Calendar grid with day names (Dom, Lun, Mar, Mié, Jue, Vie, Sáb)
   - Month navigation (prev/next arrows)
   - Legend showing status colors
```

### 4.2 Create New Reservation (Happy Path)
```
URL: /reservations
Steps:
1. Click "Nueva Reservación" button
2. Verify dialog opens with title "Nueva Reservación"
3. Select a client from dropdown
4. Select location type (e.g., "HALL")
5. Select specific location
6. Select start date
7. Select end date
8. Select at least one schedule (Mañana, Tarde, or Noche)
9. Optionally enter total amount
10. Click "Crear" button
11. Verify dialog closes
12. Verify new reservation appears on calendar
```

### 4.3 Create Reservation - Conflict Detection
```
URL: /reservations
Precondition: One reservation already exists for a location
Steps:
1. Click "Nueva Reservación" button
2. Select same location as existing reservation
3. Select overlapping dates
4. Select same schedule
5. Click "Crear" button
6. Verify error message: "Ya existe una reservación para este espacio"
```

### 4.4 View Reservation Details
```
URL: /reservations
Precondition: At least one reservation exists
Steps:
1. Click on a reservation in the calendar
2. Verify detail dialog opens
3. Verify shows: client name, location, dates, status, amounts
4. Click outside or close button to close dialog
```

### 4.5 Navigate Calendar Months
```
URL: /reservations
Steps:
1. On current month view
2. Click left arrow to go to previous month
3. Verify month/year changes
4. Verify calendar updates with new month data
5. Click right arrow to go to next month
6. Verify month/year changes back
```

---

## 5. Clients Flow

### 5.1 Clients Page Load
```
URL: /clients
Steps:
1. Navigate to /clients
2. Wait for data to load
3. Verify presence of:
   - "Clientes" header
   - "Nuevo Cliente" button
   - Search input
   - Stats cards showing client counts
   - Table/list of clients
```

### 5.2 Create New Client
```
URL: /clients
Steps:
1. Click "Nuevo Cliente" button
2. Verify dialog opens with title "Nuevo Cliente"
3. Fill name field
4. Select client type (Particular, Empresa, Iglesia, Institución)
5. Optionally fill phone, email, address, RFC
6. Click "Crear" button
7. Verify dialog closes
8. Verify new client appears in list
```

### 5.3 Edit Client
```
URL: /clients
Precondition: At least one client exists
Steps:
1. Find a client in the list
2. Click edit (pencil) button
3. Verify dialog opens with "Editar Cliente" title
4. Verify form is pre-filled with client data
5. Change some field
6. Click "Actualizar" button
7. Verify dialog closes
8. Verify changes are reflected in the list
```

### 5.4 Delete Client
```
URL: /clients
Precondition: At least one client exists
Steps:
1. Find a client in the list
2. Click delete (trash) button
3. Verify confirmation dialog appears
4. Confirm deletion
5. Verify client is removed from list
```

### 5.5 Search Clients
```
URL: /clients
Precondition: Multiple clients exist
Steps:
1. Type in search input
2. Verify list filters in real-time
3. Search by name
4. Search by email
5. Search by phone
6. Verify search works correctly
```

---

## 6. Quotes (Cotizaciones) Flow

### 6.1 Quotes Page Load
```
URL: /quotes
Steps:
1. Navigate to /quotes
2. Wait for data to load
3. Verify presence of:
   - "Cotizaciones" header
   - "Nueva Cotización" button
   - Tabs or filters for status
   - List of quotes
```

### 6.2 Create New Quote
```
URL: /quotes
Steps:
1. Click "Nueva Cotización" button
2. Verify dialog/form opens
3. Fill client selection
4. Fill event date
5. Select location type and specific location
6. Select schedules
7. Add products/items
8. Enter notes
9. Save quote
10. Verify quote appears in list
```

### 6.3 View Quote Details
```
URL: /quotes
Precondition: At least one quote exists
Steps:
1. Click on a quote to view details
2. Verify detail view shows all quote information
3. Verify items/products are displayed
```

### 6.4 Change Quote Status
```
URL: /quotes
Precondition: At least one quote exists
Steps:
1. Find a quote
2. Change status (Borrador -> Enviada -> Aprobada -> Rechazada)
3. Verify status change is reflected
```

---

## 7. Inventory (Mobiliario) Flow

### 7.1 Inventory Page Load
```
URL: /inventory
Steps:
1. Navigate to /inventory
2. Wait for data to load
3. Verify presence of:
   - "Inventario" header
   - "Nuevo Mobiliario" button
   - Search input
   - Category filter
   - Status filter
   - Table of furniture items
```

### 7.2 Create Furniture Item
```
URL: /inventory
Steps:
1. Click "Nuevo Mobiliario" button
2. Fill form:
   - Inventory number
   - Name
   - Category (Sillas, Mesas, Manteles, etc.)
   - Purchase value
   - Depreciation rate
   - Status
   - Location
   - Purchase date
3. Click "Crear" button
4. Verify item appears in list
```

### 7.3 Edit Furniture
```
URL: /inventory
Precondition: At least one furniture item exists
Steps:
1. Click edit button on an item
2. Modify some field
3. Save changes
4. Verify changes reflected
```

### 7.4 Filter by Category
```
URL: /inventory
Precondition: Multiple categories exist
Steps:
1. Select a category filter
2. Verify list filters correctly
3. Clear filter
4. Verify all items show
```

---

## 8. Expenses Flow

### 8.1 Expenses Page Load
```
URL: /expenses
Steps:
1. Navigate to /expenses
2. Wait for data to load
3. Verify presence of:
   - "Gastos" header
   - "Nuevo Gasto" button
   - Search input
   - Category filter
   - List of expenses
```

### 8.2 Create Expense
```
URL: /expenses
Steps:
1. Click "Nuevo Gasto" button
2. Fill form:
   - Date
   - Category (Mantenimiento, Servicios, Sueldos, etc.)
   - Description
   - Amount
3. Click "Crear" button
4. Verify expense appears in list
```

### 8.3 Filter by Category
```
URL: /expenses
Steps:
1. Select category filter
2. Verify list filters correctly
3. Clear filter
4. Verify all expenses show
```

---

## 9. Events (Cierre de Eventos) Flow

### 9.1 Events Page Load
```
URL: /events
Steps:
1. Navigate to /events
2. Wait for data to load
3. Verify presence of:
   - "Eventos" header
   - List of reservations with status "EN_EJECUCION" or "FINALIZADO"
```

### 9.2 Create Event Closing
```
URL: /events
Precondition: At least one reservation exists with status "FINALIZADO"
Steps:
1. Find a finished reservation
2. Click to create event closing
3. Fill form:
   - Closing date
   - Return status (Completo, Con Daños, Con Pérdidas)
   - Observations
   - Damage cost (if applicable)
   - Loss cost (if applicable)
4. Add furniture items with their return status
5. Save closing
6. Verify closing appears in list
```

### 9.3 View Event Closing Details
```
URL: /events
Precondition: At least one event closing exists
Steps:
1. Click on an event closing
2. Verify detail view shows all closing information
3. Verify furniture items and their statuses are displayed
```

---

## 10. Settings (Usuarios) Flow

### 10.1 Settings Page Load
```
URL: /settings
Steps:
1. Navigate to /settings
2. Wait for data to load
3. Verify presence of:
   - "Configuración" header
   - "Nuevo Usuario" button
   - List of users
   - Role management interface
```

### 10.2 Create New User
```
URL: /settings
Steps:
1. Click "Nuevo Usuario" button
2. Fill form:
   - Name
   - Username
   - Password
   - Email
   - Phone
   - Role (Admin, Recepcionista, etc.)
3. Click "Crear" button
4. Verify user appears in list
```

### 10.3 Edit User
```
URL: /settings
Precondition: At least one user exists
Steps:
1. Click edit on a user
2. Modify role or other fields
3. Save changes
4. Verify changes reflected
```

### 10.4 Deactivate/Activate User
```
URL: /settings
Precondition: At least one user exists
Steps:
1. Find a user
2. Toggle active status
3. Verify status change reflected in UI
```

---

## 11. Cross-Flow Tests

### 11.1 Complete User Journey
```
Steps:
1. Login as admin
2. Go to Dashboard
3. Navigate to Clients -> Create new client
4. Navigate to Reservations -> Create reservation for client
5. Navigate to Quotes -> Create quote for client
6. Navigate to Inventory -> Check furniture
7. Navigate to Expenses -> Add expense
8. Logout
9. Verify on login page
```

### 11.2 Role-Based Access (if testing permissions)
```
Steps:
1. Login as Admin
2. Verify full access to all features

2. Login as Recepcionista
3. Verify read/write on reservations, clients, quotes
4. Verify limited/no access to settings

3. Login as Visual
4. Verify read-only access
```

---

## Test Data Requirements

### Users for Testing
- **Admin:** username: `admin`, password: `admin123`
- **Recepcionista:** username: `recepcionista`, password: `password123`
- **Visual:** username: `visual`, password: `password123`

### Sample Data
- Clients should exist in database
- Locations (Halls, Rooms, Gardens) should be seeded
- Products should be available for quotes

---

## Selectors Reference

### Common Selectors
- Login button: `button[type="submit"]`
- Dialog close: `[aria-label="Close"]` or `.close button`
- Form inputs: `input[name="fieldname"]`
- Table rows: `tbody tr`
- Sidebar links: `nav a[href="/path"]`

### Page-Specific Selectors
- Login: `#username`, `#password`
- Reservations: `.calendar-grid`, `[data-day="15"]`
- Clients: `input[placeholder="Buscar clientes..."]`
- Quotes: `.quote-item`
- Inventory: `select[name="category"]`
- Expenses: `select[name="category"]`
- Settings: `input[name="username"]`

---

## Notes

1. **Authentication**: All flows after login require session. Use login flow first.
2. **Data Setup**: Some tests require pre-existing data (clients, locations). Ensure database is seeded.
3. **Dialogs**: Many actions use dialog modals. Ensure proper wait for dialog to appear.
4. **Navigation**: Use Playwright's built-in wait for URL changes.
5. **Loading States**: Pages show loading spinners. Use `waitForLoadState` or wait for content.
6. **Error Handling**: Verify error messages appear for invalid operations.