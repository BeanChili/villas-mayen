import prisma from "./db"
import { formatCurrencyByCode } from "./utils"

// El envio real esta apagado por defecto: se registra el mail en EmailLog y
// listo. Para mandar de verdad hay que setear EMAIL_SENDING_ENABLED=true y
// RESEND_API_KEY en el entorno.

function emailSendingEnabled(): boolean {
  return process.env.EMAIL_SENDING_ENABLED === "true" && !!process.env.RESEND_API_KEY
}

async function deliverEmail(to: string, subject: string, html: string): Promise<void> {
  if (!emailSendingEnabled()) return
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Villas Magen <onboarding@resend.dev>",
    to,
    subject,
    html,
  })
  if (error) throw new Error(error.message)
}

/**
 * Registra (y si esta habilitado, envia) el mail de una cotizacion al cliente.
 * Siempre deja constancia en EmailLog, incluso con el envio apagado.
 */
export async function sendQuoteEmail(
  quoteId: string,
  to: string,
  sentBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { client: true, spaces: true },
    })
    if (!quote) {
      return { success: false, error: "Cotización no encontrada" }
    }

    const total = formatCurrencyByCode(quote.totalAmount, quote.currency)
    const fecha = new Date(quote.eventDate).toLocaleDateString("es-GT")
    const espacios = quote.spaces.map((s) => s.locationName).filter(Boolean).join(", ")
    const subject = `Cotización ${quote.code || ""} Villas Magen - ${quote.client.name}`.replace(/\s+/g, " ")
    const html = `
      <h2>Cotización ${quote.code || ""} - Villas Magen</h2>
      <p><strong>Cliente:</strong> ${quote.client.name}</p>
      <p><strong>Fecha del evento:</strong> ${fecha}</p>
      ${espacios ? `<p><strong>Espacios:</strong> ${espacios}</p>` : ""}
      <p><strong>Total:</strong> ${total}</p>
      <p>Gracias por su preferencia.</p>
    `

    await deliverEmail(to, subject, html)

    await prisma.emailLog.create({
      data: {
        quoteId,
        type: "SENT_TO_CLIENT",
        sentTo: to,
        sentBy,
        status: "SENT",
      },
    })

    return { success: true }
  } catch (error: any) {
    console.error("Error sending quote email:", error)
    try {
      await prisma.emailLog.create({
        data: {
          quoteId,
          type: "SENT_TO_CLIENT",
          sentTo: to,
          sentBy,
          status: "FAILED",
          error: error.message || "Error desconocido",
        },
      })
    } catch {}
    return { success: false, error: error.message || "Error al enviar email" }
  }
}

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
      <h2>Resumen de Liquidación - Villas Magen</h2>
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
    //   from: "Villas Magen <no-reply@villasmagen.com>",
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
