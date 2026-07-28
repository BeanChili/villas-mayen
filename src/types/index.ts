import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    username: string
    roleId: string
    roleName: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username: string
      roleId: string
      roleName: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username: string
    roleId?: string
    roleName?: string
  }
}

export type ClientType = 'PARTICULAR' | 'EMPRESA' | 'IGLESIA' | 'INSTITUCION'
export type ClientCategory = 'BUENO' | 'REGULAR' | 'DELICADO' | 'EN_OBSERVACION'

export type LocationType = 'FREE_AREA' | 'DINING_ROOM' | 'HALL' | 'ROOM' | 'GARDEN' | 'TERRACE'
export type Schedule = 'MANANA' | 'TARDE' | 'NOCHE'

export type PaymentStatus = 'SIN_PAGO' | 'PARCIAL' | 'PAGADO'
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
  parkingSpot?: string
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
  unitPrice: number
  pricingMode?: PricingMode
  menuNumber?: number
  guestType?: 'ADULTO' | 'NINO'
  dailyQuantities?: Array<{ date: string; quantity: number }>
  discountType?: DiscountType
  discountValue?: number
  adjustmentType?: 'DISCOUNT' | 'SURCHARGE'
  notes?: string
}

export interface FurnitureFormData {
  inventoryNumber: string
  name: string
  category: FurnitureCategory
  purchaseValue: number
  depreciationRate: number
  status: FurnitureStatus
  color?: string
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
  rentalPrice?: number
}

export interface ExpenseFormData {
  date: Date
  category: ExpenseCategory
  description: string
  amount: number
  receiptPhoto?: string
  quoteId?: string
}

export interface UserFormData {
  name: string
  username: string
  password: string
  email?: string
  phone?: string
  roleId: string
  active: boolean
}

export interface EventClosingFormData {
  quoteId: string
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

// Los permisos por rol viven en la base (Role + RolePermission) y se
// resuelven con src/lib/permissions.ts. La vieja matriz hardcodeada
// rolePermissions/hasPermission fue eliminada junto con su typo historico
// de "  calendar" que rompia los permisos del calendario.

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
  PLATOS: 'Platos',
  CUBIERTOS: 'Cubiertos',
  PICHELES: 'Picheles',
  VASOS: 'Vasos',
  COPAS: 'Copas',
}

export const furnitureCategoryLabels: Record<string, string> = {
  SILLAS: 'Sillas',
  MESAS: 'Mesas',
  SILLAS_NINOS: 'Sillas para Niños',
  MESAS_NINOS: 'Mesas para Niños',
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