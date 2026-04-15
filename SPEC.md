# Villas Mayen - Sistema de Gestión de Reservaciones y Eventos

## Especificación Técnica del Proyecto

**Fecha:** 9 Abril 2026  
**Versión:** 1.0  
**Framework:** Next.js 14+ (App Router) + TypeScript  
**UI:** Tailwind CSS + shadcn/ui  
**Base de Datos:** SQLite + Prisma ORM  
**Autenticación:** NextAuth.js

---

## 1. Estructura del Proyecto

```
villas-mayen/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Rutas de autenticación
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/        # Rutas del dashboard
│   │   │   ├── layout.tsx      # Layout con sidebar
│   │   │   ├── page.tsx        # Dashboard principal
│   │   │   ├── reservations/
│   │   │   ├── clients/
│   │   │   ├── quotes/
│   │   │   ├── inventory/
│   │   │   ├── expenses/
│   │   │   ├── events/
│   │   │   ├── catalog/
│   │   │   ├── settings/
│   │   │   └── reports/
│   │   ├── api/                # API routes
│   │   │   ├── auth/
│   │   │   ├── reservations/
│   │   │   ├── clients/
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                 # Componentes base shadcn
│   │   ├── shared/             # Componentes compartidos
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── ...
│   │   └── modules/            # Componentes por módulo
│   │       ├── reservations/
│   │       ├── clients/
│   │       └── ...
│   ├── lib/                    # Utilidades
│   │   ├── db.ts               # Prisma client
│   │   ├── auth.ts             # NextAuth config
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── types/                  # Tipos TypeScript
│   └── hooks/                  # Custom hooks
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   └── images/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## 2. Esquema de Base de Datos (Prisma)

### 2.1 Modelos Principales

```prisma
// Usuarios y Autenticación
model User {
  id            String    @id @default(cuid())
  name          String
  username      String    @unique
  password      String
  email         String?
  phone         String?
  role          Role      @default(VISUAL)
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  reservations  Reservation[]  // Reservaciones creadas por el usuario
}

enum Role {
  ADMIN
  RECEPCIONISTA
  FINANZAS
  ALMACEN
  ENCARGADO_EVENTO
  USUARIO_SISTEMA
  VISUAL
}

// Catálogos de Ubicaciones
model FreeArea {
  id          String   @id @default(cuid())
  name        String
  capacity    Int?
  description String?
  active      Boolean  @default(true)
  reservations Reservation[]
}

model DiningRoom {
  id          String   @id @default(cuid())
  name        String
  capacity    Int?
  description String?
  active      Boolean  @default(true)
  reservations Reservation[]
}

model Hall {
  id          String   @id @default(cuid())
  name        String
  capacity    Int?
  type        String?
  active      Boolean  @default(true)
  reservations Reservation[]
}

model Building {
  id      String   @id @default(cuid())
  name    String  // Belén, Bethel
  active  Boolean @default(true)
  floors  Floor[]
}

model Floor {
  id          String     @id @default(cuid())
  buildingId  String
  building    Building   @relation(fields: [buildingId], references: [id])
  level       Int        // 1 o 2
  rooms       Room[]
}

model Room {
  id          String   @id @default(cuid())
  floorId      String
  floor       Floor    @relation(fields: [floorId], references: [id])
  number      String
  capacity    Int?
  bedType     BedType?
  pricePerNight Decimal?
  status      RoomStatus @default(DISPONIBLE)
  photo       String?
  reservations Reservation[]
}

enum BedType {
  INDIVIDUAL
  MATRIMONIAL
  QUEEN
  KING
}

enum RoomStatus {
  DISPONIBLE
  RESERVADA
  OCUPADA
  MANTENIMIENTO
}

model Garden {
  id          String   @id @default(cuid())
  name        String
  capacity    Int?
  description String?
  active      Boolean  @default(true)
  reservations Reservation[]
}

// Clientes
model Client {
  id              String    @id @default(cuid())
  name            String
  clientType      ClientType
  phone           String?
  email           String?
  address         String?
  rfc             String?
  observations    String?
  registrationDate DateTime @default(now())
  active          Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  reservations    Reservation[]
  quotes          Quote[]
}

enum ClientType {
  PARTICULAR
  EMPRESA
  IGLESIA
  INSTITUCION
}

