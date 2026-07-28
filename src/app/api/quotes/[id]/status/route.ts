import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"
import { isValidTransition, isValidEmail } from "@/lib/utils"
import { sendQuoteEmail } from "@/lib/email"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("quotes", "edit")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { status, advancePayment, clientEmail } = body

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
    const createdByName = guard.session.user?.name ?? "Usuario"

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
              notes: "Anticipo por confirmación de cotización",
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

    // ENVIADA: registra el mail del cliente y deja constancia en EmailLog.
    // El envio real depende de EMAIL_SENDING_ENABLED (apagado por defecto).
    if (status === "ENVIADA") {
      const email = typeof clientEmail === "string" ? clientEmail.trim() : ""
      if (email && !isValidEmail(email)) {
        return NextResponse.json(
          { success: false, error: "El formato del correo no es válido" },
          { status: 400 }
        )
      }

      const updated = await prisma.quote.update({
        where: { id: params.id },
        data: { status, sentAt: now, ...(email ? { clientEmail: email } : {}) },
        include: { client: true },
      })

      if (email) {
        // Si el cliente no tenia mail cargado, se le copia este
        if (!updated.client.email) {
          await prisma.client.update({
            where: { id: updated.clientId },
            data: { email },
          })
        }
        await sendQuoteEmail(params.id, email, createdByName)
      }

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
