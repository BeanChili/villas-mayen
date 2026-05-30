import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "rooms", "create")) {
      return NextResponse.json({ success: false, error: "No tienes permiso para crear pisos" }, { status: 403 })
    }

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
