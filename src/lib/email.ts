// Skeleton email service using Resend
// Install: npm install resend
// Set RESEND_API_KEY in environment variables

// Uncomment when resend is installed:
// import { Resend } from "resend"
// const resend = new Resend(process.env.RESEND_API_KEY || "placeholder")

import prisma from "./db"

export interface ClosingEmailData {
  quoteId: string
  clientName: string
  eventDate: string
  totalAmount: number
  currency: string
  paidAmount: number
  pendingAmount: number
  damageCost: number
  lossCost: number
  closingObservations?: string
}

export async function sendClosingEmail(quoteId: string, to: string): Promise<{ success: boolean; error?: string }> {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        client: true,
        payments: true,
        eventClosing: { include: { items: { include: { furniture: true } } } },
      },
    })

    if (!quote) {
      return { success: false, error: "Cotización no encontrada" }
    }

    const closing = quote.eventClosing

    const emailData: ClosingEmailData = {
      quoteId: quote.id,
      clientName: quote.client.name,
      eventDate: quote.eventDate.toISOString(),
      totalAmount: quote.totalAmount,
      currency: quote.currency,
      paidAmount: quote.paidAmount || 0,
      pendingAmount: quote.pendingAmount || 0,
      damageCost: closing?.damageCost || 0,
      lossCost: closing?.lossCost || 0,
      closingObservations: closing?.observations || undefined,
    }

    // Build email HTML summary
    const html = `
      <h2>Resumen de Liquidación - Villas Mayen</h2>
      <p><strong>Cliente:</strong> ${emailData.clientName}</p>
      <p><strong>Fecha del evento:</strong> ${new Date(emailData.eventDate).toLocaleDateString("es-GT")}</p>
      <hr/>
      <p><strong>Total Cotizado:</strong> ${emailData.totalAmount.toFixed(2)} ${emailData.currency}</p>
      <p><strong>Pagado:</strong> ${emailData.paidAmount.toFixed(2)} ${emailData.currency}</p>
      <p><strong>Pendiente:</strong> ${emailData.pendingAmount.toFixed(2)} ${emailData.currency}</p>
      <p><strong>Daños:</strong> ${emailData.damageCost.toFixed(2)} ${emailData.currency}</p>
      <p><strong>Pérdidas:</strong> ${emailData.lossCost.toFixed(2)} ${emailData.currency}</p>
      ${emailData.closingObservations ? `<p><strong>Observaciones:</strong> ${emailData.closingObservations}</p>` : ""}
    `

    const subject = `Liquidación ${quote.client.name} - ${new Date(quote.eventDate).toLocaleDateString("es-GT")}`

    // When Resend is available, uncomment below:
    // await resend.emails.send({
    //   from: "Villas Mayen <no-reply@villasmayen.com>",
    //   to,
    //   subject,
    //   html,
    // })

    // Log to EmailLog
    await prisma.emailLog.create({
      data: {
        quoteId,
        type: "SENT_TO_ACCOUNTING",
        sentTo: to,
        sentBy: "Sistema",
        status: "SENT",
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error("Error sending closing email:", error)

    // Log failure
    try {
      await prisma.emailLog.create({
        data: {
          quoteId,
          type: "SENT_TO_ACCOUNTING",
          sentTo: to,
          sentBy: "Sistema",
          status: "FAILED",
          error: error.message || "Error desconocido",
        },
      })
    } catch {}

    return { success: false, error: error.message || "Error al enviar email" }
  }
}
