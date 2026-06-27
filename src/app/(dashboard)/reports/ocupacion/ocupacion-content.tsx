"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react"

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
const DOW = ["", "Lun", "", "Mié", "", "Vie", ""]

// Escala de ocupación (verde marca) — claro = poco, oscuro = lleno
const SCALE = ["#eceee9", "#c3d8ba", "#8fb87f", "#5a934f", "#356b2c"]
const levelOf = (c: number) => (c <= 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : c <= 4 ? 3 : 4)

const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export default function OcupacionContent({ counts, year }: { counts: Record<string, number>; year: number }) {
  const router = useRouter()
  const thisYear = new Date().getFullYear()

  // Construir columnas semanales (cada una de 7 días, dom→sáb)
  const weeks = useMemo(() => {
    const first = new Date(year, 0, 1)
    const cur = new Date(first)
    cur.setDate(cur.getDate() - cur.getDay()) // retroceder al domingo
    const yearEnd = new Date(year, 11, 31)
    const cols: Date[][] = []
    while (cur <= yearEnd || cur.getDay() !== 0) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(new Date(cur))
        cur.setDate(cur.getDate() + 1)
      }
      cols.push(week)
      if (cur > yearEnd && cur.getDay() === 0) break
    }
    return cols
  }, [year])

  const stats = useMemo(() => {
    const entries = Object.entries(counts).filter(([k]) => k.startsWith(`${year}-`))
    const totalEvents = entries.reduce((s, [, v]) => s + v, 0)
    const busyDays = entries.length
    const peak = entries.reduce((m, [k, v]) => (v > m.v ? { k, v } : m), { k: "", v: 0 })
    const daysInYear = (new Date(year, 11, 31).getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1
    return { totalEvents, busyDays, peak, occupancyPct: Math.round((busyDays / daysInYear) * 100) }
  }, [counts, year])

  // Etiquetas de mes: posición de la columna donde empieza cada mes
  const monthLabels = useMemo(() => {
    const labels: { col: number; name: string }[] = []
    weeks.forEach((week, i) => {
      const firstOfYear = week.find(d => d.getFullYear() === year && d.getDate() <= 7)
      if (firstOfYear) {
        const m = firstOfYear.getMonth()
        if (!labels.some(l => l.name === MONTHS[m])) labels.push({ col: i, name: MONTHS[m] })
      }
    })
    return labels
  }, [weeks, year])

  const go = (y: number) => router.push(`/reports/ocupacion?year=${y}`)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Mapa de Ocupación</h1>
          <p className="text-sm text-muted-foreground mt-1">Qué tan ocupado estuvo cada día del año</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => go(year - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-display text-2xl text-foreground tabular-nums w-16 text-center">{year}</span>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => go(year + 1)} disabled={year >= thisYear + 1}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat value={stats.totalEvents} label="eventos en el año" />
        <Stat value={stats.busyDays} label="días con evento" />
        <Stat value={`${stats.occupancyPct}%`} label="del año ocupado" />
        <Stat value={stats.peak.v || 0} label={stats.peak.k ? `máx. en un día (${fmtShort(stats.peak.k)})` : "máx. en un día"} />
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-border bg-card p-5 overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Etiquetas de mes */}
          <div className="flex pl-10 mb-1">
            {weeks.map((_, i) => {
              const label = monthLabels.find(l => l.col === i)
              return (
                <div key={i} className="text-[11px] text-muted-foreground font-medium" style={{ width: 15 }}>
                  {label ? <span className="relative -left-0.5">{label.name}</span> : ""}
                </div>
              )
            })}
          </div>

          <div className="flex">
            {/* Días de la semana */}
            <div className="flex flex-col gap-[3px] pr-2 w-8 shrink-0">
              {DOW.map((d, i) => (
                <div key={i} className="text-[10px] text-muted-foreground h-3 leading-3 text-right">{d}</div>
              ))}
            </div>
            {/* Columnas-semana */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => {
                    const inYear = day.getFullYear() === year
                    const c = inYear ? (counts[keyOf(day)] || 0) : -1
                    return (
                      <div
                        key={di}
                        className="w-3 h-3 rounded-[3px]"
                        style={{ backgroundColor: c < 0 ? "transparent" : SCALE[levelOf(c)] }}
                        title={inYear ? `${day.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long" })} · ${c} evento${c !== 1 ? "s" : ""}` : undefined}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-2 mt-4 pl-10 text-[11px] text-muted-foreground">
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Menos</span>
            {SCALE.map((c, i) => (
              <span key={i} className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: c }} />
            ))}
            <span>Más</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-2xl font-bold text-foreground tabular-nums leading-none">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

function fmtShort(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-GT", { day: "numeric", month: "short" })
}
