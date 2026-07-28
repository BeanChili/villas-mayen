import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db"
import { requirePermission, requireAnyPermission, requireSession } from "@/lib/permissions"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requirePermission("expenses", "edit")
    if (!guard.ok) return guard.error

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
    const guard = await requirePermission("expenses", "delete")
    if (!guard.ok) return guard.error

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
