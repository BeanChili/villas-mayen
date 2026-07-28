import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("inventory", "edit")
    if (!guard.ok) return guard.error

    const existing = await prisma.furniture.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: "Mobiliario no encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const {
      inventoryNumber,
      name,
      category,
      purchaseValue,
      depreciationRate,
      rentalPrice,
      status,
      photo,
      purchaseDate,
      location,
      observations,
      color,
    } = body

    if (inventoryNumber && inventoryNumber !== existing.inventoryNumber) {
      const duplicate = await prisma.furniture.findUnique({
        where: { inventoryNumber },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: "El número de inventario ya existe" },
          { status: 409 }
        )
      }
    }

    const furniture = await prisma.furniture.update({
      where: { id: params.id },
      data: {
        inventoryNumber: inventoryNumber ?? undefined,
        name: name ?? undefined,
        category: category ?? undefined,
        purchaseValue: purchaseValue !== undefined ? purchaseValue : undefined,
        depreciationRate: depreciationRate !== undefined ? depreciationRate : undefined,
        rentalPrice: rentalPrice !== undefined ? rentalPrice : undefined,
        status: status ?? undefined,
        photo: photo !== undefined ? photo : undefined,
        purchaseDate:
          purchaseDate !== undefined
            ? purchaseDate
              ? new Date(purchaseDate + "T12:00:00")
              : null
            : undefined,
        location: location !== undefined ? location : undefined,
        observations: observations !== undefined ? observations : undefined,
        color: color !== undefined ? color : undefined,
      },
    })

    return NextResponse.json({ success: true, data: furniture })
  } catch (error) {
    console.error("Error updating furniture:", error)
    return NextResponse.json(
      { error: "Error al actualizar el mobiliario" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("inventory", "delete")
    if (!guard.ok) return guard.error

    const existing = await prisma.furniture.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: "Mobiliario no encontrado" }, { status: 404 })
    }

    await prisma.furniture.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting furniture:", error)
    return NextResponse.json(
      { error: "Error al eliminar el mobiliario" },
      { status: 500 }
    )
  }
}
