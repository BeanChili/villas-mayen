import { NextRequest, NextResponse } from "next/server"
import { sendClosingEmail } from "@/lib/email"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["quotes", "edit"], ["events", "create"]])
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { quoteId, to } = body

    if (!quoteId || !to) {
      return NextResponse.json({ success: false, error: "quoteId y to son requeridos" }, { status: 400 })
    }

    const result = await sendClosingEmail(quoteId, to)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Error al enviar email" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { sent: true } })
  } catch (error: any) {
    console.error("Error in email send route:", error)
    return NextResponse.json({ success: false, error: error.message || "Error al enviar email" }, { status: 500 })
  }
}
