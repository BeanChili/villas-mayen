import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { hasPermission } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const eventClosings = await prisma.eventClosing.findMany({
      include: {
        quote: { include: { client: true } },
        items: { include: { furniture: true } },
      },
      orderBy: { closingDate: "desc" },
    })

    return NextResponse.json({ success: true, data: eventClosings })
  } catch (error) {
    console.error("Error fetching event closings:", error)
    return NextResponse.json({ success: false, error: "Error al obtener cierres de evento" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const role = (session.user as any).role as any
    if (!hasPermission(role, "events", "create")) {
      return NextResponse.json({ success: false, error: "Sin permiso" }, { status: 403 })
    }

    const body = await request.json()
    const { quoteId, returnStatus, observations, items } = body

    if (!quoteId || !returnStatus) {
      return NextResponse.json({ success: false, error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Validate quote status
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
    })

    if (!quote) {
      return NextResponse.json({ success: false, error: "Cotización no encontrada" }, { status: 404 })
    }

    if (quote.status !== "EN_EJECUCION" && quote.status !== "FINALIZADA") {
      return NextResponse.json(
        { success: false, error: "La cotización debe estar en ejecución o finalizada para liquidar" },
        { status: 400 }
      )
    }

    // Check if closing already exists
    const existing = await prisma.eventClosing.findUnique({
      where: { quoteId },
    })

    if (existing) {
      return NextResponse.json({ success: false, error: "Ya existe un cierre para esta cotización" }, { status: 409 })
    }

    // Calculate damage and loss costs from items
    let damageCost = 0
    let lossCost = 0
    const validItems = Array.isArray(items) ? items : []

    console.log("[EventClosings] Received items:", JSON.stringify(validItems, null, 2))

    validItems.forEach((item: any) => {
      console.log(`[EventClosings] Processing item: ${item.name || item.itemName}, status: ${item.returnStatus}, repairCost: ${item.repairCost}`)
      if (item.returnStatus === "RETORNADO_DANADO") {
        damageCost += item.repairCost || 0
      } else if (item.returnStatus === "NO_RETORNADO") {
        lossCost += item.repairCost || 0
      }
    })

    console.log(`[EventClosings] Calculated costs - damage: ${damageCost}, loss: ${lossCost}`)

    const eventClosing = await prisma.$transaction(async (tx) => {
      const closing = await tx.eventClosing.create({
        data: {
          quoteId,
          closingDate: new Date(),
          returnStatus,
          observations: observations || null,
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

      // Update furniture status if damaged or lost (only for actual furniture items)
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
          }
        }
      }

      return closing
    })

    return NextResponse.json({ success: true, data: eventClosing }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating event closing:", error)
    return NextResponse.json({ success: false, error: error.message || "Error al crear cierre de evento" }, { status: 500 })
  }
}
