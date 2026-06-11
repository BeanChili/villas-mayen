import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        spaces: true,
        items: { include: { product: true, furniture: true, dailyQuantities: true } },
        payments: { orderBy: { createdAt: "asc" } },
        eventClosing: { include: { items: { include: { furniture: true } } } },
      },
    })

    if (!quote) {
      return NextResponse.json({ success: false, error: "Cotización no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: quote })
  } catch (error) {
    console.error("Error fetching quote:", error)
    return NextResponse.json({ success: false, error: "Error al obtener cotización" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "quotes", "update")) {
      return NextResponse.json({ success: false, error: "Sin permiso" }, { status: 403 })
    }

    const body = await request.json()
    const { clientId, eventDate, endDate, notes, items, spaces, currency, exchangeRate, guestCount, totalAmount, eventTitle, parkingSpot } = body

    const quote = await prisma.$transaction(async (tx) => {
      if (spaces) await tx.quoteSpace.deleteMany({ where: { quoteId: params.id } })
      if (items) await tx.quoteItem.deleteMany({ where: { quoteId: params.id } })

      return tx.quote.update({
        where: { id: params.id },
        data: {
        clientId,
        eventDate: eventDate ? new Date(eventDate + "T12:00:00") : undefined,
        endDate: endDate ? new Date(endDate + "T12:00:00") : (eventDate ? new Date(eventDate + "T12:00:00") : undefined),
        notes,
        currency,
        exchangeRate,
        guestCount,
        totalAmount: totalAmount || 0,
        eventTitle,
        parkingSpot,
        spaces: spaces ? {
          create: spaces.flatMap((s: any) => {
            const from = s.roomFrom ? parseInt(s.roomFrom) : 0
            const to = s.roomTo ? parseInt(s.roomTo) : 0
            if (from > 0 && to >= from) {
              const arr = []
              for (let n = from; n <= to; n++) {
                arr.push({
                  locationType: s.locationType,
                  locationId: s.locationId,
                  locationName: `${s.locationName || "Habitación"} ${n}`,
                  startTime: s.startTime,
                  endTime: s.endTime,
                  pricingMode: s.pricingMode || "PER_SPACE",
                  unitPrice: s.unitPrice || 0,
                  totalPrice: s.totalPrice || 0,
                  notes: s.notes,
                })
              }
              return arr
            }
            return [{
              locationType: s.locationType,
              locationId: s.locationId,
              locationName: s.locationName,
              startTime: s.startTime,
              endTime: s.endTime,
              pricingMode: s.pricingMode || "PER_SPACE",
              unitPrice: s.unitPrice || 0,
              totalPrice: s.totalPrice || 0,
              notes: s.notes,
            }]
          }),
        } : undefined,
        items: items ? {
          create: items.map((item: any) => {
            const dailyQuantities = item.dailyQuantities || []
            const totalQty = dailyQuantities.reduce((sum: number, dq: any) => sum + (dq.quantity || 0), 0)
            
            return {
              productId: item.productId || null,
              furnitureId: item.furnitureId || null,
              name: item.name,
              category: item.category,
              unitPrice: item.unitPrice,
              pricingMode: item.pricingMode || null,
              discountType: item.discountType || null,
              discountValue: item.discountValue || 0,
              adjustmentType: item.adjustmentType || "DISCOUNT",
              menuNumber: item.menuNumber || null,
              guestType: item.guestType || null,
              notes: item.notes || null,
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
      include: { items: true, spaces: true },
    })
    })

    return NextResponse.json({ success: true, data: quote })
  } catch (error) {
    console.error("Error updating quote:", error)
    return NextResponse.json({ success: false, error: "Error al actualizar cotización" }, { status: 500 })
  }
}