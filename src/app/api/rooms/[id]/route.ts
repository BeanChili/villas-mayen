import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireAnyPermission([["rooms", "view"], ["quotes", "view"]])
    if (!guard.ok) return guard.error

    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: { floor: { include: { building: true } } },
    })

    if (!room) {
      return NextResponse.json({ success: false, error: "Habitación no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: room })
  } catch (error) {
    console.error("Error fetching room:", error)
    return NextResponse.json({ success: false, error: "Error al obtener habitación" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("rooms", "edit")
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

    const data: any = {}
    if (floorId !== undefined) data.floorId = floorId
    if (number !== undefined) data.number = number
    if (capacity !== undefined) data.capacity = capacity ? parseInt(capacity, 10) : null
    if (bedType !== undefined) data.bedType = bedType || null
    if (pricePerNight !== undefined) data.pricePerNight = pricePerNight ? parseFloat(pricePerNight) : null
    if (pricePerPerson !== undefined) data.pricePerPerson = pricePerPerson ? parseFloat(pricePerPerson) : null
    if (status !== undefined) data.status = status
    if (active !== undefined) data.active = active

    const room = await prisma.room.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ success: true, data: room })
  } catch (error) {
    console.error("Error updating room:", error)
    return NextResponse.json({ success: false, error: "Error al actualizar habitación" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("rooms", "delete")
    if (!guard.ok) return guard.error

    await prisma.room.update({
      where: { id: params.id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting room:", error)
    return NextResponse.json({ success: false, error: "Error al eliminar habitación" }, { status: 500 })
  }
}
