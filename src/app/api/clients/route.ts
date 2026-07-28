import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["clients", "view"], ["quotes", "view"], ["quotes", "create"]])
    if (!guard.ok) return guard.error

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const type = searchParams.get("type")

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    if (type) {
      where.clientType = type
    }

    where.active = true

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { quotes: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: clients })
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json(
      { success: false, error: "Error al obtener los clientes" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission("clients", "create")
    if (!guard.ok) return guard.error

    const body = await request.json()
    const { name, clientType, category, phone, email, address, rfc, observations } = body

    if (!name || !clientType) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        name,
        clientType,
        category: category || "REGULAR",
        phone,
        email,
        address,
        rfc,
        observations,
      },
    })

    return NextResponse.json({ success: true, data: client }, { status: 201 })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json(
      { success: false, error: "Error al crear el cliente" },
      { status: 500 }
    )
  }
}
