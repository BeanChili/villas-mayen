import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })

    const role = session.user.role as any
    if (!hasPermission(role, "settings", "delete")) {
      return NextResponse.json({ success: false, error: "Sin permiso" }, { status: 403 })
    }

    await prisma.category.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: "Error al eliminar" }, { status: 500 })
  }
}
