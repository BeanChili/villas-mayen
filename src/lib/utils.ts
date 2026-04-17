import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
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
    // ReservationStatus
    COTIZADO:     '#6B7280', // gray
    CONFIRMADO:   '#3B82F6', // blue
    EN_EJECUCION: '#8B5CF6', // purple
    FINALIZADO:   '#10B981', // emerald
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
    // ReservationStatus
    COTIZADO:     'Cotizado',
    CONFIRMADO:   'Confirmado',
    EN_EJECUCION: 'En Ejecución',
    FINALIZADO:   'Finalizado',
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
  }
  return labels[type] || type
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
    APROBADA: 'Aprobada',
    RECHAZADA: 'Rechazada',
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
  }
  return labels[category] || category
}