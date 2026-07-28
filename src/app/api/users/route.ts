import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["users", "view"]])
    if (!guard.ok) return guard.error

    const users = await prisma.user.findMany({
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
      orderBy: { name: "asc" },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Error al obtener los usuarios" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission("users", "create")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { name, username, password, email, phone, roleId, active } = body

    if (!name || !username || !password || !roleId) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } })
    if (!role) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({
      where: { username },
    })

    if (existing) {
      return NextResponse.json(
        { error: "El nombre de usuario ya existe" },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        email,
        phone,
        roleId,
        active: active ?? true,
      },
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

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: "Error al crear el usuario" },
      { status: 500 }
    )
  }
}