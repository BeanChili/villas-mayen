import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sendClosingEmail } from "@/lib/email"
import { hasPermission } from "@/types"

export async function POST(request: NextRequest) {
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
