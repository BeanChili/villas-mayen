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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "settings", "update")) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para actualizar ubicaciones" },
        { status: 403 }
      )
    }

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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "settings", "delete")) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para eliminar ubicaciones" },
        { status: 403 }
      )
    }

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
