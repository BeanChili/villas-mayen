import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

const SCHEDULE_ORDER = ["MANANA", "TARDE", "NOCHE"]

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "reservations", "create")) {
      return NextResponse.json(
        { error: "No tienes permiso para crear reservaciones" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      clientId,
      reservationType,
      locationType,
      locationId,
      locationName,
      startDate,
      endDate,
      startSchedule,
      endSchedule,
      totalAmount,
      observations,
    } = body

    // Validar campos requeridos
    if (!clientId || !locationType || !locationId || !startDate || !endDate || !startSchedule || !endSchedule) {
      return NextResponse.json(
        { error: "Completá todos los campos obligatorios antes de continuar" },
        { status: 400 }
      )
    }

    const startIdx = SCHEDULE_ORDER.indexOf(startSchedule)
    const endIdx   = SCHEDULE_ORDER.indexOf(endSchedule)

    if (startIdx === -1 || endIdx === -1) {
      return NextResponse.json(
        { error: "Horario inválido. Use MANANA, TARDE o NOCHE" },
        { status: 400 }
      )
    }

    // Derivar array legacy de schedules (del primer horario al último del rango)
    const derivedSchedules = SCHEDULE_ORDER.slice(
      Math.min(startIdx, endIdx),
      Math.max(startIdx, endIdx) + 1
    )

    // Verificar conflictos de disponibilidad
    const potentialConflicts = await prisma.reservation.findMany({
      where: {
        locationId,
        locationType,
        OR: [
          {
            startDate: { lte: new Date(endDate + "T12:00:00") },
            endDate: { gte: new Date(startDate + "T12:00:00") },
          },
        ],
        status: { notIn: ["FINALIZADO", "CANCELADO"] },
      },
    })

    const hasConflict = potentialConflicts.some(existing => {
      const exStartIdx = SCHEDULE_ORDER.indexOf((existing as any).startSchedule ?? "MANANA")
      const exEndIdx   = SCHEDULE_ORDER.indexOf((existing as any).endSchedule ?? "NOCHE")
      const exStart = new Date(existing.startDate)
      const exEnd   = new Date(existing.endDate)
      const newStart = new Date(startDate)
      const newEnd   = new Date(endDate)

      // Sin solapamiento de fechas
      if (newStart > exEnd || newEnd < exStart) return false

      // Si las fechas se tocan solo en un extremo, verificar solapamiento de horarios
      const newStartDay = newStart.toISOString().slice(0, 10)
      const newEndDay   = newEnd.toISOString().slice(0, 10)
      const exStartDay  = exStart.toISOString().slice(0, 10)
      const exEndDay    = exEnd.toISOString().slice(0, 10)

      // Caso: nuevo termina el mismo día que el existente empieza
      if (newEndDay === exStartDay && newEndDay === newStartDay) {
        return endIdx >= exStartIdx
      }
      // Caso: nuevo empieza el mismo día que el existente termina
      if (newStartDay === exEndDay && newStartDay === newEndDay) {
        return startIdx <= exEndIdx
      }

      // Solapamiento multi-día — siempre conflicto
      return true
    })

    if (hasConflict) {
      return NextResponse.json(
        { error: "Ya existe una reservación para este espacio en las fechas/horarios seleccionados" },
        { status: 409 }
      )
    }

    // Verify clientId exists before attempting create
    const clientExists = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } })
    if (!clientExists) {
      return NextResponse.json(
        { error: "El cliente seleccionado no existe. Por favor recargá la página y volvé a intentarlo." },
        { status: 400 }
      )
    }

    // Resolve userId safely — verify the user still exists in DB
    const sessionUserId: string | undefined = (session.user as any).id
    let resolvedUserId: string | undefined = undefined
    if (sessionUserId) {
      const userExists = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true } })
      resolvedUserId = userExists ? sessionUserId : undefined
    }

    const reservation = await prisma.reservation.create({
      data: {
        clientId,
        reservationType: reservationType || "EVENTO",
        locationType,
        locationId,
        locationName,
        startDate: new Date(startDate + "T12:00:00"),
        endDate: new Date(endDate + "T12:00:00"),
        startSchedule,
        endSchedule,
        schedules: JSON.stringify(derivedSchedules),
        totalAmount: Math.round((totalAmount || 0) * 100) / 100,
        paidAmount: 0,
        pendingAmount: Math.round((totalAmount || 0) * 100) / 100,
        status: "COTIZADO",
        paymentStatus: "SIN_PAGO",
        observations,
        userId: resolvedUserId,
      } as any,
      include: {
        client: true,
      },
    })

    return NextResponse.json(reservation, { status: 201 })
  } catch (error) {
    console.error("Error creating reservation:", error)
    return NextResponse.json(
      { error: "Error al crear la reservación" },
      { status: 500 }
    )
  }
}
