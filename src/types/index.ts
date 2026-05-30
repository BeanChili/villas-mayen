import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    username: string
    role: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username: string
      role: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username: string
    role: string
  }
}

// Types for the application
export type Role = 'ADMIN' | 'RECEPCIONISTA' | 'FINANZAS' | 'ALMACEN' | 'ENCARGADO_EVENTO' | 'USUARIO_SISTEMA' | 'VISUAL'

export type ClientType = 'PARTICULAR' | 'EMPRESA' | 'IGLESIA' | 'INSTITUCION'
export type ClientCategory = 'BUENO' | 'REGULAR' | 'DELICADO' | 'EN_OBSERVACION'
export type ReservationType = 'EVENTO' | 'HABITACION'

export type LocationType = 'FREE_AREA' | 'DINING_ROOM' | 'HALL' | 'ROOM' | 'GARDEN' | 'TERRACE'
export type Schedule = 'MANANA' | 'TARDE' | 'NOCHE'

export type PaymentStatus = 'SIN_PAGO' | 'PARCIAL' | 'PAGADO'
export type ReservationStatus = 'COTIZADO' | 'CONFIRMADO' | 'EN_EJECUCION' | 'FINALIZADO' | 'CANCELADO'
export type QuoteStatus = 'BORRADOR' | 'ENVIADA' | 'NO_CONFIRMADA' | 'CONFIRMADA' | 'EN_EJECUCION' | 'CANCELADO' | 'FINALIZADA'

export type Currency = 'GTQ' | 'USD'
export type PricingMode = 'PER_PERSON' | 'PER_SPACE' | 'PER_UNIT'
export type DiscountType = 'PERCENT' | 'FIXED'
export type MenuType = 'DESAYUNO' | 'REFACCION' | 'COFFEE_BREAK' | 'ALMUERZO' | 'CENA'

export type ProductCategory = 'COMIDA_MENU' | 'ADORNOS_DECORACION' | 'SERVICIOS_ADICIONALES' | 'PLATOS' | 'CUBIERTOS' | 'PICHELES' | 'VASOS' | 'COPAS'

export type UnitMeasure = 'PIEZA' | 'PERSONA' | 'HORA' | 'EVENTO'

export type FurnitureCategory = 'SILLAS' | 'MESAS' | 'MANTELES' | 'VAJILLA' | 'CRISTALERIA' | 'CUBERTERIA' | 'DECORACION' | 'EQUIPOS_SONIDO' | 'ILUMINACION' | 'CARPAS' | 'OTROS'

export type FurnitureStatus = 'BUENO' | 'REGULAR' | 'DANADO' | 'DADO_BAJA'

export type ExpenseCategory = 'MANTENIMIENTO' | 'SERVICIOS' | 'SUELDOS' | 'INSUMOS' | 'DECORACION' | 'TRANSPORTE' | 'OTROS'

export type ReturnStatus = 'COMPLETO' | 'CON_DANOS' | 'CON_PERDIDAS'

export type ItemReturnStatus = 'RETORNADO_OK' | 'RETORNADO_DANADO' | 'NO_RETORNADO'

export type BedType = 'INDIVIDUAL' | 'MATRIMONIAL' | 'QUEEN' | 'KING'

export type RoomStatus = 'DISPONIBLE' | 'RESERVADA' | 'OCUPADA' | 'MANTENIMIENTO'

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Form types
export interface ReservationFormData {
  clientId: string
  reservationType: ReservationType
  locationType: LocationType
  locationId: string
  startDate: Date
  endDate: Date
  startSchedule: Schedule   // Horario del día de inicio (MANANA | TARDE | NOCHE)
  endSchedule: Schedule     // Horario del día de fin   (MANANA | TARDE | NOCHE)
  schedules: Schedule[]     // Array derivado de startSchedule..endSchedule (legacy)
  totalAmount: number
  observations?: string
}

export interface ClientFormData {
  name: string
  clientType: ClientType
  phone?: string
  email?: string
  address?: string
  rfc?: string
  observations?: string
}

export interface QuoteFormData {
  clientId: string
  eventDate: Date
  currency: Currency
  exchangeRate: number
  guestCount?: number
  spaces: QuoteSpaceFormData[]
  notes?: string
  items: QuoteItemFormData[]
}

export interface QuoteSpaceFormData {
  locationType: LocationType
  locationId: string
  locationName: string
  startTime: string    // "14:30"
  endTime: string      // "16:45"
  pricingMode: PricingMode
  unitPrice: number
  notes?: string
}

export interface QuoteItemFormData {
  productId?: string
  furnitureId?: string
  name: string
  category: ProductCategory
  quantity: number
  unitPrice: number
  pricingMode?: PricingMode
  scheduledDate?: Date
  startTime?: string
  endTime?: string
  discountType?: DiscountType
  discountValue?: number
  notes?: string
}

