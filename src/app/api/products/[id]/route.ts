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

    const product = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!product) {
      return NextResponse.json({ success: false, error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json(
      { success: false, error: "Error al obtener el producto" },
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
    if (!hasPermission(role, "inventory", "update")) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para actualizar productos" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      category,
      menuType,
      unitPrice,
      description,
      photo,
      available,
      unitMeasure,
      quantity,
      isFree,
      pricePerDay,
      pricePerHour,
    } = body

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name,
        category,
        menuType: menuType || null,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
        description,
        photo,
        available: available !== undefined ? available : undefined,
        unitMeasure,
        quantity: quantity !== undefined ? parseInt(quantity) : undefined,
        isFree: isFree !== undefined ? isFree : undefined,
        pricePerDay: pricePerDay !== undefined && pricePerDay !== "" ? parseFloat(pricePerDay) : null,
        pricePerHour: pricePerHour !== undefined && pricePerHour !== "" ? parseFloat(pricePerHour) : null,
      },
    })

    return NextResponse.json({ success: true, data: product })
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json(
      { success: false, error: "Error al actualizar el producto" },
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
    if (!hasPermission(role, "inventory", "delete")) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para eliminar productos" },
        { status: 403 }
      )
    }

    await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { success: false, error: "Error al eliminar el producto" },
      { status: 500 }
    )
  }
}
