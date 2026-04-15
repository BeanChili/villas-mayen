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
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        items: {
          include: { product: true },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Cotización no encontrada" }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error("Error fetching quote:", error)
    return NextResponse.json(
      { error: "Error al obtener la cotización" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "quotes", "update")) {
      return NextResponse.json(
        { error: "No tienes permiso para actualizar cotizaciones" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { notes, items, totalAmount } = body

    // Delete existing items and recreate
    await prisma.quoteItem.deleteMany({ where: { quoteId: params.id } })

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: {
        notes,
        totalAmount,
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
        items: true,
      },
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error("Error updating quote:", error)
    return NextResponse.json(
      { error: "Error al actualizar la cotización" },
      { status: 500 }
    )
  }
}