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

    const eventClosing = await prisma.eventClosing.findUnique({
      where: { id: params.id },
      include: {
        quote: { include: { client: true, payments: true } },
        items: { include: { furniture: true } },
      },
    })

    if (!eventClosing) {
      return NextResponse.json({ success: false, error: "Cierre no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: eventClosing })
  } catch (error) {
    console.error("Error fetching event closing:", error)
    return NextResponse.json({ success: false, error: "Error al obtener cierre de evento" }, { status: 500 })
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
    if (!hasPermission(role, "events", "update")) {
      return NextResponse.json({ success: false, error: "Sin permiso" }, { status: 403 })
    }

    const body = await request.json()
    const { returnStatus, observations, items } = body

    // Calculate damage and loss costs from items
    let damageCost = 0
    let lossCost = 0
    const validItems = Array.isArray(items) ? items : []

    validItems.forEach((item: any) => {
        if (item.returnStatus === "RETORNADO_DANADO") {
        damageCost += item.repairCost || 0
      } else if (item.returnStatus === "NO_RETORNADO") {
        lossCost += item.repairCost || 0
      }
    })

    const eventClosing = await prisma.$transaction(async (tx) => {
      // Delete existing items and recreate
      await tx.eventClosingItem.deleteMany({
        where: { eventClosingId: params.id },
      })

      const closing = await tx.eventClosing.update({
        where: { id: params.id },
        data: {
          returnStatus: returnStatus || undefined,
          observations: observations !== undefined ? observations : undefined,
          damageCost,
          lossCost,
          items: validItems.length
            ? {
                create: validItems.map((item: any) => ({
                  furnitureId: item.furnitureId || null,
                  itemName: item.name || item.itemName || null,
                  quantity: item.quantity || 1,
                  returnStatus: item.returnStatus,
                  damageDescription: item.damageDescription || null,
                  damagePhoto: item.damagePhoto || null,
                  repairCost: item.repairCost || 0,
                  notes: item.notes || null,
                })),
              }
            : undefined,
        },
        include: {
          quote: { include: { client: true } },
          items: { include: { furniture: true } },
        },
      })

      // Update furniture status based on new items (only for actual furniture)
      for (const item of validItems) {
        if (item.furnitureId) {
          if (item.returnStatus === "RETORNADO_DANADO") {
            await tx.furniture.update({
              where: { id: item.furnitureId },
              data: { status: "DANADO" },
            })
          } else if (item.returnStatus === "NO_RETORNADO") {
            await tx.furniture.update({
              where: { id: item.furnitureId },
              data: { status: "DADO_BAJA" },
            })
          } else {
            await tx.furniture.update({
              where: { id: item.furnitureId },
              data: { status: "BUENO" },
            })
          }
        }
      }

      return closing
    })

    return NextResponse.json({ success: true, data: eventClosing })
  } catch (error: any) {
    console.error("Error updating event closing:", error)
    return NextResponse.json({ success: false, error: error.message || "Error al actualizar cierre de evento" }, { status: 500 })
  }
}
