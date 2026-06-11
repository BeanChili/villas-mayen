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
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = session.user.role as any
    if (!hasPermission(role, "calendar", "update")) {
      return NextResponse.json({ success: false, error: "No tienes permiso para registrar pagos" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { amount, notes, paymentType, referenceNumber } = body

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ success: false, error: "El monto debe ser un numero mayor a 0" }, { status: 400 })
    }

    const quote = await prisma.quote.findUnique({
      where: { id },
    })
    if (!quote) {
      return NextResponse.json({ success: false, error: "Cotizacion no encontrada" }, { status: 404 })
    }

    const totalAmount = quote.totalAmount ?? 0
    const currentPending = Math.max(0, totalAmount - quote.paidAmount)
    if (currentPending <= 0) {
      return NextResponse.json({ success: false, error: "Esta cotizacion ya esta completamente pagada" }, { status: 400 })
    }
    if (amount > currentPending + 0.01) {
      return NextResponse.json({ success: false, error: `El monto no puede superar el pendiente de ${currentPending.toFixed(2)}` }, { status: 400 })
    }

    const safeAmount = Math.min(amount, currentPending)
    const createdByName = session.user?.name ?? "Usuario"

    const updatedQuote = await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          quoteId: id,
          amount: safeAmount,
          currency: quote.currency,
          exchangeRate: quote.exchangeRate,
          amountGTQ: quote.currency === "USD" ? safeAmount * quote.exchangeRate : safeAmount,
          notes: notes ?? null,
          paymentType: paymentType || "EFECTIVO",
          referenceNumber: referenceNumber || null,
          createdByName,
        },
      })

      const allPayments = await tx.payment.findMany({ where: { quoteId: id } })
      const paidAmount = allPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
      const pendingAmount = Math.max(0, totalAmount - paidAmount)
      const paymentStatus =
        paidAmount <= 0 ? "SIN_PAGO" :
        paidAmount >= totalAmount ? "PAGADO" :
        "PARCIAL"

      return tx.quote.update({
        where: { id },
        data: { paidAmount, pendingAmount, paymentStatus },
        include: {
          client: true,
          payments: { orderBy: { createdAt: "asc" } },
        },
      })
    })

    return NextResponse.json({ success: true, data: updatedQuote })
  } catch (error) {
    console.error("Error registering payment:", error)
    return NextResponse.json({ success: false, error: "Error al registrar el pago" }, { status: 500 })
  }
}
