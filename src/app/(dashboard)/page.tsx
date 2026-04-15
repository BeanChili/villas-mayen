import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardContent from "./dashboard-content"
import prisma from "@/lib/db"

async function getDashboardData() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  try {
    const [
      reservationsCount,
      todayEvents,
      upcomingEvents,
      expensesThisMonth,
      newClientsThisMonth,
      furnitureInUse,
      damagedFurniture,
    ] = await Promise.all([
      prisma.reservation.count({
        where: {
          startDate: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.reservation.count({
        where: {
          status: "EN_EJECUCION",
          AND: [
            { startDate: { lte: new Date() } },
            { endDate: { gte: new Date() } },
          ],
        },
      }),
      prisma.reservation.findMany({
        where: {
          startDate: { gte: new Date(), lte: nextWeek },
          status: { notIn: ["FINALIZADO", "FINALIZADO_COBRO"] },
        },
        take: 10,
        orderBy: { startDate: "asc" },
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
          status: { in: ["DAÑADO", "DADO_BAJA"] },
        },
      }),
    ])

    return {
      reservationsCount,
      todayEvents,
      upcomingEvents,
      expensesThisMonth: expensesThisMonth._sum.amount || 0,
      newClientsThisMonth,
      furnitureInUse,
      damagedFurniture,
    }
  } catch (error) {
    return {
      reservationsCount: 0,
      todayEvents: 0,
      upcomingEvents: [],
      expensesThisMonth: 0,
      newClientsThisMonth: 0,
      furnitureInUse: 0,
      damagedFurniture: 0,
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