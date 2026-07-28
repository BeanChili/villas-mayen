import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import CobranzaContent from "./cobranza-content"
import { RequireModule } from "@/components/require-module"
import { getUserPermissions } from "@/lib/permissions"

export const dynamic = "force-dynamic"

async function getCobranza() {
  try {
    const quotes = await prisma.quote.findMany({
      where: { status: { in: ["CONFIRMADA", "EN_EJECUCION", "FINALIZADA"] } },
      include: { client: true, spaces: true },
      orderBy: { eventDate: "asc" },
    })

    const rows = quotes
      .map(q => ({
        id: q.id,
        clientName: q.client?.name ?? "—",
        eventTitle: q.eventTitle ?? null,
        eventDate: q.eventDate.toISOString(),
        status: q.status,
        currency: q.currency || "GTQ",
        total: q.totalAmount,
        paid: q.paidAmount,
        saldo: Math.round((q.totalAmount - q.paidAmount) * 100) / 100,
        salon: q.spaces.map(s => s.locationName).filter(Boolean).join(", "),
      }))
      .filter(r => r.saldo > 0.5)

    return rows
  } catch (error) {
    console.error("Cobranza error:", error)
    return []
  }
}

export default async function CobranzaPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // Chequeo server-side: la pagina serializa montos en el HTML, no alcanza
  // con ocultarla en el cliente
  const perms = await getUserPermissions((session.user as any).id)
  if (!perms?.modules["reports_cobranza"]?.view) {
    redirect("/")
  }

  const rows = await getCobranza()
  return (
    <RequireModule module="reports_cobranza">
      <CobranzaContent rows={rows} />
    </RequireModule>
  )
}
