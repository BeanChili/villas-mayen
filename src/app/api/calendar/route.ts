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

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const status = searchParams.get("status")

    const where: any = {}

    if (month && year) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

      where.OR = [
        { eventDate: { gte: startOfMonth, lte: endOfMonth } },
        { endDate: { gte: startOfMonth, lte: endOfMonth } },
        {
          AND: [
            { eventDate: { lt: startOfMonth } },
            { endDate: { gte: startOfMonth } },
          ],
        },
      ]
    }

    if (status) {
      where.status = status
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        client: true,
        payments: { orderBy: { createdAt: "asc" } },
        spaces: { include: { quote: false } },
      },
      orderBy: { eventDate: "asc" },
    })

    return NextResponse.json({ success: true, data: quotes })
  } catch (error) {
    console.error("Error fetching calendar:", error)
    return NextResponse.json(
      { success: false, error: "Error al obtener las reservaciones" },
      { status: 500 }
    )
  }
}
