import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const where: any = {}

    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from + "T12:00:00")
      if (to) where.date.lte = new Date(to + "T12:00:00")
    }

    const closings = await prisma.dailyClosing.findMany({
      where,
      orderBy: { date: "desc" },
    })

    return NextResponse.json({ success: true, data: closings })
  } catch (error) {
    console.error("Error fetching daily closings:", error)
    return NextResponse.json({ success: false, error: "Error al obtener cierres diarios" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "events", "create")) {
      return NextResponse.json({ success: false, error: "Sin permiso" }, { status: 403 })
    }

    const body = await request.json()
    const { date, incidents } = body

    if (!date) {
      return NextResponse.json({ success: false, error: "Fecha requerida" }, { status: 400 })
    }

    const targetDate = new Date(date + "T12:00:00")
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59)

    // Check if already exists
    const existing = await prisma.dailyClosing.findUnique({
      where: { date: startOfDay },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: "Ya existe un cierre para esta fecha" }, { status: 409 })
    }

    // Get reservations for that date
    const reservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { startDate: { gte: startOfDay, lte: endOfDay } },
          { endDate: { gte: startOfDay, lte: endOfDay } },
          {
            AND: [
              { startDate: { lte: startOfDay } },
              { endDate: { gte: endOfDay } },
            ],
          },
        ],
      },
      include: { payments: true },
    })

    const totalEvents = reservations.length
    const completedEvents = reservations.filter((r) => r.status === "FINALIZADO").length
    const totalCollected = reservations.reduce((sum, r) => sum + (r.paidAmount || 0), 0)
    const pendingAmount = reservations.reduce((sum, r) => sum + (r.pendingAmount || 0), 0)

    const closing = await prisma.dailyClosing.create({
      data: {
        date: startOfDay,
        totalEvents,
        completedEvents,
        totalCollected,
        pendingAmount,
        incidents: incidents || null,
        createdBy: session.user?.name || "Sistema",
      },
    })

    return NextResponse.json({ success: true, data: closing }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating daily closing:", error)
    return NextResponse.json({ success: false, error: error.message || "Error al crear cierre diario" }, { status: 500 })
  }
}
