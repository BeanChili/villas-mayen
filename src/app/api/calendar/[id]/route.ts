import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const role = session.user.role as any
    if (!hasPermission(role, "calendar", "update")) {
      return NextResponse.json({ success: false, error: "No tienes permiso para modificar" }, { status: 403 })
    }

    const body = await request.json()
    const { status, totalAmount, paidAmount, notes } = body

    const updateData: any = {}

    if (status) {
      const validStatuses = ["BORRADOR", "ENVIADA", "NO_CONFIRMADA", "CONFIRMADA", "EN_EJECUCION", "FINALIZADA", "CANCELADO"]
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ success: false, error: "Estado invalido" }, { status: 400 })
      }
      updateData.status = status
    }

    // Si solo se envía totalAmount, preservar el paidAmount actual de la DB
    if (typeof totalAmount === "number") {
      const existing = await prisma.quote.findUnique({ where: { id }, select: { paidAmount: true } })
      updateData.totalAmount = totalAmount
      updateData.pendingAmount = totalAmount - (existing?.paidAmount ?? 0)
    }

    if (typeof paidAmount === "number") {
      updateData.paidAmount = paidAmount
      updateData.pendingAmount = (totalAmount ?? 0) - paidAmount
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        payments: { orderBy: { createdAt: "asc" } },
        spaces: true,
      },
    })

    return NextResponse.json({ success: true, data: quote })
  } catch (error) {
    console.error("Error updating quote:", error)
    return NextResponse.json({ success: false, error: "Error al actualizar" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = session.user.role as any
    if (!hasPermission(role, "calendar", "read")) {
      return NextResponse.json({ success: false, error: "Sin permiso" }, { status: 403 })
    }

    const { id } = await params

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        payments: { orderBy: { createdAt: "asc" } },
        spaces: true,
        items: true,
        eventClosing: { include: { items: true } },
      },
    })

    if (!quote) {
      return NextResponse.json({ success: false, error: "Cotizacion no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: quote })
  } catch (error) {
    console.error("Error fetching quote:", error)
    return NextResponse.json({ success: false, error: "Error al obtener la cotizacion" }, { status: 500 })
  }
}
