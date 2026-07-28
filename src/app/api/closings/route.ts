import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["closings", "view"]])
    if (!guard.ok) return guard.error

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
    const guard = await requirePermission("events", "create")
    if (!guard.ok) return guard.error

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

    // Get quotes for that date
    const quotes = await prisma.quote.findMany({
      where: {
        OR: [
          { eventDate: { gte: startOfDay, lte: endOfDay } },
          { endDate: { gte: startOfDay, lte: endOfDay } },
          {
            AND: [
              { eventDate: { lte: startOfDay } },
              { endDate: { gte: endOfDay } },
            ],
          },
        ],
      },
      include: { payments: true },
    })

    const totalEvents = quotes.length
    const completedEvents = quotes.filter((q) => q.status === "FINALIZADA").length
    const totalCollected = quotes.reduce((sum, q) => sum + (q.paidAmount || 0), 0)
    const pendingAmount = quotes.reduce((sum, q) => sum + (q.pendingAmount || 0), 0)

    const closing = await prisma.dailyClosing.create({
      data: {
        date: startOfDay,
        totalEvents,
        completedEvents,
        totalCollected,
        pendingAmount,
        incidents: incidents || null,
        createdBy: guard.session.user?.name || "Sistema",
      },
    })

    return NextResponse.json({ success: true, data: closing }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating daily closing:", error)
    return NextResponse.json({ success: false, error: error.message || "Error al crear cierre diario" }, { status: 500 })
  }
}
