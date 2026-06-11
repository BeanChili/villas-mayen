"use client"

import { useEffect, useState } from "react"
import { quoteStatusColors, quoteStatusLabels } from "@/types"
import { formatParkingSpots } from "@/lib/utils"

export default function ScreenPage() {
  const [events, setEvents] = useState<any[]>([])
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300000) // 5 min
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => { clearInterval(interval); clearInterval(clock) }
  }, [])

  async function fetchData() {
    try {
      const res = await fetch("/api/quotes")
      const data = await res.json()
      const quotes = Array.isArray(data) ? data : (data.data || [])
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
      const day3End = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 23, 59, 59)

      const filtered = quotes.filter((q: any) => {
        const start = new Date(q.eventDate)
        const end = q.endDate ? new Date(q.endDate) : start
        return end >= todayStart && start <= day3End &&
               !["CANCELADO", "BORRADOR", "NO_CONFIRMADA"].includes(q.status)
      })
      setEvents(filtered)
    } catch (err) {
      console.error("Error fetching events:", err)
    }
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const day2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
  const day3 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0)

  const days = [
    { label: "Hoy", date: today },
    { label: "Mañana", date: day2 },
    { label: "Pasado Mañana", date: day3 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-vm-charcoal via-vm-green-dark to-vm-charcoal text-vm-white overflow-hidden">
      <div className="flex items-center justify-between gap-6 px-8 py-5 bg-vm-charcoal/60 border-b-4 border-vm-amber backdrop-blur">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Casa Villas Mayen" className="h-14 w-14 rounded-lg object-contain bg-vm-white p-1" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Casa Villas Mayen</h1>
            <p className="text-sm text-vm-amber font-medium uppercase tracking-widest">Próximos eventos</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-bold tabular-nums">
            {now.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-sm text-vm-stone capitalize">
            {now.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 p-4 h-[calc(100vh-110px)]">
        {days.map((day, idx) => {
          const dayStart = day.date
          const dayEnd = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), 23, 59, 59)
          const dayEvents = events.filter(e => {
            const start = new Date(e.eventDate)
            const end = e.endDate ? new Date(e.endDate) : start
            return end >= dayStart && start <= dayEnd
          })
          const isToday = idx === 0
          return (
            <div key={day.label} className="bg-vm-charcoal/40 rounded-xl overflow-hidden flex flex-col border border-vm-sage/30 backdrop-blur">
              <div className={`p-4 text-xl font-bold text-center ${isToday ? "bg-vm-amber text-vm-charcoal" : "bg-vm-sage text-vm-white"}`}>
                {day.label}
                <span className={`block text-sm font-normal capitalize ${isToday ? "text-vm-charcoal/70" : "text-vm-white/70"}`}>
                  {day.date.toLocaleDateString("es-GT", { day: "numeric", month: "long" })}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {dayEvents.length === 0 ? (
                  <div className="text-vm-stone/50 text-center py-12 text-xl">Sin eventos</div>
                ) : (
                  dayEvents.map(event => {
                    const spaces = event.spaces?.map((s: any) => s.locationName).join(", ") || ""
                    const times = event.spaces?.[0]
                      ? `${event.spaces[0].startTime} - ${event.spaces[0].endTime}`
                      : ""
                    const statusColor = quoteStatusColors[event.status] || "#6B7280"
                    return (
                      <div
                        key={event.id}
                        className="bg-vm-white text-vm-charcoal border-l-4 rounded-lg p-3 shadow-md overflow-hidden"
                        style={{ borderLeftColor: statusColor }}
                      >
                        <div className="text-lg font-bold truncate">{event.client?.name}</div>
                        {event.eventTitle && <div className="text-sm text-vm-charcoal/70 truncate">{event.eventTitle}</div>}
                        <span
                          className="inline-block mt-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full text-vm-white max-w-full truncate"
                          style={{ backgroundColor: statusColor }}
                        >
                          {quoteStatusLabels[event.status] || event.status}
                        </span>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 pt-2 border-t border-vm-stone">
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-vm-charcoal/50 font-semibold">Salón</div>
                            <div className="text-sm font-semibold truncate">{spaces || "—"}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-vm-charcoal/50 font-semibold">Parqueo</div>
                            <div className="text-sm font-semibold truncate">{formatParkingSpots(event.parkingSpot) || "—"}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-vm-charcoal/50 font-semibold">Horario</div>
                            <div className="text-sm font-semibold truncate">{times || "—"}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-vm-charcoal/50 font-semibold">Personas</div>
                            <div className="text-sm font-semibold truncate">{event.guestCount || "—"}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
