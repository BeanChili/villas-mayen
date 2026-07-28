import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireAnyPermission([["locations", "view"], ["quotes", "view"]])
    if (!guard.ok) return guard.error

    const location = await prisma.location.findUnique({
      where: { id: params.id },
    })

    if (!location) {
      return NextResponse.json({ success: false, error: "Ubicación no encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: location })
  } catch (error) {
    console.error("Error fetching location:", error)
    return NextResponse.json(
      { success: false, error: "Error al obtener la ubicación" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("locations", "edit")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { name, type, capacity, unitPrice, active } = body

    const location = await prisma.location.update({
      where: { id: params.id },
      data: {
        name,
        type,
        capacity: capacity !== undefined ? (capacity ? parseInt(capacity) : null) : undefined,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
        active: active !== undefined ? active : undefined,
      },
    })

    return NextResponse.json({ success: true, data: location })
  } catch (error) {
    console.error("Error updating location:", error)
    return NextResponse.json(
      { success: false, error: "Error al actualizar la ubicación" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("locations", "delete")
    if (!guard.ok) return guard.error

    // Soft delete
    await prisma.location.update({
      where: { id: params.id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting location:", error)
    return NextResponse.json(
      { success: false, error: "Error al eliminar la ubicación" },
      { status: 500 }
    )
  }
}
