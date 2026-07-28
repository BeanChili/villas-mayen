import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission } from "@/lib/permissions"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("sellers", "edit")
    if (!guard.ok) return guard.error

    const seller = await prisma.seller.findUnique({ where: { id: params.id } })
    if (!seller) {
      return NextResponse.json({ success: false, error: "Vendedor no encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const { name, phone, active } = body

    if (name && name.trim() && name.trim() !== seller.name) {
      const duplicate = await prisma.seller.findUnique({ where: { name: name.trim() } })
      if (duplicate) {
        return NextResponse.json({ success: false, error: "Ya existe un vendedor con ese nombre" }, { status: 409 })
      }
    }

    const updated = await prisma.seller.update({
      where: { id: params.id },
      data: {
        name: name?.trim() || seller.name,
        phone: phone !== undefined ? phone || null : seller.phone,
        active: active !== undefined ? active === true : seller.active,
      },
      include: { _count: { select: { quotes: true } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error updating seller:", error)
    return NextResponse.json({ success: false, error: "Error al actualizar el vendedor" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("sellers", "delete")
    if (!guard.ok) return guard.error

    const seller = await prisma.seller.findUnique({ where: { id: params.id } })
    if (!seller) {
      return NextResponse.json({ success: false, error: "Vendedor no encontrado" }, { status: 404 })
    }

    // Baja logica: las cotizaciones viejas conservan el sellerName impreso
    await prisma.seller.update({
      where: { id: params.id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting seller:", error)
    return NextResponse.json({ success: false, error: "Error al eliminar el vendedor" }, { status: 500 })
  }
}
