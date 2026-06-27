"use client"

import { useEffect, useRef, useState, memo } from "react"
import Link from "next/link"
import { quoteStatusColors, quoteStatusLabels } from "@/types"
import { formatParkingSpots } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Maximize, Minimize, ArrowLeft } from "lucide-react"

const Clock = memo(function Clock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])

  return (
    <div className="text-right">
      <div className="text-4xl font-mono font-bold tabular-nums">
        {now ? now.toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
      </div>
      <div className="text-sm text-vm-stone capitalize">
        {now ? now.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" }) : " "}
      </div>
    </div>
  )
})

const parseTime = (t?: string) => {
  const [h, m] = (t || "").split(":").map(Number)
  return (h || 0) + (m || 0) / 60
}

export default function ScreenPage() {
  const [events, setEvents] = useState<any[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [, setTick] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300000) // 5 min
    return () => clearInterval(interval)
  }, [])

  // Refresca el cálculo de "en curso ahora" / próximo cada 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

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

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const day2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
  const day3 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0)
  const curHour = now.getHours() + now.getMinutes() / 60

  const days = [
    { label: "Hoy", date: today },
    { label: "Mañana", date: day2 },
    { label: "Pasado Mañana", date: day3 },
  ]

  const getDayEvents = (date: Date) => {
    const ds = date
    const de = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
    return events.filter(e => {
      const s = new Date(e.eventDate)
      const en = e.endDate ? new Date(e.endDate) : s
      return en >= ds && s <= de
    })
  }

  // ¿El evento de hoy está transcurriendo en este momento?
  const isHappeningNow = (event: any) => {
    if (!event.spaces?.length) return false
    const start = parseTime(event.spaces[0].startTime)
    const end = parseTime(event.spaces[event.spaces.length - 1].endTime)
    if (end >= start) return curHour >= start && curHour < end
    return curHour >= start || curHour < end // cruza medianoche
  }

  // ── Resumen del día (HOY) ──
  const todayEvents = getDayEvents(today)
  const totalGuests = todayEvents.reduce((s, e) => s + (e.guestCount || 0), 0)
  const nextEvent = todayEvents
    .filter(e => e.spaces?.[0] && parseTime(e.spaces[0].startTime) > curHour)
    .sort((a, b) => parseTime(a.spaces[0].startTime) - parseTime(b.spaces[0].startTime))[0]
  const liveCount = todayEvents.filter(isHappeningNow).length

  const ctrlBtn = "p-3 rounded-lg bg-vm-charcoal/60 border border-vm-sage/30 text-vm-white hover:bg-vm-sage/30 transition-colors"

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-gradient-to-br from-vm-charcoal via-vm-green-dark to-vm-charcoal text-vm-white overflow-hidden flex flex-col",
        isFullscreen ? "h-screen w-screen" : "h-screen"
      )}
    >
      <style>{`
        @keyframes vmNowGlow {
          0%, 100% { box-shadow: 0 0 0 3px rgba(245,158,11,0.9), 0 0 14px rgba(245,158,11,0.25); }
          50%      { box-shadow: 0 0 0 3px rgba(245,158,11,0.9), 0 0 26px rgba(245,158,11,0.55); }
        }
        .vm-now-card { animation: vmNowGlow 2.6s ease-in-out infinite; }
        @keyframes vmDot { 0%,100%{opacity:1} 50%{opacity:.25} }
        .vm-now-dot { animation: vmDot 1.4s ease-in-out infinite; }
      `}</style>

      {/* Cabecera */}
      <div className="flex items-center justify-between gap-6 px-8 py-5 bg-vm-charcoal/60 border-b-4 border-vm-amber shrink-0">
        <div className="flex items-center gap-4">
          {!isFullscreen && (
            <Link href="/calendar" className={ctrlBtn} title="Volver al calendario">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          )}
          <img src="/logo.png" alt="Casa Villas Mayen" className="h-14 w-14 rounded-lg object-contain bg-vm-white p-1" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Casa Villas Mayen</h1>
            <p className="text-sm text-vm-amber font-medium uppercase tracking-widest">Próximos eventos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Clock />
          <button
            onClick={toggleFullscreen}
            className={ctrlBtn}
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Barra de resumen del día */}
      <div className="flex items-center gap-x-10 gap-y-2 flex-wrap px-8 py-3 bg-vm-charcoal/40 border-b border-vm-sage/20 shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-vm-amber tabular-nums leading-none">{todayEvents.length}</span>
          <span className="text-xs uppercase tracking-widest text-vm-stone/80">eventos hoy</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-vm-amber tabular-nums leading-none">{totalGuests || "—"}</span>
          <span className="text-xs uppercase tracking-widest text-vm-stone/80">personas esperadas</span>
        </div>
        {liveCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-vm-amber vm-now-dot" />
            <span className="text-sm font-semibold uppercase tracking-wider text-vm-white">
              {liveCount} en curso ahora
            </span>
          </div>
        )}
        {nextEvent && (
          <div className="ml-auto flex items-baseline gap-3 min-w-0">
            <span className="text-xs uppercase tracking-widest text-vm-stone/70 shrink-0">Próximo</span>
            <span className="text-xl font-semibold truncate">
              <span className="font-mono text-vm-amber">{nextEvent.spaces[0].startTime}</span>
              <span className="text-vm-white"> · {nextEvent.client?.name}</span>
              {nextEvent.spaces?.[0]?.locationName && (
                <span className="text-vm-stone"> · {nextEvent.spaces[0].locationName}</span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 p-4 flex-1 min-h-0">
        {days.map((day, idx) => {
          const dayEvents = getDayEvents(day.date)
          const isToday = idx === 0
          return (
            <div key={day.label} className="bg-vm-charcoal/40 rounded-xl overflow-hidden flex flex-col border border-vm-sage/30 min-h-0">
              <div className={`p-4 text-xl font-bold text-center shrink-0 ${isToday ? "bg-vm-amber text-vm-charcoal" : "bg-vm-sage text-vm-white"}`}>
                <div className="flex items-center justify-center gap-2">
                  <span>{day.label}</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${isToday ? "bg-vm-charcoal/15 text-vm-charcoal" : "bg-vm-white/15 text-vm-white"}`}>
                    {dayEvents.length}
                  </span>
                </div>
                <span className={`block text-sm font-normal capitalize ${isToday ? "text-vm-charcoal/70" : "text-vm-white/70"}`}>
                  {day.date.toLocaleDateString("es-GT", { day: "numeric", month: "long" })}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {dayEvents.length === 0 ? (
                  <div className="text-vm-stone/50 text-center py-12 text-xl">Sin eventos</div>
                ) : (
                  dayEvents.map(event => {
                    const spaces = event.spaces?.map((s: any) => s.locationName).join(", ") || ""
                    const times = event.spaces?.[0]
                      ? `${event.spaces[0].startTime} - ${event.spaces[0].endTime}`
                      : ""
                    const statusColor = quoteStatusColors[event.status] || "#6B7280"
                    const live = isToday && isHappeningNow(event)
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "relative bg-vm-white text-vm-charcoal border-l-4 rounded-lg p-3 shadow-md overflow-hidden",
                          live && "vm-now-card"
                        )}
                        style={{ borderLeftColor: live ? "#F59E0B" : statusColor }}
                      >
                        {live && (
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-vm-amber text-vm-charcoal text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-vm-charcoal vm-now-dot" />
                            Ahora
                          </div>
                        )}
                        <div className="text-lg font-bold truncate pr-16">{event.client?.name}</div>
                        {event.eventTitle && <div className="text-sm text-vm-charcoal/70 truncate">{event.eventTitle}</div>}
                        {!live && (
                          <span
                            className="inline-block mt-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full text-vm-white max-w-full truncate"
                            style={{ backgroundColor: statusColor }}
                          >
                            {quoteStatusLabels[event.status] || event.status}
                          </span>
                        )}
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
