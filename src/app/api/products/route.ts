import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["products", "view"], ["quotes", "view"], ["quotes", "create"]])
    if (!guard.ok) return guard.error

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const available = searchParams.get("available")

    const where: any = {}

    if (category) {
      where.category = category
    }

    if (available !== null && available !== "") {
      where.available = available === "true"
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { success: false, error: "Error al obtener los productos" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requirePermission("inventory", "create")
    if (!guard.ok) return guard.error

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
      rentalPrice,
      color,
      packageSize,
    } = body

    if (!name || !category || unitPrice === undefined) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name,
        category,
        menuType: menuType || null,
        unitPrice: parseFloat(unitPrice),
        description,
        photo,
        available: available ?? true,
        unitMeasure,
        quantity: quantity !== undefined ? parseInt(quantity) : 0,
        isFree: isFree ?? false,
        pricePerDay: pricePerDay !== undefined && pricePerDay !== "" ? parseFloat(pricePerDay) : null,
        pricePerHour: pricePerHour !== undefined && pricePerHour !== "" ? parseFloat(pricePerHour) : null,
        rentalPrice: rentalPrice || 0,
        color: color || null,
        packageSize: packageSize !== undefined && packageSize !== "" ? parseInt(packageSize) : null,
      },
    })

    return NextResponse.json({ success: true, data: product }, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json(
      { success: false, error: "Error al crear el producto" },
      { status: 500 }
    )
  }
}
