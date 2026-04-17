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
    const type = searchParams.get("type")

    const locations: any[] = []

    if (!type || type === "FREE_AREA") {
      const freeAreas = await prisma.freeArea.findMany({
        where: { active: true },
        select: { id: true, name: true, capacity: true },
      })
      locations.push(...freeAreas.map(area => ({ ...area, type: "FREE_AREA" })))
    }

    if (!type || type === "DINING_ROOM") {
      const diningRooms = await prisma.diningRoom.findMany({
        where: { active: true },
        select: { id: true, name: true, capacity: true },
      })
      locations.push(...diningRooms.map(room => ({ ...room, type: "DINING_ROOM" })))
    }

    if (!type || type === "HALL") {
      const halls = await prisma.hall.findMany({
        where: { active: true },
        select: { id: true, name: true, capacity: true, type: true },
      })
      locations.push(...halls.map(hall => ({ ...hall, type: "HALL" })))
    }

    if (!type || type === "ROOM") {
      const rooms = await prisma.room.findMany({
        where: { active: true },
        select: { id: true, number: true, capacity: true, bedType: true, pricePerNight: true, status: true, floorId: true },
        take: 50,
      })
      const floors = await prisma.floor.findMany({
        include: { building: true },
      })
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

    if (!type || type === "GARDEN") {
      const gardens = await prisma.garden.findMany({
        where: { active: true },
        select: { id: true, name: true, capacity: true },
      })
      locations.push(...gardens.map(garden => ({ ...garden, type: "GARDEN" })))
    }

    return NextResponse.json(locations)
  } catch (error) {
    console.error("Error fetching locations:", error)
    return NextResponse.json(
      { error: "Error al obtener las ubicaciones" },
      { status: 500 }
    )
  }
}