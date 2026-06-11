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
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = {}

    if (category) {
      where.category = category
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate + "T12:00:00"),
        lte: new Date(endDate + "T12:00:00"),
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        quote: {
          include: { client: true },
        },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json({ success: true, data: expenses })
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json(
      { error: "Error al obtener los gastos" },
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
    if (!hasPermission(role, "expenses", "create")) {
      return NextResponse.json(
        { error: "No tienes permiso para crear gastos" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { date, category, description, amount, receiptPhoto, quoteId } = body

    if (!date || !category || !description || amount === undefined) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const expense = await prisma.expense.create({
      data: {
        date: new Date(date + "T12:00:00"),
        category,
        description,
        amount,
        receiptPhoto,
        quoteId,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json(
      { error: "Error al crear el gasto" },
      { status: 500 }
    )
  }
}