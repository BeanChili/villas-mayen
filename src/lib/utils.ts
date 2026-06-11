import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
  }).format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-GT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function calculateDepreciation(
  purchaseValue: number,
  depreciationRate: number,
  purchaseDate: Date | string
): number {
  const purchase = typeof purchaseDate === 'string' ? new Date(purchaseDate) : purchaseDate
  const now = new Date()
  const years = (now.getTime() - purchase.getTime()) / (365 * 25 * 24 * 60 * 60 * 1000)
  const annualDepreciation = purchaseValue * (depreciationRate / 100)
  const currentValue = purchaseValue - (annualDepreciation * years)
  return Math.max(0, currentValue)
}

export function parseSchedule(schedulesJson: string): string[] {
  try {
    return JSON.parse(schedulesJson)
  } catch {
    return []
  }
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Quote + Payment statuses
    COTIZADO:     '#6B7280', // gray (legacy)
    CONFIRMADO:   '#3B82F6', // blue (legacy)
    EN_EJECUCION: '#8B5CF6', // purple
    FINALIZADO:   '#10B981', // emerald (legacy)
    CANCELADO:    '#EF4444', // red
    // PaymentStatus
    SIN_PAGO: '#6B7280', // gray
    PARCIAL:  '#F59E0B', // amber
    PAGADO:   '#10B981', // emerald
  }
  return colors[status] || '#6B7280'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    // Quote + Payment statuses
    COTIZADO:     'Cotizado',     // legacy
    CONFIRMADO:   'Confirmado',   // legacy
    EN_EJECUCION: 'En Ejecución',
    FINALIZADO:   'Finalizado',   // legacy
    CANCELADO:    'Cancelado',
    // PaymentStatus
    SIN_PAGO: 'Sin Pago',
    PARCIAL:  'Parcial',
    PAGADO:   'Pagado',
  }
  return labels[status] || status
}

export function getScheduleLabel(schedule: string): string {
  const labels: Record<string, string> = {
    MANANA: 'Mañana (7:00 - 13:00)',
    TARDE: 'Tarde (14:00 - 19:00)',
    NOCHE: 'Noche (20:00 - 01:00)',
  }
  return labels[schedule] || schedule
}

export function getLocationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    FREE_AREA: 'Área Libre',
    DINING_ROOM: 'Comedor',
    HALL: 'Salón',
    ROOM: 'Habitación',
    GARDEN: 'Jardín',
    TERRACE: 'Terraza',
  }
  return labels[type] || type
}

export function getClientCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    BUENO: 'Bueno',
    REGULAR: 'Regular',
    DELICADO: 'Delicado',
    EN_OBSERVACION: 'En Observación',
  }
  return labels[category] || category
}

export function getClientCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    BUENO: '#22c55e',
    REGULAR: '#3b82f6',
    DELICADO: '#f59e0b',
    EN_OBSERVACION: '#ef4444',
  }
  return colors[category] || '#6b7280'
}

export function getClientTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PARTICULAR: 'Particular',
    EMPRESA: 'Empresa',
    IGLESIA: 'Iglesia',
    INSTITUCION: 'Institución',
  }
  return labels[type] || type
}

export function getQuoteStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    BORRADOR: 'Borrador',
    ENVIADA: 'Enviada',
    NO_CONFIRMADA: 'No Confirmada',
    CONFIRMADA: 'Confirmada',
    EN_EJECUCION: 'En Ejecución',
    CANCELADO: 'Cancelado',
    FINALIZADA: 'Finalizada',
  }
  return labels[status] || status
}

export function getFurnitureStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    BUENO: 'Bueno',
    REGULAR: 'Regular',
    DANADO: 'Dañado',
    DADO_BAJA: 'Dado de Baja',
  }
  return labels[status] || status
}

export function getExpenseCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    MANTENIMIENTO: 'Mantenimiento',
    SERVICIOS: 'Servicios',
    SUELDOS: 'Sueldos',
    INSUMOS: 'Compra de Insumos',
    DECORACION: 'Decoración',
    TRANSPORTE: 'Transporte',
    OTROS: 'Otros',
  }
  return labels[category] || category
}

export function getProductCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    COMIDA_MENU: 'Comida / Menú',
    MOBILIARIO: 'Mobiliario',
    ADORNOS_DECORACION: 'Adornos y Decoración',
    SERVICIOS_ADICIONALES: 'Servicios Adicionales',
    PLATOS: 'Platos',
    CUBIERTOS: 'Cubiertos',
    PICHELES: 'Picheles',
    VASOS: 'Vasos',
    COPAS: 'Copas',
  }
  return labels[category] || category
}

// ─── Funciones nuevas (Reunión 2) ─────────────────────────────────────────

export function formatCurrencyUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatCurrencyByCode(amount: number, currency: string): string {
  if (currency === 'USD') return formatCurrencyUSD(amount)
  return formatCurrency(amount)
}

const PARKING_OPTION_LABELS: Record<string, string> = {
  Predio: "Predio",
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), `Grupo ${i + 1}`])),
}

export function formatParkingSpots(value?: string): string {
  return (value || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean)
    .map(v => PARKING_OPTION_LABELS[v] || v)
    .join(", ")
}

export function calculateExpiryDate(sentDate: Date, validityDays: number = 15): Date {
  let daysAdded = 0
  const result = new Date(sentDate)
  while (daysAdded < validityDays) {
    result.setDate(result.getDate() + 1)
    if (result.getDay() !== 0 && result.getDay() !== 6) daysAdded++
  }
  return result
}

export function getScheduleFromTime(time: string): string | null {
  const [h] = time.split(':').map(Number)
  if (h >= 7 && h < 13) return 'MANANA'
  if (h >= 14 && h < 19) return 'TARDE'
  if (h >= 20 || h < 1) return 'NOCHE'
  return null
}

// Máquina de estados — transiciones válidas
export const VALID_QUOTE_TRANSITIONS: Record<string, string[]> = {
  BORRADOR: ['ENVIADA'],
  ENVIADA: ['CONFIRMADA', 'NO_CONFIRMADA'],
  NO_CONFIRMADA: ['ENVIADA'],
  CONFIRMADA: ['EN_EJECUCION', 'CANCELADO'],
  EN_EJECUCION: ['FINALIZADA', 'CANCELADO'],
  CANCELADO: [],
  FINALIZADA: [],
}

export function isValidTransition(current: string, next: string): boolean {
  return VALID_QUOTE_TRANSITIONS[current]?.includes(next) ?? false
}

export function getRoomStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DISPONIBLE: 'Disponible',
    RESERVADA: 'Reservada',
    OCUPADA: 'Ocupada',
    MANTENIMIENTO: 'Mantenimiento',
  }
  return labels[status] || status
}

export function getRoomStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DISPONIBLE: '#22c55e',
    RESERVADA: '#3b82f6',
    OCUPADA: '#a855f7',
    MANTENIMIENTO: '#f59e0b',
  }
  return colors[status] || '#6b7280'
}

export function getBedTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INDIVIDUAL: 'Individual',
    MATRIMONIAL: 'Matrimonial',
    QUEEN: 'Queen',
    KING: 'King',
  }
  return labels[type] || type
}