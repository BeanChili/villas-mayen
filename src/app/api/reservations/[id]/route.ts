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
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const body = await request.json()
    const { status, totalAmount, paidAmount, observations } = body

    // Solo ADMIN y RECEPCIONISTA pueden modificar reservaciones
    const role = (session.user as any).role as any
    if (!hasPermission(role, "reservations", "update")) {
      return NextResponse.json(
        { error: "No tienes permiso para modificar reservaciones" },
        { status: 403 }
      )
    }

    // Construir datos a actualizar
    const updateData: any = {}

    if (status) {
      // Validar estado válido
      const validStatuses = [
        "COTIZADO", "ANTICIPO", "DEPOSITO", "SALDO",
        "TOTAL_CANCELADO", "EN_EJECUCION", "FINALIZADO", "FINALIZADO_COBRO"
      ]
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
      }
      updateData.status = status

      // Si se marca como pagada completamente, actualizar paymentStatus
      if (status === "FINALIZADO_COBRO") {
        updateData.paymentStatus = "FINALIZADO_COBRO"
      }
    }

    if (typeof totalAmount === "number") {
      updateData.totalAmount = totalAmount
      updateData.pendingAmount = paidAmount !== undefined 
        ? totalAmount - paidAmount 
        : (updateData.pendingAmount ?? 0)
    }

    if (typeof paidAmount === "number") {
      updateData.paidAmount = paidAmount
      if (totalAmount !== undefined) {
        updateData.pendingAmount = totalAmount - paidAmount
      }
    }

    if (observations !== undefined) {
      updateData.observations = observations
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
      },
    })

    return NextResponse.json(reservation)
  } catch (error) {
    console.error("Error updating reservation:", error)
    return NextResponse.json(
      { error: "Error al actualizar la reservación" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params

    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        client: true,
        user: {
          select: { name: true, username: true },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservación no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(reservation)
  } catch (error) {
    console.error("Error fetching reservation:", error)
    return NextResponse.json(
      { error: "Error al obtener la reservación" },
      { status: 500 }
    )
  }
}