export interface FurnitureFormData {
  inventoryNumber: string
  name: string
  category: FurnitureCategory
  purchaseValue: number
  depreciationRate: number
  status: FurnitureStatus
  photo?: string
  purchaseDate?: Date
  location?: string
  observations?: string
}

export interface ProductFormData {
  name: string
  category: ProductCategory
  menuType?: MenuType
  unitPrice: number
  description?: string
  photo?: string
  available: boolean
  unitMeasure: UnitMeasure
  quantity: number
  isFree: boolean
  pricePerDay?: number
  pricePerHour?: number
}

export interface ExpenseFormData {
  date: Date
  category: ExpenseCategory
  description: string
  amount: number
  receiptPhoto?: string
  relatedEventId?: string
}

export interface UserFormData {
  name: string
  username: string
  password: string
  email?: string
  phone?: string
  role: Role
  active: boolean
}

export interface EventClosingFormData {
  reservationId: string
  closingDate: Date
  returnStatus: ReturnStatus
  observations?: string
  items: EventClosingItemFormData[]
}

export interface EventClosingItemFormData {
  furnitureId: string
  returnStatus: ItemReturnStatus
  damageDescription?: string
  damagePhoto?: string
  repairCost?: number
  notes?: string
}

// Permission types
export interface Permission {
  module: string
  canCreate: boolean
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  canApprove: boolean
}

