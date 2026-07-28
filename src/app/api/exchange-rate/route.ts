import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requireSession, requirePriceEdit } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireSession()
    if (!guard.ok) return guard.error

    const rate = await prisma.exchangeRate.findFirst({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: rate })
  } catch (error) {
    console.error("Error fetching exchange rate:", error)
    return NextResponse.json({ success: false, error: "Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // El tipo de cambio afecta todos los precios: requiere el permiso
    // transversal de precios (antes no habia ningun guard)
    const guard = await requirePriceEdit()
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { rate } = body

    if (!rate || rate <= 0) {
      return NextResponse.json({ success: false, error: "Tasa inválida" }, { status: 400 })
    }

    const updated = await prisma.exchangeRate.create({
      data: {
        fromCurrency: "USD",
        toCurrency: "GTQ",
        rate,
        updatedBy: guard.session.user?.name || "admin",
      },
    })

    return NextResponse.json({ success: true, data: updated }, { status: 201 })
  } catch (error) {
    console.error("Error updating exchange rate:", error)
    return NextResponse.json({ success: false, error: "Error" }, { status: 500 })
  }
}
