"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { Loader2, FileText, Plus, Search, Wallet } from "lucide-react"

interface DailyClosing {
  id: string
  date: string
  totalEvents: number
  completedEvents: number
  totalCollected: number
  pendingAmount: number
  incidents?: string
  createdBy: string
  createdAt: string
}

export default function ClosingsPage() {
  const [closings, setClosings] = useState<DailyClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [generateDate, setGenerateDate] = useState("")
  const [generateIncidents, setGenerateIncidents] = useState("")
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchClosings()
  }, [fromDate, toDate])

  async function fetchClosings() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.append("from", fromDate)
      if (toDate) params.append("to", toDate)

      const res = await fetch(`/api/closings?${params.toString()}`)
      const data = await res.json()
      setClosings(data.data || [])
    } catch (error) {
      console.error("Error fetching closings:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!generateDate) return
    setGenerating(true)
    try {
      const res = await fetch("/api/closings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: generateDate, incidents: generateIncidents }),
      })
      if (res.ok) {
        setIsGenerateOpen(false)
        setGenerateDate("")
        setGenerateIncidents("")
        fetchClosings()
      } else {
        const err = await res.json()
        alert(err.error || "Error al generar cierre")
      }
    } catch (error) {
      console.error("Error generating closing:", error)
    } finally {
      setGenerating(false)
    }
  }

  const filtered = closings.filter((c) => {
    const d = new Date(c.date).toLocaleDateString("es-GT")
    return d.includes(search)
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Cierres Diarios</h1>
          <p className="text-sm text-muted-foreground mt-1">Resumen de cierres por fecha</p>
        </div>
        <Button onClick={() => setIsGenerateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Generar Cierre
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por fecha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                  <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Eventos</th>
                  <th className="text-center p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completados</th>
                  <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recaudado</th>
                  <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pendiente</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Incidentes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Wallet className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No hay cierres registrados</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((closing) => (
                    <tr key={closing.id} className="vm-table-row">
                      <td className="p-3 font-medium text-foreground">
                        {new Date(closing.date).toLocaleDateString("es-GT", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3 text-center text-muted-foreground">{closing.totalEvents}</td>
                      <td className="p-3 text-center text-muted-foreground">{closing.completedEvents}</td>
                      <td className="p-3 text-right font-mono font-medium text-foreground">{formatCurrency(closing.totalCollected)}</td>
                      <td className="p-3 text-right font-mono font-medium text-foreground">{formatCurrency(closing.pendingAmount)}</td>
                      <td className="p-3 text-muted-foreground text-xs max-w-xs truncate" title={closing.incidents || ""}>
                        {closing.incidents || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Generar Cierre Diario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Input type="date" value={generateDate} onChange={(e) => setGenerateDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Incidentes</Label>
              <Input
                value={generateIncidents}
                onChange={(e) => setGenerateIncidents(e.target.value)}
                placeholder="Describe cualquier incidente (opcional)"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsGenerateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={generating || !generateDate}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Generar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