export const rolePermissions: Record<Role, Permission[]> = {
  ADMIN: [
    { module: 'reservations', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true },
    { module: 'clients', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true },
    { module: 'quotes', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true },
    { module: 'inventory', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true },
    { module: 'expenses', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true },
    { module: 'events', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true },
    { module: 'users', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true },
    { module: 'settings', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true },
    { module: 'rooms', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true },
  ],
  RECEPCIONISTA: [
    { module: 'reservations', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: false },
    { module: 'clients', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: false },
    { module: 'quotes', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: false },
    { module: 'inventory', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'expenses', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'events', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'users', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'settings', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'rooms', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: false },
  ],
  FINANZAS: [
    { module: 'reservations', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'clients', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'quotes', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'inventory', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'expenses', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: true },
    { module: 'events', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'users', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'settings', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'rooms', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
  ],
  ALMACEN: [
    { module: 'reservations', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'clients', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'quotes', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'inventory', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: false },
    { module: 'expenses', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'events', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'users', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'settings', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'rooms', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
  ],
  ENCARGADO_EVENTO: [
    { module: 'reservations', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'clients', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'quotes', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'inventory', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'expenses', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'events', canCreate: true, canRead: true, canUpdate: true, canDelete: false, canApprove: false },
    { module: 'users', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'settings', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'rooms', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
  ],
  USUARIO_SISTEMA: [
    { module: 'reservations', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: false },
    { module: 'clients', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'quotes', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'inventory', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'expenses', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'events', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'users', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'settings', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'rooms', canCreate: true, canRead: true, canUpdate: true, canDelete: true, canApprove: false },
  ],
  VISUAL: [
    { module: 'reservations', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'clients', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'quotes', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'inventory', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'expenses', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'events', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'users', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'settings', canCreate: false, canRead: false, canUpdate: false, canDelete: false, canApprove: false },
    { module: 'rooms', canCreate: false, canRead: true, canUpdate: false, canDelete: false, canApprove: false },
  ],
}

export function hasPermission(role: Role, module: string, action: 'create' | 'read' | 'update' | 'delete' | 'approve'): boolean {
  const permissions = rolePermissions[role]
  const modulePermission = permissions.find(p => p.module === module)
  if (!modulePermission) return false
  
  switch (action) {
    case 'create': return modulePermission.canCreate
    case 'read': return modulePermission.canRead
    case 'update': return modulePermission.canUpdate
    case 'delete': return modulePermission.canDelete
    case 'approve': return modulePermission.canApprove
    default: return false
  }
}

// Label exports for pages
export const statusLabels: Record<string, string> = {
  // Reservation status
  COTIZADO:     'Cotizado',
  CONFIRMADO:   'Confirmado',
  EN_EJECUCION: 'En Ejecución',
  FINALIZADO:   'Finalizado',
  CANCELADO:    'Cancelado',
  // Payment status
  SIN_PAGO: 'Sin Pago',
  PARCIAL:  'Pago Parcial',
  PAGADO:   'Pagado',
}

export const statusColors: Record<string, string> = {
  // Reservation status
  COTIZADO:     '#9ca3af', // gray
  CONFIRMADO:   '#3b82f6', // blue
  EN_EJECUCION: '#a855f7', // purple
  FINALIZADO:   '#10b981', // emerald
  CANCELADO:    '#ef4444', // red
  // Payment status
  SIN_PAGO: '#9ca3af', // gray
  PARCIAL:  '#f59e0b', // amber
  PAGADO:   '#10b981', // emerald
}

export const clientTypeLabels: Record<string, string> = {
  PARTICULAR: 'Particular',
  EMPRESA: 'Empresa',
  IGLESIA: 'Iglesia',
  INSTITUCION: 'Institución',
}

export const quoteStatusLabels: Record<string, string> = {
  BORRADOR: 'Borrador',
  ENVIADA: 'Enviada a Cliente',
  NO_CONFIRMADA: 'No Confirmada',
  CONFIRMADA: 'Confirmada / Pago Anticipo',
  EN_EJECUCION: 'En Ejecución',
  CANCELADO: 'Cancelado',
  FINALIZADA: 'Finalizada / Liquidada',
}

export const quoteStatusColors: Record<string, string> = {
  BORRADOR: '#9ca3af',        // gray
  ENVIADA: '#6b7280',         // gris oscuro
  NO_CONFIRMADA: '#ef4444',   // red
  CONFIRMADA: '#22c55e',      // verde
  EN_EJECUCION: '#a855f7',    // morado
  CANCELADO: '#991b1b',       // rojo oscuro
  FINALIZADA: '#dc2626',      // rojo
}

export const clientCategoryLabels: Record<string, string> = {
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  DELICADO: 'Delicado',
  EN_OBSERVACION: 'En Observación',
}

export const clientCategoryColors: Record<string, string> = {
  BUENO: '#22c55e',        // green
  REGULAR: '#3b82f6',      // blue
  DELICADO: '#f59e0b',     // amber
  EN_OBSERVACION: '#ef4444', // red
}

export const productCategoryLabels: Record<string, string> = {
  COMIDA_MENU: 'Comida/Menú',
  ADORNOS_DECORACION: 'Adornos/Decoración',
  SERVICIOS_ADICIONALES: 'Servicios Adicionales',
}

export const furnitureCategoryLabels: Record<string, string> = {
  SILLAS: 'Sillas',
  MESAS: 'Mesas',
  MANTELES: 'Manteles',
  VAJILLA: 'Vajilla',
  CRISTALERIA: 'Cristalería',
  CUBERTERIA: 'Cubiería',
  DECORACION: 'Decoración',
  EQUIPOS_SONIDO: 'Equipos de Sonido',
  ILUMINACION: 'Iluminación',
  CARPAS: 'Carpas',
  OTROS: 'Otros',
}

export const furnitureStatusLabels: Record<string, string> = {
  BUENO: 'Bueno',
  REGULAR: 'Regular',
  DANADO: 'Dañado',
  DADO_BAJA: 'Dado de Baja',
}

export const expenseCategoryLabels: Record<string, string> = {
  MANTENIMIENTO: 'Mantenimiento',
  SERVICIOS: 'Servicios',
  SUELDOS: 'Sueldos',
  INSUMOS: 'Insumos',
  DECORACION: 'Decoración',
  TRANSPORTE: 'Transporte',
  OTROS: 'Otros',
}

export const returnStatusLabels: Record<string, string> = {
  COMPLETO: 'Completo',
  CON_DANOS: 'Con Daños',
  CON_PERDIDAS: 'Con Pérdidas',
}

export const itemReturnStatusLabels: Record<string, string> = {
  RETORNADO_OK: 'Retornado OK',
  RETORNADO_DANADO: 'Retornado Dañado',
  NO_RETORNADO: 'No Retornado',
}

export const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPCIONISTA: 'Recepcionista',
  FINANZAS: 'Finanzas',
  ALMACEN: 'Almacén',
  ENCARGADO_EVENTO: 'Encargado de Evento',
  USUARIO_SISTEMA: 'Usuario del Sistema',
  VISUAL: 'Solo Visual',
}

export const locationTypeLabels: Record<string, string> = {
  FREE_AREA: 'Área Libre',
  DINING_ROOM: 'Comedor',
  HALL: 'Salón',
  ROOM: 'Habitación',
  GARDEN: 'Jardín',
  TERRACE: 'Terraza',
}

export const scheduleLabels: Record<string, string> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
  NOCHE: 'Noche',
}

export const roomStatusLabels: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  RESERVADA: 'Reservada',
  OCUPADA: 'Ocupada',
  MANTENIMIENTO: 'Mantenimiento',
}

export const roomStatusColors: Record<string, string> = {
  DISPONIBLE: '#22c55e',
  RESERVADA: '#3b82f6',
  OCUPADA: '#a855f7',
  MANTENIMIENTO: '#f59e0b',
}

export const bedTypeLabels: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  MATRIMONIAL: 'Matrimonial',
  QUEEN: 'Queen',
  KING: 'King',
}