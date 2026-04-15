"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Package, Wallet, Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { formatDate, getStatusColor } from "@/lib/utils"

interface DashboardData {
  reservationsCount: number
  todayEvents: number
  upcomingEvents: any[]
  expensesThisMonth: number
  newClientsThisMonth: number
  furnitureInUse: number
  damagedFurniture: number
}

interface User {
  name?: string | null
  email?: string | null
  role: string
}

export default function DashboardContent({ data, user }: { data: DashboardData; user: User }) {
  const stats = [
    {
      title: "Reservaciones del Mes",
      value: data.reservationsCount,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/reservations",
    },
    {
      title: "Eventos Hoy",
      value: data.todayEvents,
      icon: Clock,
      color: "text-red-600",
      bgColor: "bg-red-50",
      href: "/reservations",
    },
    {
      title: "Clientes Nuevos",
      value: data.newClientsThisMonth,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/clients",
    },
    {
      title: "Gastos del Mes",
      value: `$${data.expensesThisMonth.toLocaleString("es-MX")}`,
      icon: Wallet,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      href: "/expenses",
    },
  ]

  const alerts = []
  if (data.damagedFurniture > 0) {
    alerts.push({
      title: "Mobiliario Dañado",
      value: `${data.damagedFurniture} artículos`,
      icon: AlertTriangle,
      color: "text-red-600",
    })
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Bienvenido, {user.name || "Usuario"}
          </h2>
          <p className="text-gray-500 mt-1">
            Aquí está el resumen de tu centro de eventos
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Rol</p>
          <p className="font-medium capitalize">
            {user.role.replace("_", " ").toLowerCase()}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <Card key={alert.title} className="border-red-200 bg-red-50">
              <CardContent className="p-4 flex items-center gap-4">
                <alert.icon className={`w-6 h-6 ${alert.color}`} />
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-gray-600">{alert.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próximos Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {data.upcomingEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay eventos programados para los próximos 7 días
            </p>
          ) : (
            <div className="space-y-4">
              {data.upcomingEvents.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getStatusColor(event.status) }}
                    />
                    <div>
                      <p className="font-medium">{event.client.name}</p>
                      <p className="text-sm text-gray-500">{event.locationName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatDate(event.startDate)}
                    </p>
                    <p className="text-xs text-gray-500">{event.schedules}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/reservations">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Ver Reservaciones</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/clients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Ver Clientes</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/quotes">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Ver Cotizaciones</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}