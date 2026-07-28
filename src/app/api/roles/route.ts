import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import {
  requirePermission,
  requireAnyPermission,
  sanitizePermissions,
} from "@/lib/permissions"

export async function GET() {
  try {
    // El ABM de usuarios tambien necesita el listado para su dropdown de rol
    const guard = await requireAnyPermission([["roles", "view"], ["users", "view"]])
    if (!guard.ok) return guard.error

    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ success: true, data: roles })
  } catch (error) {
    console.error("Error fetching roles:", error)
    return NextResponse.json({ success: false, error: "Error al obtener roles" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission("roles", "create")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { name, description, canEditPrices, permissions } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "El nombre es requerido" }, { status: 400 })
    }

    const rows = sanitizePermissions(permissions)

    const key = name
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")

    const existing = await prisma.role.findFirst({
      where: { OR: [{ key }, { name: name.trim() }] },
    })
    if (existing) {
      return NextResponse.json({ success: false, error: "Ya existe un rol con ese nombre" }, { status: 409 })
    }

    const role = await prisma.role.create({
      data: {
        key,
        name: name.trim(),
        description: description || null,
        canEditPrices: canEditPrices === true,
        permissions: { create: rows },
      },
      include: { permissions: true, _count: { select: { users: true } } },
    })

    return NextResponse.json({ success: true, data: role }, { status: 201 })
  } catch (error) {
    console.error("Error creating role:", error)
    return NextResponse.json({ success: false, error: "Error al crear el rol" }, { status: 500 })
  }
}
