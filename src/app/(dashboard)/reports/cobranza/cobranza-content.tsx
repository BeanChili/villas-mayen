"use client"

import { useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatCurrencyByCode, cn } from "@/lib/utils"
import { quoteStatusColors, quoteStatusLabels } from "@/types"
import { Search, AlertTriangle, CalendarClock, Coins, Download } from "lucide-react"

interface Row {
  id: string
  clientName: string
  eventTitle: string | null
  eventDate: string
  status: string
  currency: string
  total: number
  paid: number
  saldo: number
  salon: string
}

type Filter = "todos" | "semana" | "atrasados"

// Agrupa los saldos por moneda → { GTQ: n, USD: n }
const sumByCurrency = (list: { currency: string; saldo: number }[]) =>
  list.reduce((acc, r) => { acc[r.currency] = (acc[r.currency] || 0) + r.saldo; return acc }, {} as Record<string, number>)

// Renderiza uno o varios montos (uno por moneda) — el primero grande, el resto menor
function Amounts({ map, big, tone }: { map: Record<string, number>; big: string; tone?: string }) {
  const entries = Object.entries(map).filter(([, v]) => v > 0.5)
  if (entries.length === 0) return <div className={cn(big, tone)}>{formatCurrencyByCode(0, "GTQ")}</div>
  return (
    <div className="space-y-0.5">
      {entries.map(([cur, val], i) => (
        <div key={cur} className={cn(i === 0 ? big : "text-base font-semibold font-mono opacity-80", tone)}>
          {formatCurrencyByCode(val, cur)}
        </div>
      ))}
    </div>
  )
}

const startOfToday = () => {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 0, 0, 0).getTime()
}

