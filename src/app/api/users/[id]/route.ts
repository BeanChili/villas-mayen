import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, invalidatePermissionCache } from "@/lib/permissions"
import bcrypt from "bcryptjs"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireAnyPermission([["users", "view"]])
    if (!guard.ok) return guard.error

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        roleId: true,
        role: { select: { id: true, key: true, name: true } },
        active: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: "Error al obtener el usuario" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("users", "edit")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { name, email, phone, roleId, active } = body

    const updateData: any = {
      name,
      email,
      phone,
      active,
    }

    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: roleId } })
      if (!role) {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
      }
      updateData.roleId = roleId
    }

    // If password is provided, hash it
    if (body.password) {
      updateData.password = await bcrypt.hash(body.password, 10)
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        roleId: true,
        role: { select: { id: true, key: true, name: true } },
        active: true,
      },
    })

    // El cambio de rol impacta en menos de 30 segundos, sin re-login
    invalidatePermissionCache(params.id)

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Error al actualizar el usuario" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("users", "edit")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { active } = body

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { active },
      select: {
        id: true,
        name: true,
        username: true,
        active: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: "Error al actualizar el usuario" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("users", "delete")
    if (!guard.ok) return guard.error

    // Soft delete - just mark as inactive
    await prisma.user.update({
      where: { id: params.id },
      data: { active: false },
    })

    // Un usuario desactivado pierde acceso en menos de 30 segundos
    invalidatePermissionCache(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: "Error al eliminar el usuario" },
      { status: 500 }
    )
  }
}