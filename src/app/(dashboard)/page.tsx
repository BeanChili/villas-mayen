import {getServerSession} from "next-auth"
import {authOptions} from "@/lib/auth"
import {redirect} from "next/navigation"
import DashboardContent from "./dashboard-content"
import prisma from "@/lib/db"

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

    return {
      quotesCount,
      todayEvents,
      upcomingEvents,
      expensesThisMonth: expensesThisMonth._sum.amount || 0,
      newClientsThisMonth,
      furnitureInUse,
      damagedFurniture,
      executingEvents,
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
    }
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const data = await getDashboardData()

  return <DashboardContent data={data} user={session.user} />
}