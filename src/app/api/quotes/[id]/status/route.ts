import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"
import { isValidTransition } from "@/lib/utils"

export async function PATCH(
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
    const { status } = body

    if (!status) {
      return NextResponse.json({ success: false, error: "Status requerido" }, { status: 400 })
    }

    let quote = await prisma.quote.findUnique({
      where: { id: params.id },
      select: { status: true, reservationId: true, expiresAt: true },
    })

    if (!quote) {
      return NextResponse.json({ success: false, error: "Cotización no encontrada" }, { status: 404 })
    }

    // Auto-expirar si está ENVIADA y ya venció (CP-04)
    const now = new Date()
    if (quote.status === "ENVIADA" && quote.expiresAt && quote.expiresAt < now) {
      quote = await prisma.quote.update({
        where: { id: params.id },
        data: { status: "NO_CONFIRMADA" },
        select: { status: true, reservationId: true, expiresAt: true },
      })
    }

    if (!isValidTransition(quote.status, status)) {
      return NextResponse.json({
        success: false,
        error: `Transición no válida: ${quote.status} → ${status}`,
      }, { status: 400 })
    }

    // CONFIRMADA → crear Reservation automáticamente (con $transaction)
    if (status === "CONFIRMADA") {
      const result = await prisma.$transaction(async (tx) => {
        // Verificar que no tenga ya reservation (race condition)
        const current = await tx.quote.findUnique({
          where: { id: params.id },
          select: { reservationId: true, clientId: true, eventDate: true, endDate: true, guestCount: true, currency: true, exchangeRate: true, subtotal: true, totalAmount: true },
        })
        if (current?.reservationId) {
          throw new Error("Ya existe una reservación para esta cotización")
        }

        // Crear Reservation
        const reservation = await tx.reservation.create({
          data: {
            clientId: current!.clientId,
            startDate: current!.eventDate,
            endDate: current!.endDate || current!.eventDate,
            currency: current!.currency,
            exchangeRate: current!.exchangeRate,
            guestCount: current!.guestCount,
            status: "COTIZADO",
            paymentStatus: "SIN_PAGO",
            paidAmount: 0,
            pendingAmount: current!.totalAmount,
          },
        })

        // Actualizar Quote
        const updated = await tx.quote.update({
          where: { id: params.id },
          data: { status, confirmedAt: now, reservationId: reservation.id },
        })

        return { quote: updated, reservation }
      })

      return NextResponse.json({ success: true, data: result })
    }

    // CANCELADO
    if (status === "CANCELADO") {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.quote.update({
          where: { id: params.id },
          data: { status, cancelledAt: now },
        })

        // Si tiene Reservation, cancelarla también
        if (quote.reservationId) {
          await tx.reservation.update({
            where: { id: quote.reservationId },
            data: { status: "CANCELADO" },
          })
        }

        return updated
      })

      return NextResponse.json({ success: true, data: result })
    }

    // ENVIADA
    if (status === "ENVIADA") {
      const updated = await prisma.quote.update({
        where: { id: params.id },
        data: {
          status,
          sentAt: now,
          expiresAt: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 días calendario
        },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    // EN_EJECUCION
    if (status === "EN_EJECUCION") {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.quote.update({
          where: { id: params.id },
          data: { status, executedAt: now },
        })
        // Update linked reservation status
        if (quote.reservationId) {
          await tx.reservation.update({
            where: { id: quote.reservationId },
            data: { status: "EN_EJECUCION" },
          })
        }
        return updated
      })
      return NextResponse.json({ success: true, data: result })
    }

    // FINALIZADA
    if (status === "FINALIZADA") {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.quote.update({
          where: { id: params.id },
          data: { status, finishedAt: now },
        })
        // Update linked reservation status
        if (quote.reservationId) {
          await tx.reservation.update({
            where: { id: quote.reservationId },
            data: { status: "FINALIZADO" },
          })
        }
        return updated
      })
      return NextResponse.json({ success: true, data: result })
    }

    // NO_CONFIRMADA
    if (status === "NO_CONFIRMADA") {
      const updated = await prisma.quote.update({
        where: { id: params.id },
        data: { status },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: false, error: "Estado no manejado" }, { status: 400 })

  } catch (error: any) {
    console.error("Error changing quote status:", error)
    return NextResponse.json({
      success: false,
      error: error.message || "Error al cambiar estado",
    }, { status: 500 })
  }
}
