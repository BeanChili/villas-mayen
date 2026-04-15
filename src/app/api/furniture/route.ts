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
    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const where: any = {}

    if (category) {
      where.category = category
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { inventoryNumber: { contains: search } },
      ]
    }

    const furniture = await prisma.furniture.findMany({
      where,
      orderBy: { name: "asc" },
    })

    // Calculate current values
    const now = new Date()
    const furnitureWithValues = furniture.map((item) => {
      if (!item.purchaseDate) {
        return item
      }
      const years =
        (now.getTime() - new Date(item.purchaseDate).getTime()) /
        (365 * 24 * 60 * 60 * 1000)
      const annualDepreciation =
        Number(item.purchaseValue) * (Number(item.depreciationRate) / 100)
      const currentValue = Math.max(
        0,
        Number(item.purchaseValue) - annualDepreciation * years
      )
      return {
        ...item,
        currentValue,
      }
    })

    return NextResponse.json(furnitureWithValues)
  } catch (error) {
    console.error("Error fetching furniture:", error)
    return NextResponse.json(
      { error: "Error al obtener el mobiliario" },
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
    if (!hasPermission(role, "inventory", "create")) {
      return NextResponse.json(
        { error: "No tienes permiso para crear mobiliario" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      inventoryNumber,
      name,
      category,
      purchaseValue,
      depreciationRate,
      status,
      photo,
      purchaseDate,
      location,
      observations,
    } = body

    if (!inventoryNumber || !name || !category || purchaseValue === undefined) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    // Check if inventory number already exists
    const existing = await prisma.furniture.findUnique({
      where: { inventoryNumber },
    })

    if (existing) {
      return NextResponse.json(
        { error: "El número de inventario ya existe" },
        { status: 409 }
      )
    }

    // Calculate initial current value
    let currentValue = purchaseValue
    if (purchaseDate) {
      const years =
        (new Date().getTime() - new Date(purchaseDate).getTime()) /
        (365 * 24 * 60 * 60 * 1000)
      const annualDepreciation = purchaseValue * (depreciationRate / 100)
      currentValue = Math.max(0, purchaseValue - annualDepreciation * years)
    }

    const furniture = await prisma.furniture.create({
      data: {
        inventoryNumber,
        name,
        category,
        purchaseValue,
        depreciationRate: depreciationRate || 10,
        currentValue,
        status: status || "BUENO",
        photo,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        location,
        observations,
      },
    })

    return NextResponse.json(furniture, { status: 201 })
  } catch (error) {
    console.error("Error creating furniture:", error)
    return NextResponse.json(
      { error: "Error al crear el mobiliario" },
      { status: 500 }
    )
  }
}