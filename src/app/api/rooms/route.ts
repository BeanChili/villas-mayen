import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"
import { sweepRoomMaintenance } from "@/lib/rooms"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["rooms", "view"], ["quotes", "view"], ["reports_ocupacion", "view"], ["calendar", "view"]])
    if (!guard.ok) return guard.error

    // Barrido perezoso: mantenimientos vencidos vuelven a DISPONIBLE
    await sweepRoomMaintenance()

    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get("buildingId")
    const floorId = searchParams.get("floorId")
    const status = searchParams.get("status")
    const includeInactive = searchParams.get("includeInactive") === "true"

    const where: any = {}
    if (floorId) {
      where.floorId = floorId
    } else if (buildingId) {
      where.floor = { buildingId }
    }
    if (status) where.status = status
    if (!includeInactive) where.active = true

    const rooms = await prisma.room.findMany({
      where,
      include: { floor: { include: { building: true } } },
      orderBy: { number: "asc" },
    })

    return NextResponse.json({ success: true, data: rooms })
  } catch (error) {
    console.error("Error fetching rooms:", error)
    return NextResponse.json({ success: false, error: "Error al obtener habitaciones" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission("rooms", "create")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const {
      floorId,
      number,
      capacity,
      bedType,
      pricePerNight,
      pricePerPerson,
      status,
      active,
      description,
      maintenanceWork,
      maintenanceEndDate,
    } = body

    if (!floorId || !number) {
      return NextResponse.json({ success: false, error: "Piso y número son requeridos" }, { status: 400 })
    }

    const estado = status || "DISPONIBLE"
    const enMantenimiento = estado === "MANTENIMIENTO"
    if (enMantenimiento && (!maintenanceWork?.trim() || !maintenanceEndDate)) {
      return NextResponse.json(
        { success: false, error: "En mantenimiento hay que indicar el trabajo y la fecha de fin" },
        { status: 400 }
      )
    }
    const fechaFin = enMantenimiento ? new Date(maintenanceEndDate + "T12:00:00") : null
    if (enMantenimiento && isNaN(fechaFin!.getTime())) {
      return NextResponse.json({ success: false, error: "Fecha de fin inválida" }, { status: 400 })
    }

    const room = await prisma.room.create({
      data: {
        floorId,
        number,
        capacity: capacity ? parseInt(capacity, 10) : null,
        bedType: bedType || null,
        pricePerNight: pricePerNight ? parseFloat(pricePerNight) : null,
        pricePerPerson: pricePerPerson ? parseFloat(pricePerPerson) : null,
        status: estado,
        active: active !== undefined ? active : true,
        description: description?.trim() || null,
        maintenanceWork: enMantenimiento ? maintenanceWork.trim() : null,
        maintenanceEndDate: fechaFin,
      },
    })

    return NextResponse.json({ success: true, data: room }, { status: 201 })
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ success: false, error: "Error al crear habitación" }, { status: 500 })
  }
}
