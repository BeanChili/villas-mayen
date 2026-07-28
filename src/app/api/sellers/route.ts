import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    // El wizard de cotizaciones tambien necesita el listado para su dropdown
    const guard = await requireAnyPermission([["sellers", "view"], ["quotes", "view"]])
    if (!guard.ok) return guard.error

    const { searchParams } = new URL(request.url)
    const soloActivos = searchParams.get("active") === "1"

    const sellers = await prisma.seller.findMany({
      where: soloActivos ? { active: true } : undefined,
      include: { _count: { select: { quotes: true } } },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: sellers })
  } catch (error) {
    console.error("Error fetching sellers:", error)
    return NextResponse.json({ success: false, error: "Error al obtener vendedores" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission("sellers", "create")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { name, phone } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "El nombre es requerido" }, { status: 400 })
    }

    const existing = await prisma.seller.findUnique({ where: { name: name.trim() } })
    if (existing) {
      return NextResponse.json({ success: false, error: "Ya existe un vendedor con ese nombre" }, { status: 409 })
    }

    const seller = await prisma.seller.create({
      data: { name: name.trim(), phone: phone || null },
      include: { _count: { select: { quotes: true } } },
    })

    return NextResponse.json({ success: true, data: seller }, { status: 201 })
  } catch (error) {
    console.error("Error creating seller:", error)
    return NextResponse.json({ success: false, error: "Error al crear el vendedor" }, { status: 500 })
  }
}
