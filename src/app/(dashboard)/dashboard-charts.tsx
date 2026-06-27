"use client"

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts"
import { formatCurrency, cn } from "@/lib/utils"
import { quoteStatusColors, quoteStatusLabels } from "@/types"
import { TrendingUp, PieChart as PieIcon, MapPin } from "lucide-react"

interface ChartsData {
  monthlyRevenue: { label: string; facturado: number; cobrado: number }[]
  statusBreakdown: { status: string; count: number }[]
  topSalones: { name: string; count: number }[]
}

const compact = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`

function Panel({ title, icon: Icon, children, className }: { title: string; icon: any; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function DashboardCharts({ monthlyRevenue, statusBreakdown, topSalones }: ChartsData) {
  const hasRevenue = monthlyRevenue.some(m => m.facturado > 0 || m.cobrado > 0)
  const pieData = statusBreakdown
    .filter(s => s.count > 0)
    .map(s => ({ name: quoteStatusLabels[s.status] || s.status, value: s.count, color: quoteStatusColors[s.status] || "#9ca3af" }))
  const totalQuotes = pieData.reduce((s, d) => s + d.value, 0)
  const maxSalon = Math.max(1, ...topSalones.map(s => s.count))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Ingresos por mes — ocupa 2 columnas */}
      <Panel title="Facturación últimos 6 meses" icon={TrendingUp} className="lg:col-span-2">
        {hasRevenue ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyRevenue} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={42} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(v: number, name: string) => [formatCurrency(v), name === "facturado" ? "Facturado" : "Cobrado"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
              />
              <Bar dataKey="facturado" name="facturado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={38} />
              <Bar dataKey="cobrado" name="cobrado" fill="#8FAE8B" radius={[4, 4, 0, 0]} maxBarSize={38} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
        <div className="flex items-center gap-5 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" /> Facturado</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "#8FAE8B" }} /> Cobrado</span>
        </div>
      </Panel>

      {/* Estados de cotizaciones — donut */}
      <Panel title="Cotizaciones por estado" icon={PieIcon}>
        {totalQuotes > 0 ? (
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ height: 200 }}>
              <span className="text-3xl font-bold text-foreground leading-none">{totalQuotes}</span>
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">total</span>
            </div>
          </div>
        ) : (
          <EmptyChart />
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
          {pieData.map(d => (
            <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
              {d.name} <span className="font-semibold text-foreground">{d.value}</span>
            </span>
          ))}
        </div>
      </Panel>

      {/* Salones más usados — barras horizontales */}
      <Panel title="Salones más solicitados" icon={MapPin} className="lg:col-span-3">
        {topSalones.length > 0 ? (
          <div className="space-y-2.5">
            {topSalones.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-foreground truncate">{s.name}</span>
                <div className="flex-1 h-7 rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-md flex items-center justify-end px-2 text-xs font-semibold text-primary-foreground transition-all"
                    style={{ width: `${(s.count / maxSalon) * 100}%`, background: i === 0 ? "hsl(var(--primary))" : "#6E8C6A", minWidth: 32 }}
                  >
                    {s.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyChart />
        )}
      </Panel>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground/60">
      Aún no hay datos suficientes
    </div>
  )
}
