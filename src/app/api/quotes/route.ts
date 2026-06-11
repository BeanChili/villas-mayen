import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "quotes", "create")) {
      return NextResponse.json({ success: false, error: "Sin permiso" }, { status: 403 })
    }

    const body = await request.json()
    const { clientId, eventDate, endDate, currency, exchangeRate, guestCount, spaces, notes, items, eventTitle, parkingSpot } = body

    if (!clientId || !eventDate || !spaces || !Array.isArray(spaces) || spaces.length === 0) {
      return NextResponse.json({ success: false, error: "Faltan campos requeridos o spaces vacío" }, { status: 400 })
    }

    // Validar exchangeRate para USD
    if (currency === "USD" && (!exchangeRate || exchangeRate <= 0)) {
      return NextResponse.json({ success: false, error: "Tipo de cambio inválido para USD" }, { status: 400 })
    }

    // Calcular totales desde los espacios
    const spacesTotal = spaces.reduce((sum: number, s: any) => {
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

    const subtotal = Math.round((spacesTotal + itemsTotal) * 100) / 100

    const quote = await prisma.quote.create({
      data: {
        clientId,
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
