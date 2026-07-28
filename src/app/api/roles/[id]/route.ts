import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import {
  requirePermission,
  invalidatePermissionCache,
  sanitizePermissions,
} from "@/lib/permissions"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("roles", "edit")
    if (!guard.ok) return guard.error

    const role = await prisma.role.findUnique({ where: { id: params.id } })
    if (!role) {
      return NextResponse.json({ success: false, error: "Rol no encontrado" }, { status: 404 })
    }
    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: "El rol Superadmin no se puede modificar" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description, canEditPrices, permissions } = body

    if (name && name.trim() && name.trim() !== role.name) {
      const duplicate = await prisma.role.findFirst({
        where: { name: name.trim(), id: { not: role.id } },
      })
      if (duplicate) {
        return NextResponse.json({ success: false, error: "Ya existe un rol con ese nombre" }, { status: 409 })
      }
    }

    const rows = sanitizePermissions(permissions)

    const updated = await prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id: role.id },
        data: {
          name: name?.trim() || role.name,
          description: description !== undefined ? description || null : role.description,
          canEditPrices: canEditPrices !== undefined ? canEditPrices === true : role.canEditPrices,
        },
      })

      if (Array.isArray(permissions)) {
        // Reemplazo total de la matriz: lo que no venga queda sin acceso
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } })
        if (rows.length > 0) {
          await tx.rolePermission.createMany({
            data: rows.map((r) => ({ ...r, roleId: role.id })),
          })
        }
      }

      return tx.role.findUnique({
        where: { id: role.id },
        include: { permissions: true, _count: { select: { users: true } } },
      })
    })

    // Todos los usuarios del rol ven el cambio en menos de 30 segundos
    invalidatePermissionCache()

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error updating role:", error)
    return NextResponse.json({ success: false, error: "Error al actualizar el rol" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("roles", "delete")
    if (!guard.ok) return guard.error

    const role = await prisma.role.findUnique({
      where: { id: params.id },
      include: { _count: { select: { users: true } } },
    })
    if (!role) {
      return NextResponse.json({ success: false, error: "Rol no encontrado" }, { status: 404 })
    }
    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: "El rol Superadmin no se puede eliminar" },
        { status: 400 }
      )
    }
    if (role._count.users > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `El rol tiene ${role._count.users} usuario(s) asignado(s). Reasignalos antes de eliminarlo.`,
        },
        { status: 409 }
      )
    }

    await prisma.role.delete({ where: { id: params.id } })
    invalidatePermissionCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting role:", error)
    return NextResponse.json({ success: false, error: "Error al eliminar el rol" }, { status: 500 })
  }
}
