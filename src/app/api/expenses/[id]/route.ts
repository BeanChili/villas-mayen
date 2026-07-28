import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "expenses", "update")) {
      return NextResponse.json(
        { error: "No tienes permiso para actualizar gastos" },
        { status: 403 }
      )
    }

    const existing = await prisma.expense.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
    }

    const body = await request.json()
    const { date, category, description, amount, receiptPhoto, quoteId } = body

    if (!date || !category || !description || amount === undefined) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        date: new Date(date + "T12:00:00"),
        category,
        description,
        amount,
        receiptPhoto,
        quoteId: quoteId || null,
      },
    })

    return NextResponse.json({ success: true, data: expense })
  } catch (error) {
    console.error("Error updating expense:", error)
    return NextResponse.json(
      { error: "Error al actualizar el gasto" },
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
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "expenses", "delete")) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar gastos" },
        { status: 403 }
      )
    }

    const existing = await prisma.expense.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 })
    }

    await prisma.expense.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting expense:", error)
    return NextResponse.json(
      { error: "Error al eliminar el gasto" },
      { status: 500 }
    )
  }
}
