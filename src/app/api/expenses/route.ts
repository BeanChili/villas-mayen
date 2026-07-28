import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const guard = await requireAnyPermission([["expenses", "view"]])
    if (!guard.ok) return guard.error

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const quoteId = searchParams.get("quoteId")

    const where: any = {}

    if (category) {
      where.category = category
    }

    if (quoteId) {
      where.quoteId = quoteId
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
    const guard = await requirePermission("expenses", "create")
    if (!guard.ok) return guard.error

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