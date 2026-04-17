import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "reservations", "update")) {
      return NextResponse.json(
        { error: "No tienes permiso para registrar pagos" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { amount, notes } = body

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser un numero mayor a 0" },
        { status: 400 }
      )
    }

    const reservation = await prisma.reservation.findUnique({ where: { id } })
    if (!reservation) {
      return NextResponse.json({ error: "Reservacion no encontrada" }, { status: 404 })
    }

    // Cap: no se puede pagar mas del monto pendiente
    const currentPending = Math.max(0, reservation.totalAmount - reservation.paidAmount)
    if (currentPending <= 0) {
      return NextResponse.json(
        { error: "Esta reservacion ya esta completamente pagada" },
        { status: 400 }
      )
    }
    if (amount > currentPending + 0.01) {
      return NextResponse.json(
        { error: `El monto no puede superar el pendiente de ${currentPending.toFixed(2)}` },
        { status: 400 }
      )
    }

    const safeAmount = Math.min(amount, currentPending)
    const createdByName = session.user?.name ?? "Usuario"

    const updatedReservation = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: { reservationId: id, amount: safeAmount, notes: notes ?? null, createdByName },
      })

      const allPayments = await tx.payment.findMany({ where: { reservationId: id } })
      const paidAmount = allPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
      const pendingAmount = Math.max(0, reservation.totalAmount - paidAmount)
      const paymentStatus =
        paidAmount <= 0 ? "SIN_PAGO" :
        paidAmount >= reservation.totalAmount ? "PAGADO" :
        "PARCIAL"

      return tx.reservation.update({
        where: { id },
        data: { paidAmount, pendingAmount, paymentStatus },
        include: {
          client: true,
          payments: { orderBy: { createdAt: "asc" } },
        },
      })
    })

    return NextResponse.json(updatedReservation)
  } catch (error) {
    console.error("Error registering payment:", error)
    return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 })
  }
}