export default function CobranzaContent({ rows }: { rows: Row[] }) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("todos")

  const today = startOfToday()
  const weekAhead = today + 7 * 86400000

  // Días entre hoy y el evento (negativo = ya pasó)
  const daysTo = (iso: string) => Math.round((new Date(iso).setHours(0, 0, 0, 0) - today) / 86400000)

  const enriched = useMemo(() => {
    return rows
      .map(r => ({ ...r, d: daysTo(r.eventDate) }))
      .sort((a, b) => a.d - b.d) // atrasados primero, luego más próximos
  }, [rows])

  const totals = useMemo(() => {
    const semana = enriched.filter(r => {
      const t = new Date(r.eventDate).getTime()
      return t >= today && t <= weekAhead
    })
    const atrasados = enriched.filter(r => r.d < 0)
    return {
      total: sumByCurrency(enriched),
      count: enriched.length,
      semanaMonto: sumByCurrency(semana),
      semanaCount: semana.length,
      atrasadosMonto: sumByCurrency(atrasados),
      atrasadosCount: atrasados.length,
    }
  }, [enriched, today, weekAhead])

  const visible = useMemo(() => {
    let list = enriched
    if (filter === "semana") list = list.filter(r => { const t = new Date(r.eventDate).getTime(); return t >= today && t <= weekAhead })
    if (filter === "atrasados") list = list.filter(r => r.d < 0)
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(r => r.clientName.toLowerCase().includes(q) || (r.eventTitle || "").toLowerCase().includes(q))
    return list
  }, [enriched, filter, search, today, weekAhead])

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-GT", { weekday: "short", day: "numeric", month: "short" })

  const exportExcel = () => {
    const data = visible.map(r => ({
      Cliente: r.clientName,
      Evento: r.eventTitle || "",
      Salón: r.salon,
      Fecha: new Date(r.eventDate).toLocaleDateString("es-GT"),
      Estado: quoteStatusLabels[r.status] || r.status,
      Moneda: r.currency,
      Total: r.total,
      Pagado: r.paid,
      Saldo: r.saldo,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Cobranza")
    XLSX.writeFile(wb, `Cobranza_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const dayBadge = (d: number) => {
    if (d < 0) return { text: `Hace ${Math.abs(d)}d`, cls: "bg-red-100 text-red-700" }
    if (d === 0) return { text: "Hoy", cls: "bg-amber-100 text-amber-800" }
    if (d <= 7) return { text: `En ${d}d`, cls: "bg-amber-50 text-amber-700" }
    return { text: `En ${d}d`, cls: "bg-muted text-muted-foreground" }
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "todos", label: "Todos", count: totals.count },
    { key: "semana", label: "Esta semana", count: totals.semanaCount },
    { key: "atrasados", label: "Atrasados", count: totals.atrasadosCount },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Cuentas por Cobrar</h1>
        <p className="text-sm text-muted-foreground mt-1">Eventos confirmados con saldo pendiente de pago</p>
      </div>

      {/* Resumen: total destacado + secundarios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-2xl bg-primary text-primary-foreground p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <Coins className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Total por cobrar</span>
          </div>
          <div className="mt-4">
            <Amounts map={totals.total} big="text-4xl font-bold font-mono tabular-nums" />
            <div className="text-sm text-primary-foreground/70 mt-1">{totals.count} evento{totals.count !== 1 ? "s" : ""} con saldo</div>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-amber-700">
            <CalendarClock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Por cobrar esta semana</span>
          </div>
          <div className="mt-4">
            <Amounts map={totals.semanaMonto} big="text-3xl font-bold font-mono tabular-nums" tone="text-amber-900" />
            <div className="text-sm text-amber-700/80 mt-1">{totals.semanaCount} evento{totals.semanaCount !== 1 ? "s" : ""} en los próximos 7 días</div>
          </div>
        </div>

        <div className={cn(
          "rounded-2xl border p-6 flex flex-col justify-between",
          totals.atrasadosCount > 0 ? "border-red-200 bg-red-50" : "border-border bg-card"
        )}>
          <div className={cn("flex items-center gap-2", totals.atrasadosCount > 0 ? "text-red-700" : "text-muted-foreground")}>
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Atrasados</span>
          </div>
          <div className="mt-4">
            <Amounts map={totals.atrasadosMonto} big="text-3xl font-bold font-mono tabular-nums" tone={totals.atrasadosCount > 0 ? "text-red-900" : "text-foreground"} />
            <div className={cn("text-sm mt-1", totals.atrasadosCount > 0 ? "text-red-700/80" : "text-muted-foreground")}>
              {totals.atrasadosCount} evento{totals.atrasadosCount !== 1 ? "s" : ""} ya realizados con saldo
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg overflow-hidden border border-border">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn("vm-view-switch flex items-center gap-1.5", filter === f.key ? "vm-view-switch--active" : "vm-view-switch--idle")}
            >
              {f.label}
              <span className="text-[10px] opacity-70">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente o evento..." className="pl-9 w-64" />
          </div>
          <Button variant="outline" className="gap-2" onClick={exportExcel} disabled={visible.length === 0}>
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente / Evento</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Pagado</th>
                <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    <Coins className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    {rows.length === 0 ? "No hay saldos pendientes. ¡Todo cobrado!" : "Sin resultados para este filtro."}
                  </td>
                </tr>
              ) : (
                visible.map(r => {
                  const pct = r.total > 0 ? Math.min((r.paid / r.total) * 100, 100) : 0
                  const badge = dayBadge(r.d)
                  return (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{r.clientName}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[240px]">
                          {[r.eventTitle, r.salon].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-foreground">{fmtDate(r.eventDate)}</div>
                        <span className={cn("inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full", badge.cls)}>{badge.text}</span>
                      </td>
                      <td className="p-3">
                        <span className="vm-status-badge text-[10px]" style={{ backgroundColor: quoteStatusColors[r.status] || "#9ca3af", color: "#fff" }}>
                          {quoteStatusLabels[r.status] || r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-foreground whitespace-nowrap">
                        {formatCurrencyByCode(r.total, r.currency)}
                        {r.currency !== "GTQ" && <span className="ml-1 text-[10px] text-muted-foreground">{r.currency}</span>}
                      </td>
                      <td className="p-3">
                        <div className="font-mono text-xs text-vm-sage mb-1">{formatCurrencyByCode(r.paid, r.currency)}</div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-vm-sage rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-vm-sienna whitespace-nowrap">{formatCurrencyByCode(r.saldo, r.currency)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
