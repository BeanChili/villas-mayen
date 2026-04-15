import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

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
          select: { reservations: true, quotes: true },
        },
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json(
      { error: "Error al obtener los clientes" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "clients", "create")) {
      return NextResponse.json(
        { error: "No tienes permiso para crear clientes" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, clientType, phone, email, address, rfc, observations } = body

    if (!name || !clientType) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        name,
        clientType,
        phone,
        email,
        address,
        rfc,
        observations,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json(
      { error: "Error al crear el cliente" },
      { status: 500 }
    )
  }
}