import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission } from "@/lib/permissions"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("categories", "delete")
    if (!guard.ok) return guard.error

    await prisma.category.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al eliminar" }, { status: 500 })
  }
}
