import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        quotes: {
          orderBy: { eventDate: "desc" },
          take: 10,
        },
        _count: {
          select: { quotes: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    console.error("Error fetching client:", error)
    return NextResponse.json(
      { success: false, error: "Error al obtener el cliente" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "clients", "update")) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para actualizar clientes" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, clientType, category, phone, email, address, rfc, observations } = body

    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        name,
        clientType,
        category,
        phone,
        email,
        address,
        rfc,
        observations,
      },
    })

    return NextResponse.json({ success: true, data: client })
  } catch (error) {
    console.error("Error updating client:", error)
    return NextResponse.json(
      { success: false, error: "Error al actualizar el cliente" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "clients", "delete")) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para eliminar clientes" },
        { status: 403 }
      )
    }

    // Soft delete - just mark as inactive
    await prisma.client.update({
      where: { id: params.id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting client:", error)
    return NextResponse.json(
      { success: false, error: "Error al eliminar el cliente" },
      { status: 500 }
    )
  }
}
