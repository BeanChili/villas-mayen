import {getServerSession} from "next-auth"
import {authOptions} from "@/lib/auth"
import {redirect} from "next/navigation"
import DashboardContent from "./dashboard-content"
import prisma from "@/lib/db"
import { getUserPermissions } from "@/lib/permissions"

async function getDashboardData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  // Today: full day range (00:00:00 → 23:59:59)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59)

  try {
    const [
      quotesCount,
      todayEvents,
      upcomingEvents,
      expensesThisMonth,
      newClientsThisMonth,
      furnitureInUse,
      damagedFurniture,
      executingEvents,
    ] = await Promise.all([
      prisma.quote.count({
        where: {
          eventDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      // Eventos de hoy: cotizaciones confirmadas o en ejecución que ocurren hoy
      prisma.quote.count({
        where: {
          status: { in: ["CONFIRMADA", "EN_EJECUCION"] },
          OR: [
            // Eventos de un día: eventDate es hoy y no tiene endDate
            { eventDate: { gte: startOfToday, lte: endOfToday }, endDate: null },
            // Eventos multi-día: hoy cae dentro del rango
            { 
              AND: [
                { eventDate: { lte: endOfToday } },
                { endDate: { gte: startOfToday } },
              ]
            },
          ],
        },
      }),
      prisma.quote.findMany({
        where: {
          eventDate: { gte: startOfToday, lte: nextWeek },
          status: { notIn: ["FINALIZADA", "CANCELADO"] },
        },
        take: 10,
        orderBy: { eventDate: "asc" },
        include: { client: true },
      }),
      prisma.expense.aggregate({
        where: {
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.client.count({
        where: {
          registrationDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.eventClosingItem.count({
        where: {
          returnStatus: "RETORNADO_OK",
        },
      }),
      prisma.furniture.count({
        where: {
          status: { in: ["DANADO", "DADO_BAJA"] },
        },
      }),
      // Eventos EN_EJECUCION de hoy
      prisma.quote.findMany({
        where: {
          status: "EN_EJECUCION",
          eventDate: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          client: true,
          spaces: true,
          payments: true,
        },
        orderBy: { eventDate: "asc" },
      }),
    ])

    // ── Datos para gráficos ──
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const [statusGroups, revenueQuotes, salonGroups] = await Promise.all([
      prisma.quote.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.quote.findMany({
        where: { eventDate: { gte: sixMonthsAgo }, status: { notIn: ["CANCELADO", "BORRADOR"] } },
        select: { eventDate: true, totalAmount: true, paidAmount: true },
      }),
      prisma.quoteSpace.groupBy({
        by: ["locationName"],
        _count: { _all: true },
        orderBy: { _count: { locationName: "desc" } },
        take: 6,
      }),
    ])

    // Ingresos (facturado vs cobrado) por mes — últimos 6 meses
    const months: { key: string; label: string; facturado: number; cobrado: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("es-GT", { month: "short" }),
        facturado: 0,
        cobrado: 0,
      })
    }
    for (const q of revenueQuotes) {
      const d = new Date(q.eventDate)
      const m = months.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`)
      if (m) { m.facturado += q.totalAmount; m.cobrado += q.paidAmount }
    }

    const statusBreakdown = statusGroups.map(g => ({ status: g.status, count: g._count._all }))
    const topSalones = salonGroups
      .filter(g => g.locationName)
      .map(g => ({ name: g.locationName, count: g._count._all }))

    return {
      quotesCount,
      todayEvents,
      upcomingEvents,
      expensesThisMonth: expensesThisMonth._sum.amount || 0,
      newClientsThisMonth,
      furnitureInUse,
      damagedFurniture,
      executingEvents,
      monthlyRevenue: months,
      statusBreakdown,
      topSalones,
    }
  } catch (error) {
    console.error("Dashboard error:", error)
    return {
      quotesCount: 0,
      todayEvents: 0,
      upcomingEvents: [],
      expensesThisMonth: 0,
      newClientsThisMonth: 0,
      furnitureInUse: 0,
      damagedFurniture: 0,
      executingEvents: [],
      monthlyRevenue: [],
      statusBreakdown: [],
      topSalones: [],
    }
  }
}

// Orden de fallback para roles sin acceso al dashboard: van al primer
// modulo que puedan ver (caso Finanzas Restringido, que entra por Gastos)
const FALLBACK_ROUTES: Array<[string, string]> = [
  ["expenses", "/expenses"],
  ["calendar", "/calendar"],
  ["quotes", "/quotes"],
  ["clients", "/clients"],
  ["rooms", "/rooms"],
  ["inventory", "/inventory"],
  ["events", "/events"],
  ["closings", "/reports/closings"],
  ["reports_cobranza", "/reports/cobranza"],
  ["reports_ocupacion", "/reports/ocupacion"],
  ["screen", "/screen"],
]

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const perms = await getUserPermissions((session.user as any).id)
  if (!perms) {
    redirect("/login")
  }

  if (!perms.modules["dashboard"]?.view) {
    const target = FALLBACK_ROUTES.find(([module]) => perms.modules[module]?.view)
    if (target) {
      redirect(target[1])
    }
  }

  const data = await getDashboardData()

  return <DashboardContent data={data} user={{ ...session.user, roleName: perms.roleName }} />
}