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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "rooms", "create")) {
      return NextResponse.json({ success: false, error: "No tienes permiso para crear edificios" }, { status: 403 })
    }

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
