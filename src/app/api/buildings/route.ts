import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["rooms", "view"], ["quotes", "view"], ["reports_ocupacion", "view"]])
    if (!guard.ok) return guard.error

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    const buildings = await prisma.building.findMany({
      where: includeInactive ? {} : { active: true },
      include: { floors: true },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: buildings })
  } catch (error) {
    console.error("Error fetching buildings:", error)
    return NextResponse.json({ success: false, error: "Error al obtener edificios" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission("rooms", "create")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ success: false, error: "El nombre es requerido" }, { status: 400 })
    }

    const building = await prisma.building.create({
      data: { name },
    })

    return NextResponse.json({ success: true, data: building }, { status: 201 })
  } catch (error) {
    console.error("Error creating building:", error)
    return NextResponse.json({ success: false, error: "Error al crear edificio" }, { status: 500 })
  }
}
