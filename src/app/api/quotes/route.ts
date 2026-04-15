import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const quotes = await prisma.quote.findMany({
      include: {
        client: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error("Error fetching quotes:", error)
    return NextResponse.json(
      { error: "Error al obtener las cotizaciones" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "quotes", "create")) {
      return NextResponse.json(
        { error: "No tienes permiso para crear cotizaciones" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      clientId,
      eventDate,
      locationType,
      locationId,
      locationName,
      schedules,
      notes,
      totalAmount,
      items,
    } = body

    if (!clientId || !eventDate || !locationType || !locationId) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const quote = await prisma.quote.create({
      data: {
        clientId,
        eventDate: new Date(eventDate),
        locationType,
        locationId,
        locationName,
        schedules: JSON.stringify(schedules),
        notes,
        totalAmount,
        status: "BORRADOR",
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        client: true,
        items: true,
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    console.error("Error creating quote:", error)
    return NextResponse.json(
      { error: "Error al crear la cotización" },
      { status: 500 }
    )
  }
}