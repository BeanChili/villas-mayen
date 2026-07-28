import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([
      ["categories", "view"],
      ["products", "view"],
      ["inventory", "view"],
      ["quotes", "view"],
    ])
    if (!guard.ok) return guard.error

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    const where: any = { active: true }
    if (type) where.type = type

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Antes no habia ningun guard: cualquier sesion podia crear categorias
    const guard = await requirePermission("categories", "create")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { name, type } = body

    if (!name || !type) {
      return NextResponse.json({ error: "Nombre y tipo requeridos" }, { status: 400 })
    }

    const category = await prisma.category.create({
      data: { name, type },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe esa categoría" }, { status: 409 })
    }
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 })
  }
}