// Reservaciones
model Reservation {
  id              String           @id @default(cuid())
  clientId        String
  client          Client           @relation(fields: [clientId], references: [id])
  
  // Tipo de reservación
  reservationType ReservationType
  
  // Ubicación
  locationType    LocationType
  locationId      String
  locationName    String           // LibreArea, DiningRoom, Hall, Room, Garden
  
  // Fechas y horarios
  startDate       DateTime
  endDate         DateTime
  schedules       Schedule[]       // Mañana, Tarde, Noche
  
  // Estado de pago
  paymentStatus   PaymentStatus    @default(COTIZADO)
  totalAmount     Decimal          @default(0)
  paidAmount      Decimal          @default(0)
  pendingAmount   Decimal          @default(0)
  
  // Estado de reservación
  status          ReservationStatus @default(COTIZADO)
  
  // Notas
  observations    String?
  
  // Usuario que creó
  userId          String?
  user            User?           @relation(fields: [userId], references: [id])
  
  // Cierre de evento
  eventClosing    EventClosing?
  
  // Quotes relacionadas
  quote           Quote?
  
  // Fechas
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum ReservationType {
  EVENTO
  HABITACION
}

enum LocationType {
  FREE_AREA
  DINING_ROOM
  HALL
  ROOM
  GARDEN
}

enum Schedule {
  MANANA      // 7:00 - 13:00
  TARDE       // 14:00 - 19:00
  NOCHE       // 20:00 - 01:00
}

enum PaymentStatus {
  COTIZADO
  ANTICIPO    // 50% recibido
  DEPOSITO    // Depósito bancario
  SALDO       // Pendiente 50%
  TOTAL_CANCELADO
}

enum ReservationStatus {
  COTIZADO
  ANTICIPO
  DEPOSITO
  SALDO
  TOTAL_CANCELADO
  EN_EJECUCION
  FINALIZADO
  FINALIZADO_COBRO
}

// Catálogo de Productos
model Product {
  id            String      @id @default(cuid())
  name          String
  category      ProductCategory
  unitPrice     Decimal
  description   String?
  photo         String?
  available     Boolean     @default(true)
  unitMeasure  UnitMeasure
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  quoteItems    QuoteItem[]
}

enum ProductCategory {
  COMIDA_MENU
  MOBILIARIO
  ADORNOS_DECORACION
  SERVICIOS_ADICIONALES
}

enum UnitMeasure {
  PIEZA
  PERSONA
  HORA
  EVENTO
}

// Cotizaciones
model Quote {
  id              String        @id @default(cuid())
  clientId        String
  client          Client        @relation(fields: [clientId], references: [id])
  
  // Datos del evento
  eventDate       DateTime
  locationType    LocationType
  locationId      String
  locationName    String
  schedules       Schedule[]
  
  // Estado
  status          QuoteStatus   @default(BORRADOR)
  
  // Notas
  notes           String?
  decorationPhotos String[]     // Múltiples fotos
  
  // Total
  totalAmount     Decimal       @default(0)
  
  // Reservation relacionada
  reservationId   String?       @unique
  reservation     Reservation?  @relation(fields: [reservationId], references: [id])
  
  // Items
  items           QuoteItem[]
  workOrder       WorkOrder?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum QuoteStatus {
  BORRADOR
  ENVIADA
  APROBADA
  RECHAZADA
}

model QuoteItem {
  id          String    @id @default(cuid())
  quoteId     String
  quote       Quote     @relation(fields: [quoteId], references: [id])
  productId   String?
  product     Product?  @relation(fields: [productId], references: [id])
  
  // Si es mobiliario del inventario
  furnitureId String?
  furniture   Furniture? @relation(fields: [furnitureId], references: [id])
  
  name        String
  category    ProductCategory
  quantity    Int
  unitPrice   Decimal
  totalPrice  Decimal
  
  notes       String?
}

// Orden de Trabajo
model WorkOrder {
  id          String    @id @default(cuid())
  quoteId     String    @unique
  quote       Quote     @relation(fields: [quoteId], references: [id])
  
  items       QuoteItem[]
  totalAmount Decimal
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// Mobiliario/Inventario
model Furniture {
  id                String        @id @default(cuid())
  inventoryNumber   String        @unique
  name              String
  category          FurnitureCategory
  purchaseValue     Decimal
  depreciationRate  Decimal       // Porcentaje anual
  currentValue      Decimal       // Calculado automáticamente
  status            FurnitureStatus @default(BUENO)
  photo             String?
  purchaseDate      DateTime?
  location          String?
  observations      String?
  
  // Historial de uso
  assignedEvents    EventClosingItem[]
  
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}

enum FurnitureCategory {
  SILLAS
  MESAS
  MANTELES
  VAJILLA
  CRISTALERIA
  CUBERTERIA
  DECORACION
  EQUIPOS_SONIDO
  ILUMINACION
  CARPAS
  OTROS
}

enum FurnitureStatus {
  BUENO
  REGULAR
  DAÑADO
  DADO_BAJA
}

// Gastos
model Expense {
  id            String        @id @default(cuid())
  date          DateTime
  category      ExpenseCategory
  description   String
  amount        Decimal
  receiptPhoto  String?
  relatedEventId String?
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

enum ExpenseCategory {
  MANTENIMIENTO
  SERVICIOS
  SUELDOS
  INSUMOS
  DECORACION
  TRANSPORTE
  OTROS
}

// Cierre de Eventos
model EventClosing {
  id            String            @id @default(cuid())
  reservationId String            @unique
  reservation   Reservation       @relation(fields: [reservationId], references: [id])
  
  closingDate   DateTime
  returnStatus  ReturnStatus
  observations  String?
  damageCost    Decimal           @default(0)
  lossCost      Decimal           @default(0)
  
  items         EventClosingItem[]
  
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
}

enum ReturnStatus {
  COMPLETO
  CON_DANOS
  CON_PERDIDAS
}

model EventClosingItem {
  id              String        @id @default(cuid())
  eventClosingId  String
  eventClosing    EventClosing  @relation(fields: [eventClosingId], references: [id])
  furnitureId     String
  furniture       Furniture     @relation(fields: [furnitureId], references: [id])
  
  returnStatus    ItemReturnStatus
  damageDescription String?
  damagePhoto     String?
  repairCost      Decimal       @default(0)
  notes           String?
}

enum ItemReturnStatus {
  RETORNADO_OK
  RETORNADO_DAÑADO
  NO_RETORNADO
}

// Permisos por rol
model Permission {
  id          String   @id @default(cuid())
  role        Role
  module      String
  canCreate   Boolean  @default(false)
  canRead     Boolean  @default(false)
  canUpdate   Boolean  @default(false)
  canDelete   Boolean  @default(false)
  canApprove  Boolean  @default(false)
}
```

---

## 3. Autenticación y Autorización

### 3.1 Configuración NextAuth.js
- Provider: Credentials (user/password)
- Password hashing: bcrypt
- Session strategy: JWT
- Callback URLs configuradas

### 3.2 Roles y Permisos

| Módulo | Admin | Recepcionista | Finanzas | Almacén | Encargado Evento | Usuario Sistema | Visual |
|--------|-------|---------------|----------|---------|-----------------|-----------------|--------|
| Reservaciones | CRUD | CRUD Propias | Lectura | Lectura | Lectura Propas | CRUD Propias | Lectura |
| Clientes | CRUD | CRUD | Lectura | - | - | Lectura Propios | Lectura |
| Cotizaciones | CRUD | CRUD | Lectura | - | - | - | Lectura |
| Inventario | CRUD | - | - | CRUD | - | - | Lectura |
| Gastos | CRUD | - | CRUD | - | - | - | Lectura |
| Cierre Eventos | CRUD | - | - | - | CRUD | - | Lectura |
| Usuarios | CRUD | - | - | - | - | - | - |
| Configuración | CRUD | - | - | - | - | - | - |

### 3.2 Permisos Especiales (Niveles)
- Editar cotización aprobada: configurable por rol
- Editar porcentaje depreciación: configurable por rol

---

## 4. Componentes UI Principales

### 4.1 Layout
- Sidebar izquierdo con navegación
- Header con usuario actual y logout
- Contenido principal con breadcrumbs
- Responsive para móvil

### 4.2 Calendario de Reservaciones
- Biblioteca: react-big-calendar o @fullcalendar/react
- Vistas: Mes, Semana, Día
- Colores por estado de reservación
- Click en celda abre formulario de nueva reservación
- Click en evento abre detalle
- Alerta visual de doble reservación (borde rojo)

### 4.3 Formularios
- Uso de shadcn/ui para inputs, selects, datepickers
- Validación con React Hook Form + Zod
- Loading states y feedback

### 4.4 Tablas
- DataTable con sorting, filtering, pagination
- Export a Excel/PDF

---

## 5. APIs REST

### 5.1 Endpoints Principales

```
Authentication:
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/session

Reservations:
GET    /api/reservations
GET    /api/reservations/:id
POST   /api/reservations
PUT    /api/reservations/:id
DELETE /api/reservations/:id
GET    /api/reservations/calendar?month=...&year=...
GET    /api/reservations/conflicts?locationId=...&date=...&schedule=...

Clients:
GET    /api/clients
GET    /api/clients/:id
POST   /api/clients
PUT    /api/clients/:id
DELETE /api/clients/:id

Quotes:
GET    /api/quotes
GET    /api/quotes/:id
POST   /api/quotes
PUT    /api/quotes/:id
DELETE /api/quotes/:id
POST   /api/quotes/:id/approve
POST   /api/quotes/:id/generate-work-order
GET    /api/quotes/:id/pdf

Inventory:
GET    /api/furniture
GET    /api/furniture/:id
POST   /api/furniture
PUT    /api/furniture/:id
DELETE /api/furniture/:id

Products:
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id

Expenses:
GET    /api/expenses
GET    /api/expenses/:id
POST   /api/expenses
PUT    /api/expenses/:id
DELETE /api/expenses/:id

Event Closing:
GET    /api/events/closing
GET    /api/events/closing/:id
POST   /api/events/closing
PUT    /api/events/closing/:id

Users:
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id

Locations:
GET    /api/catalog/areas
GET    /api/catalog/dining-rooms
GET    /api/catalog/halls
GET    /api/catalog/buildings
GET    /api/catalog/rooms
GET    /api/catalog/gardens
```

---

## 6. Dashboard - Widgets

1. **Reservaciones del Mes** - Contador + mini-calendario
2. **Eventos Hoy** - Lista de eventos en ejecución
3. **Próximos Eventos** - Eventos próximos (7 días)
4. **Ingresos del Mes** - Total de pagos recibidos
5. **Gastos del Mes** - Total de gastos
6. **Clientes Nuevos** - Registrados este mes
7. **Mobiliario en Uso** - Artículos asignados
8. **Alertas de Inventario** - Dañados o dados de baja

### Gráficos (Recharts o Chart.js):
- Reservaciones por tipo de ubicación (pie/donut)
- Ingresos vs Gastos mensuales (bar)
- Ocupación de habitaciones (line)
- Eventos por categoría (bar)

---

## 7. Funcionalidades Clave

### 7.1 Reservas con Horarios Combinados
- Selección múltiple de horarios (Mañana, Tarde, Noche)
- Validación de conflictos para cada horario
- Precio especial configurable (mismo grupo = precio único)

### 7.2 Control de Mobiliario en Cotizaciones
- Al agregar mobiliario a cotización, verificar disponibilidad
- Reservar automáticamente para las fechas del evento
- Prevenir doble asignación

### 7.3 Cálculo de Depreciación
```
Depreciación Anual = ValorCompra × (PorcentajeCategoría / 100)
Años = (FechaActual - FechaCompra) / 365
ValorActual = ValorCompra - (Depreciación Anual × Años)
```

### 7.4 Estados de Reservación
| Estado | Color | Descripción |
|--------|-------|-------------|
| Cotizado | 🟣 Morado | Solo cotización |
| Anticipo | 🟡 Amarillo | 50% recibido |
| Depósito | 🔵 Azul | Depósito bancario |
| Saldo | 🟠 Naranja | 50% pendiente |
| Total Cancelado | 🟢 Verde | 100% pagado |
| En Ejecución | 🔴 Rojo | Evento activo |
| Finalizado | ⚪ Gris | Completado |

---

## 8. Exportación

### 8.1 Excel
- Usar: xlsx (SheetJS)
- Exports: Clientes, Reservaciones, Gastos, Inventario

### 8.2 PDF
- Usar: @react-pdf/renderer o jspdf
- Cotizaciones con formato profesional
- Reports con gráficos

---

## 9. Almacenamiento de Imágenes

- Local: /public/uploads/
- Estructura:
  - /uploads/furniture/
  - /uploads/products/
  - /uploads/receipts/
  - /uploads/damages/
  - /uploads/decorations/
- Preparado para migración a cloud (AWS S3, Cloudinary)

---

## 10. Pendiente de Confirmación (del Cliente)

El cliente respondió:
1. ✅ Precios combinados: mismo grupo = precio único, grupos diferentes = tarifa normal
2. ✅ Permisos por niveles para editar cotización aprobada
3. ✅ Control de mobiliario: sí, evitar doble reservación
4. ✅ Depreciación editable por Admin (permisos por niveles)
5. ✅ Email de confirmación al cliente
6. ⏳ Encargado de Evento: pendiente análisis

---

## 11. Referencias

- PropuestaRequerimientos_v2.md (documento fuente)
- ManualFase1.md (detalles de UI)
- Tech: Next.js 14, TypeScript, Tailwind, Prisma, SQLite, NextAuth, shadcn/ui