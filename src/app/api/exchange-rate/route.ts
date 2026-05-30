import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

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
        updatedBy: session.user?.name || "admin",
      },
    })

    return NextResponse.json({ success: true, data: updated }, { status: 201 })
  } catch (error) {
    console.error("Error updating exchange rate:", error)
    return NextResponse.json({ success: false, error: "Error" }, { status: 500 })
  }
}
