import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get("locationId")
    const eventDate = searchParams.get("eventDate")
    const startTime = searchParams.get("startTime")
    const endTime = searchParams.get("endTime")
    const excludeQuoteId = searchParams.get("excludeQuoteId")

    if (!locationId || !eventDate || !startTime || !endTime) {
      return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 })
    }

    const date = new Date(eventDate + "T12:00:00")
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0)
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)

    // Find quotes that use the same location on the same date
    const conflictingQuotes = await prisma.quote.findMany({
      where: {
        id: excludeQuoteId ? { not: excludeQuoteId } : undefined,
        status: { notIn: ["CANCELADO", "FINALIZADA", "NO_CONFIRMADA"] },
        eventDate: { gte: startOfDay, lte: endOfDay },
        spaces: {
          some: {
            locationId: locationId,
          },
        },
      },
      include: {
        client: true,
        spaces: true,
      },
      take: 5,
    })

    // Check time overlap
    const hasTimeConflict = conflictingQuotes.some((quote) => {
      return quote.spaces.some((space: any) => {
        if (space.locationId !== locationId) return false
        // Check if time ranges overlap
        const existingStart = space.startTime
        const existingEnd = space.endTime
        return (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        )
      })
    })

    if (hasTimeConflict && conflictingQuotes.length > 0) {
      const quote = conflictingQuotes[0]
      return NextResponse.json({
        success: true,
        hasConflict: true,
        message: `Este espacio ya está reservado por ${quote.client.name} el mismo día en horario solapado. Estado: ${quote.status}`,
        conflictingQuotes: conflictingQuotes.map((q) => ({
          id: q.id,
          clientName: q.client.name,
          status: q.status,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      hasConflict: false,
    })
  } catch (error) {
    console.error("Error checking conflict:", error)
    return NextResponse.json({ success: false, error: "Error al verificar conflictos" }, { status: 500 })
  }
}
