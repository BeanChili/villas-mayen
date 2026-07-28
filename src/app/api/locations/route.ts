import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["locations", "view"], ["quotes", "view"], ["quotes", "create"], ["reports_ocupacion", "view"]])
    if (!guard.ok) return guard.error

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    const locations: any[] = []

    // Location unificado (FREE_AREA, DINING_ROOM, HALL, GARDEN, TERRACE)
    const locationWhere: any = { active: true }
    if (type && type !== "ROOM") {
      locationWhere.type = type
    }

    if (!type || type !== "ROOM") {
      const locs = await prisma.location.findMany({
        where: locationWhere,
        select: { id: true, name: true, type: true, capacity: true, unitPrice: true, active: true },
      })
      locations.push(...locs)
    }

    // Habitaciones (modelo separado)
    if (!type || type === "ROOM") {
      const rooms = await prisma.room.findMany({
        where: { active: true },
        select: { id: true, number: true, capacity: true, bedType: true, pricePerNight: true, pricePerPerson: true, status: true, floorId: true },
        take: 50,
      })
      const floors = await prisma.floor.findMany({ include: { building: true } })
      const floorMap = new Map(floors.map(f => [f.id, f]))
      locations.push(...rooms.map(room => {
        const floor = floorMap.get(room.floorId)
        return {
          id: room.id,
          name: `Hab ${room.number} - ${floor?.building.name || ''} Piso ${floor?.level}`,
          capacity: room.capacity,
          type: "ROOM",
          building: floor?.building.name,
          level: floor?.level,
        }
      }))
    }

    return NextResponse.json({ success: true, data: locations })
  } catch (error) {
    console.error("Error fetching locations:", error)
    return NextResponse.json({ success: false, error: "Error al obtener ubicaciones" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission("locations", "create")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { name, type, capacity, unitPrice, active } = body

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const location = await prisma.location.create({
      data: {
        name,
        type,
        capacity: capacity ? parseInt(capacity) : null,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : 0,
        active: active ?? true,
      },
    })

    return NextResponse.json({ success: true, data: location }, { status: 201 })
  } catch (error) {
    console.error("Error creating location:", error)
    return NextResponse.json(
      { success: false, error: "Error al crear la ubicación" },
      { status: 500 }
    )
  }
}
