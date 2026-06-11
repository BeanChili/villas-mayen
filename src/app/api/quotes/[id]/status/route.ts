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
    const { status, advancePayment } = body

    if (!status) {
      return NextResponse.json({ success: false, error: "Status requerido" }, { status: 400 })
    }

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      select: { status: true },
    })

    if (!quote) {
      return NextResponse.json({ success: false, error: "Cotización no encontrada" }, { status: 404 })
    }

    if (!isValidTransition(quote.status, status)) {
      return NextResponse.json({
        success: false,
        error: `Transición no válida: ${quote.status} → ${status}`,
      }, { status: 400 })
    }

    const now = new Date()
    const createdByName = session.user?.name ?? "Usuario"

    // CONFIRMADA → actualizar Quote con datos de pago
    if (status === "CONFIRMADA") {
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.quote.findUnique({
          where: { id: params.id },
          select: { totalAmount: true, currency: true, exchangeRate: true },
        })
        const totalAmount = current!.totalAmount || 0
        const advance = advancePayment ? Math.min(Number(advancePayment), totalAmount) : 0

        const updated = await tx.quote.update({
          where: { id: params.id },
          data: {
            status,
            confirmedAt: now,
            confirmationDate: now,
            paymentStatus: advance > 0 ? (advance >= totalAmount ? "PAGADO" : "PARCIAL") : "SIN_PAGO",
            paidAmount: advance,
            pendingAmount: totalAmount - advance,
          },
        })

        // Si hay anticipo, registrar el pago
        if (advance > 0) {
          await tx.payment.create({
            data: {
              quoteId: updated.id,
              amount: advance,
              currency: current!.currency,
              exchangeRate: current!.exchangeRate,
              amountGTQ: current!.currency === "USD" ? advance * current!.exchangeRate : advance,
              notes: "Anticipo — Cotización confirmada",
              createdByName,
            },
          })
        }

        return updated
      })

      return NextResponse.json({ success: true, data: result })
    }

    // CANCELADO
    if (status === "CANCELADO") {
      const updated = await prisma.quote.update({
        where: { id: params.id },
        data: { status, cancelledAt: now },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    // ENVIADA
    if (status === "ENVIADA") {
      const updated = await prisma.quote.update({
        where: { id: params.id },
        data: { status, sentAt: now },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    // EN_EJECUCION
    if (status === "EN_EJECUCION") {
      const updated = await prisma.quote.update({
        where: { id: params.id },
        data: { status, executedAt: now, executionDate: now },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    // FINALIZADA
    if (status === "FINALIZADA") {
      const updated = await prisma.quote.update({
        where: { id: params.id },
        data: { status, finishedAt: now, completionDate: now },
      })
      return NextResponse.json({ success: true, data: updated })
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
