import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import OcupacionContent from "./ocupacion-content"

export const dynamic = "force-dynamic"

async function getOcupacion(year: number) {
  const start = new Date(year, 0, 1, 0, 0, 0)
  const end = new Date(year, 11, 31, 23, 59, 59)
  const counts: Record<string, number> = {}
  try {
    const quotes = await prisma.quote.findMany({
      where: {
        status: { notIn: ["CANCELADO", "BORRADOR"] },
        eventDate: { lte: end },
        OR: [{ endDate: { gte: start } }, { endDate: null, eventDate: { gte: start } }],
      },
      select: { eventDate: true, endDate: true },
    })
    for (const q of quotes) {
      const s = new Date(q.eventDate)
      const e = q.endDate ? new Date(q.endDate) : s
      const d = new Date(s.getFullYear(), s.getMonth(), s.getDate())
      const last = new Date(e.getFullYear(), e.getMonth(), e.getDate())
      while (d <= last) {
        if (d.getFullYear() === year) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
          counts[key] = (counts[key] || 0) + 1
        }
        d.setDate(d.getDate() + 1)
      }
    }
  } catch (error) {
    console.error("Ocupacion error:", error)
  }
  return counts
}

export default async function OcupacionPage({ searchParams }: { searchParams: { year?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const year = Number(searchParams?.year) || new Date().getFullYear()
  const counts = await getOcupacion(year)
  return <OcupacionContent counts={counts} year={year} />
}
