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

    // Auto-expirar cotizaciones ENVIADA que ya vencieron (CP-04)
    await prisma.quote.updateMany({
      where: {
        status: "ENVIADA",
        expiresAt: { lt: now },
      },
      data: {
        status: "NO_CONFIRMADA",
      },
    })

    const quotes = await prisma.quote.findMany({
      include: { 
        client: true, 
        spaces: true,
        items: { include: { furniture: true } },
        reservation: { include: { payments: true } },
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
    const { clientId, eventDate, endDate, currency, exchangeRate, guestCount, spaces, notes, items } = body

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
      return sum + price
    }, 0)

    const itemsTotal = (items || []).reduce((sum: number, i: any) => {
      const itemTotal = i.quantity * i.unitPrice
      const discount = i.discountType === "PERCENT"
        ? itemTotal * (i.discountValue / 100)
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
        spaces: {
          create: spaces.map((s: any) => ({
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
            notes: s.notes,
          })),
        },
        items: items?.length ? {
          create: items.map((item: any) => {
            const t = item.quantity * item.unitPrice
            const d = item.discountType === "PERCENT" ? t * ((item.discountValue || 0) / 100) : (item.discountValue || 0)
            return {
              productId: item.productId || null,
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              unitPrice: Math.round(item.unitPrice * 100) / 100,
              pricingMode: item.pricingMode || null,
              scheduledDate: item.scheduledDate ? new Date(item.scheduledDate + "T12:00:00") : null,
              startTime: item.startTime || null,
              endTime: item.endTime || null,
              discountType: item.discountType || null,
              discountValue: Math.round((item.discountValue || 0) * 100) / 100,
              totalPrice: Math.round((t - d) * 100) / 100,
            }
          }),
        } : undefined,
      },
      include: { client: true, spaces: true, items: true },
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
