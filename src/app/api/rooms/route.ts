import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["rooms", "view"], ["quotes", "view"], ["reports_ocupacion", "view"], ["calendar", "view"]])
    if (!guard.ok) return guard.error

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
    } = body

    if (!floorId || !number) {
      return NextResponse.json({ success: false, error: "Piso y número son requeridos" }, { status: 400 })
    }

    const room = await prisma.room.create({
      data: {
        floorId,
        number,
        capacity: capacity ? parseInt(capacity, 10) : null,
        bedType: bedType || null,
        pricePerNight: pricePerNight ? parseFloat(pricePerNight) : null,
        pricePerPerson: pricePerPerson ? parseFloat(pricePerPerson) : null,
        status: status || "DISPONIBLE",
        active: active !== undefined ? active : true,
      },
    })

    return NextResponse.json({ success: true, data: room }, { status: 201 })
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ success: false, error: "Error al crear habitación" }, { status: 500 })
  }
}
