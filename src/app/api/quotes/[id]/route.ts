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
        items: { include: { product: true, furniture: true } },
        reservation: { include: { payments: true, eventClosing: { include: { items: { include: { furniture: true } } } } } },
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
    const { notes, items, spaces, currency, exchangeRate, guestCount, totalAmount } = body

    // Recrear espacios
    if (spaces) {
      await prisma.quoteSpace.deleteMany({ where: { quoteId: params.id } })
    }

    // Recrear items
    if (items) {
      await prisma.quoteItem.deleteMany({ where: { quoteId: params.id } })
    }

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: {
        notes,
        currency,
        exchangeRate,
        guestCount,
        totalAmount: totalAmount || 0,
        spaces: spaces ? {
          create: spaces.map((s: any) => ({
            locationType: s.locationType,
            locationId: s.locationId,
            locationName: s.locationName,
            startTime: s.startTime,
            endTime: s.endTime,
            pricingMode: s.pricingMode || "PER_SPACE",
            unitPrice: s.unitPrice || 0,
            totalPrice: s.totalPrice || 0,
            notes: s.notes,
          })),
        } : undefined,
        items: items ? {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            pricingMode: item.pricingMode || null,
            scheduledDate: item.scheduledDate ? new Date(item.scheduledDate + "T12:00:00") : null,
            startTime: item.startTime || null,
            endTime: item.endTime || null,
            discountType: item.discountType || null,
            discountValue: item.discountValue || 0,
            totalPrice: item.totalPrice || item.quantity * item.unitPrice,
          })),
        } : undefined,
      },
      include: { items: true, spaces: true },
    })

    return NextResponse.json({ success: true, data: quote })
  } catch (error) {
    console.error("Error updating quote:", error)
    return NextResponse.json({ success: false, error: "Error al actualizar cotización" }, { status: 500 })
  }
}