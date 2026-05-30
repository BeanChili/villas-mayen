import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const locationType = searchParams.get("locationType")
    const status = searchParams.get("status")

    const where: any = {}

    if (month && year) {
      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)

      // Reservaciones que tienen días dentro de este mes
      where.OR = [
        { startDate: { gte: startOfMonth, lte: endOfMonth } },
        { endDate: { gte: startOfMonth, lte: endOfMonth } },
        {
          AND: [
            { startDate: { lt: startOfMonth } },
            { endDate: { gte: startOfMonth } },
          ],
        },
      ]
    }

    if (locationType) {
      where.locationType = locationType
    }

    if (status) {
      where.status = status
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        client: true,
        user: {
          select: { name: true, username: true },
        },
        payments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { startDate: "asc" },
    })

    return NextResponse.json(reservations)
  } catch (error) {
    console.error("Error fetching reservations:", error)
    return NextResponse.json(
      { error: "Error al obtener las reservaciones" },
      { status: 500 }
    )
  }
}

// POST eliminado — las reservaciones solo se crean automáticamente al confirmar una Quote.
