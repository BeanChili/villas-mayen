import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"
import { recomputeQuotePrices, loadCatalogPrices, getCurrentExchangeRate, computeQuoteTotals } from "@/lib/quotes"
import { formatQuoteCode } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Listado minimo para selects (ej: ligar un gasto a su evento): sin
    // montos ni detalle, accesible tambien para quien solo ve gastos
    if (searchParams.get("minimal") === "1") {
      const guard = await requireAnyPermission([
        ["quotes", "view"], ["expenses", "view"], ["calendar", "view"], ["events", "view"],
      ])
      if (!guard.ok) return guard.error

      const minimal = await prisma.quote.findMany({
        where: { status: { notIn: ["CANCELADO"] } },
        select: {
          id: true,
          code: true,
          eventTitle: true,
          eventDate: true,
          client: { select: { name: true } },
        },
        orderBy: { eventDate: "desc" },
      })
      return NextResponse.json({ success: true, data: minimal })
    }

    const guard = await requireAnyPermission([["quotes", "view"], ["calendar", "view"], ["dashboard", "view"], ["screen", "view"], ["events", "view"], ["closings", "view"], ["reports_cobranza", "view"]])
    if (!guard.ok) return guard.error

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

    // Auto-transición: CONFIRMADA con fecha pasada → EN_EJECUCION
    await prisma.quote.updateMany({
      where: {
        status: "CONFIRMADA",
        eventDate: { lte: now },
      },
      data: { status: "EN_EJECUCION", executedAt: now, executionDate: now },
    })

    const quotes = await prisma.quote.findMany({
      include: { 
        client: true, 
        spaces: true,
        items: { include: { furniture: true, dailyQuantities: true } },
        payments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: quotes })
  } catch (error) {
    console.error("Error fetching quotes:", error)
    return NextResponse.json({ success: false, error: "Error al obtener cotizaciones" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission("quotes", "create")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { clientId, eventDate, endDate, currency, guestCount, notes, eventTitle, parkingSpot, sellerId } = body
    let { exchangeRate, spaces, items } = body

    if (!clientId || !eventDate || !spaces || !Array.isArray(spaces) || spaces.length === 0) {
      return NextResponse.json({ success: false, error: "Faltan campos requeridos o spaces vacío" }, { status: 400 })
    }

    // Roles sin permiso de precios: el server ignora precios, descuentos y
    // tipo de cambio del cliente y usa los del catalogo y la base
    if (!guard.perms.canEditPrices) {
      if (currency === "USD") {
        const dbRate = await getCurrentExchangeRate()
        if (!dbRate) {
          return NextResponse.json({ success: false, error: "No hay tipo de cambio configurado" }, { status: 400 })
        }
        exchangeRate = dbRate
      } else {
        exchangeRate = 1
      }
      const catalog = await loadCatalogPrices(spaces, items || [])
      const locked = recomputeQuotePrices(spaces, items || [], catalog, currency || "GTQ", exchangeRate, guestCount)
      spaces = locked.spaces
      items = locked.items
    }

    // Validar exchangeRate para USD
    if (currency === "USD" && (!exchangeRate || exchangeRate <= 0)) {
      return NextResponse.json({ success: false, error: "Tipo de cambio inválido para USD" }, { status: 400 })
    }

    // Calcular totales en el server desde espacios e items
    const subtotal = computeQuoteTotals(spaces, items || [], guestCount)

    // Vendedor: el nombre se resuelve de la base, no se confia en el cliente
    let sellerName: string | null = null
    if (sellerId) {
      const seller = await prisma.seller.findUnique({ where: { id: sellerId } })
      if (!seller) {
        return NextResponse.json({ success: false, error: "Vendedor inválido" }, { status: 400 })
      }
      sellerName = seller.name
    }

    // Codigo correlativo VM-NN desde la secuencia (a prueba de concurrencia)
    const [{ nextval }] = await prisma.$queryRaw<Array<{ nextval: bigint }>>`SELECT nextval('quote_code_seq')`
    const code = formatQuoteCode(Number(nextval))

    const quote = await prisma.quote.create({
      data: {
        code,
        clientId,
        sellerId: sellerId || null,
        sellerName,
        eventDate: new Date(eventDate + "T12:00:00"),
        endDate: endDate ? new Date(endDate + "T12:00:00") : new Date(eventDate + "T12:00:00"),
        currency: currency || "GTQ",
        exchangeRate: exchangeRate || 1,
        guestCount: guestCount || null,
        status: "BORRADOR",
        subtotal,
        totalAmount: subtotal,
        notes,
        eventTitle: eventTitle || null,
        parkingSpot: parkingSpot || null,
        spaces: {
          create: spaces.flatMap((s: any) => {
            const from = s.roomFrom ? parseInt(s.roomFrom) : 0
            const to = s.roomTo ? parseInt(s.roomTo) : 0
            if (from > 0 && to >= from) {
              const roomSpaces = []
              for (let n = from; n <= to; n++) {
                const baseName = s.locationName || "Habitación"
                const roomName = `${baseName} ${n}`
                roomSpaces.push({
                  locationType: s.locationType,
                  locationId: s.locationId,
                  locationName: roomName,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  pricingMode: s.pricingMode || "PER_SPACE",
                  unitPrice: Math.round((s.unitPrice || 0) * 100) / 100,
                  totalPrice: Math.round((s.pricingMode === "PER_PERSON" && guestCount
                    ? guestCount * (s.unitPrice || 0)
                    : (s.unitPrice || 0)) * 100) / 100,
                })
              }
              return roomSpaces
            }
            return [{
              locationType: s.locationType,
              locationId: s.locationId,
              locationName: s.locationName,
              startTime: s.startTime,
              endTime: s.endTime,
              pricingMode: s.pricingMode || "PER_SPACE",
              unitPrice: Math.round((s.unitPrice || 0) * 100) / 100,
              totalPrice: Math.round((s.pricingMode === "PER_PERSON" && guestCount
                ? guestCount * (s.unitPrice || 0)
                : (s.unitPrice || 0)) * 100) / 100,
            }]
          }),
        },
        items: items?.length ? {
          create: items.map((item: any) => {
            // Calcular total sumando todos los días
            const dailyQuantities = item.dailyQuantities || []
            const totalQty = dailyQuantities.reduce((sum: number, dq: any) => sum + (dq.quantity || 0), 0)
            const t = totalQty * item.unitPrice
            const d = item.discountType === "PERCENT" ? t * ((item.discountValue || 0) / 100) : (item.discountValue || 0)
            
            return {
              productId: item.productId || null,
              furnitureId: item.furnitureId || null,
              name: item.name,
              category: item.category,
              unitPrice: Math.round(item.unitPrice * 100) / 100,
              pricingMode: item.pricingMode || null,
              discountType: item.discountType || null,
              discountValue: Math.round((item.discountValue || 0) * 100) / 100,
              adjustmentType: item.adjustmentType || "DISCOUNT",
              menuNumber: item.menuNumber || null,
              guestType: item.guestType || null,
              notes: item.notes || null,
              // Crear entradas diarias
              dailyQuantities: {
                create: dailyQuantities.map((dq: any) => ({
                  date: new Date(dq.date + "T12:00:00"),
                  quantity: dq.quantity || 0,
                })),
              },
            }
          }),
        } : undefined,
      },
      include: { client: true, spaces: true, items: { include: { dailyQuantities: true } } },
    })

    return NextResponse.json({ success: true, data: quote }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating quote:", error)
    // Log detalles del error para diagnóstico
    if (error.code) console.error("Prisma error code:", error.code)
    if (error.meta) console.error("Prisma error meta:", error.meta)
    if (error.message) console.error("Error message:", error.message)
    return NextResponse.json({ success: false, error: error.message || "Error al crear cotización" }, { status: 500 })
  }
}
