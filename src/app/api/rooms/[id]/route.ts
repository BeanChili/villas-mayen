import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "rooms", "update")) {
      return NextResponse.json({ success: false, error: "No tienes permiso para actualizar habitaciones" }, { status: 403 })
    }

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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "rooms", "delete")) {
      return NextResponse.json({ success: false, error: "No tienes permiso para eliminar habitaciones" }, { status: 403 })
    }

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
