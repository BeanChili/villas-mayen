import prisma from "./db"

// ============================================================================
// Bloqueo de precios: para roles sin canEditPrices el server ignora los
// precios y descuentos que manda el cliente y los reemplaza por los del
// catalogo. La parte pura (recomputeQuotePrices) es unit-testeable.
// ============================================================================

export interface CatalogPrices {
  locations: Record<string, number>
  products: Record<string, number>
  furniture: Record<string, number>
}

/**
 * Los precios de catalogo estan en GTQ; una cotizacion en USD los divide por
 * el tipo de cambio (mismo redondeo que usa el wizard: toFixed(2)).
 */
export function toQuoteCurrency(
  basePriceGTQ: number,
  currency: string,
  exchangeRate: number
): number {
  if (currency === "USD" && exchangeRate > 0) {
    return +(basePriceGTQ / exchangeRate).toFixed(2)
  }
  return basePriceGTQ
}

/**
 * Reemplaza los precios que mando el cliente por los del catalogo y anula los
 * descuentos (un descuento tambien es modificar el precio). Un espacio o item
 * sin referencia de catalogo queda en 0: el rol sin permiso no puede inventar
 * precios libres.
 */
export function recomputeQuotePrices(
  spaces: any[],
  items: any[],
  catalog: CatalogPrices,
  currency: string = "GTQ",
  exchangeRate: number = 1,
  guestCount?: number | null
): { spaces: any[]; items: any[] } {
  const lockedSpaces = (spaces || []).map((s: any) => {
    const base = s.locationId != null ? catalog.locations[s.locationId] : undefined
    const unitPrice = base !== undefined ? toQuoteCurrency(base, currency, exchangeRate) : 0
    const totalPrice = s.pricingMode === "PER_PERSON" && guestCount
      ? Math.round(guestCount * unitPrice * 100) / 100
      : unitPrice
    return {
      ...s,
      unitPrice,
      totalPrice,
      discountValue: 0,
    }
  })

  const lockedItems = (items || []).map((i: any) => {
    let base: number | undefined
    if (i.productId && catalog.products[i.productId] !== undefined) {
      base = catalog.products[i.productId]
    } else if (i.furnitureId && catalog.furniture[i.furnitureId] !== undefined) {
      base = catalog.furniture[i.furnitureId]
    }
    return {
      ...i,
      unitPrice: base !== undefined ? toQuoteCurrency(base, currency, exchangeRate) : 0,
      discountType: null,
      discountValue: 0,
    }
  })

  return { spaces: lockedSpaces, items: lockedItems }
}

/**
 * Total de la cotizacion calculado en el server: espacios (con expansion de
 * rangos de habitaciones y modo por persona) mas items con sus descuentos.
 */
export function computeQuoteTotals(
  spaces: any[],
  items: any[],
  guestCount?: number | null
): number {
  const spacesTotal = (spaces || []).reduce((sum: number, s: any) => {
    const price = s.pricingMode === "PER_PERSON" && guestCount
      ? guestCount * (s.unitPrice || 0)
      : (s.unitPrice || 0)
    const count = (s.roomFrom && s.roomTo && s.roomTo >= s.roomFrom)
      ? (parseInt(s.roomTo) - parseInt(s.roomFrom) + 1)
      : 1
    return sum + (price * count)
  }, 0)

  const itemsTotal = (items || []).reduce((sum: number, i: any) => {
    const totalQty = (i.dailyQuantities || []).reduce((s: number, dq: any) => s + (dq.quantity || 0), 0)
    const itemTotal = totalQty * (i.unitPrice || 0)
    const discount = i.discountType === "PERCENT"
      ? itemTotal * ((i.discountValue || 0) / 100)
      : (i.discountValue || 0)
    return sum + (itemTotal - discount)
  }, 0)

  return Math.round((spacesTotal + itemsTotal) * 100) / 100
}

/** Trae de la base los precios de catalogo referenciados por la cotizacion. */
export async function loadCatalogPrices(
  spaces: any[],
  items: any[]
): Promise<CatalogPrices> {
  const locationIds = Array.from(
    new Set((spaces || []).map((s: any) => s.locationId).filter(Boolean))
  ) as string[]
  const productIds = Array.from(
    new Set((items || []).map((i: any) => i.productId).filter(Boolean))
  ) as string[]
  const furnitureIds = Array.from(
    new Set((items || []).map((i: any) => i.furnitureId).filter(Boolean))
  ) as string[]

  const [locations, products, furniture] = await Promise.all([
    locationIds.length
      ? prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id: true, unitPrice: true } })
      : Promise.resolve([]),
    productIds.length
      ? prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, unitPrice: true } })
      : Promise.resolve([]),
    furnitureIds.length
      ? prisma.furniture.findMany({ where: { id: { in: furnitureIds } }, select: { id: true, rentalPrice: true } })
      : Promise.resolve([]),
  ])

  return {
    locations: Object.fromEntries(locations.map((l) => [l.id, l.unitPrice])),
    products: Object.fromEntries(products.map((p) => [p.id, p.unitPrice])),
    furniture: Object.fromEntries(furniture.map((f) => [f.id, f.rentalPrice])),
  }
}

/** Tipo de cambio vigente de la base (para roles que no pueden fijarlo a mano). */
export async function getCurrentExchangeRate(): Promise<number | null> {
  const current = await prisma.exchangeRate.findFirst({ orderBy: { createdAt: "desc" } })
  return current && current.rate > 0 ? current.rate : null
}
