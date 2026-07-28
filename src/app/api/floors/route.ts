import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["rooms", "view"], ["quotes", "view"], ["reports_ocupacion", "view"]])
    if (!guard.ok) return guard.error

    const { searchParams } = new URL(request.url)
    const buildingId = searchParams.get("buildingId")
    const includeInactive = searchParams.get("includeInactive") === "true"

    const where: any = {}
    if (buildingId) where.buildingId = buildingId
    if (!includeInactive) {
      where.building = { active: true }
    }

    const floors = await prisma.floor.findMany({
      where,
      include: { building: true },
      orderBy: { level: "asc" },
    })

    return NextResponse.json({ success: true, data: floors })
  } catch (error) {
    console.error("Error fetching floors:", error)
    return NextResponse.json({ success: false, error: "Error al obtener pisos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission("rooms", "create")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { buildingId, level } = body

    if (!buildingId || level === undefined || level === null) {
      return NextResponse.json({ success: false, error: "Edificio y nivel son requeridos" }, { status: 400 })
    }

    const floor = await prisma.floor.create({
      data: {
        buildingId,
        level: parseInt(level, 10),
      },
    })

    return NextResponse.json({ success: true, data: floor }, { status: 201 })
  } catch (error) {
    console.error("Error creating floor:", error)
    return NextResponse.json({ success: false, error: "Error al crear piso" }, { status: 500 })
  }
}
