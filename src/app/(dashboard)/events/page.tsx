"use client"

import { useEffect, useState } from "react"
import { formatCurrency, formatCurrencyByCode } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { quoteStatusLabels, quoteStatusColors, returnStatusLabels } from "@/types"
import { Archive, Loader2, Check, AlertTriangle, XCircle, DollarSign } from "lucide-react"

interface Quote {
  id: string
  client: { name: string }
  eventDate: string
  endDate: string | null
  status: string
  totalAmount: number
  currency: string
  spaces: { locationName: string; startTime: string; endTime: string }[]
  items: { 
    id: string;
    name: string; 
    unitPrice: number;
    dailyQuantities?: Array<{ quantity: number }>
    productId?: string;
    furnitureId?: string; 
    furniture?: { id: string; name: string } 
  }[]
  paidAmount?: number
  pendingAmount?: number
  payments?: { amount: number; currency: string; createdAt: string }[]
}

interface EventClosing {
  id: string
  quoteId: string
  closingDate: string
  returnStatus: string
  observations: string
  damageCost: number
  lossCost: number
  items: EventClosingItem[]
}

interface EventClosingItem {
  id: string
  furnitureId?: string
  furniture?: { name: string; inventoryNumber: string }
  itemName?: string
  quantity: number
  returnStatus: string
  damageDescription?: string
  repairCost: number
}

export default function EventsPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [closings, setClosings] = useState<EventClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [furnitureItems, setFurnitureItems] = useState<any[]>([])
  const [formData, setFormData] = useState({
    returnStatus: "COMPLETO",
    observations: "",
    items: [] as { itemId: string; name: string; quantity: number; returnStatus: string; damageDescription: string; repairCost: number }[],
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [quotesRes, closingsRes, furnitureRes] = await Promise.all([
        fetch("/api/quotes?status=EN_EJECUCION"),
        fetch("/api/event-closings"),
        fetch("/api/furniture"),
      ])
      
      const quotesData = await quotesRes.json()
      const closingsData = await closingsRes.json()
      const furnitureData = await furnitureRes.json()
      
      setQuotes(quotesData.data || [])
      setClosings(closingsData.data || [])
      setFurnitureItems(furnitureData.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLiquidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuote) return

    // Validate that quote has a linked reservation
    if (selectedQuote.status !== "CONFIRMADA" && selectedQuote.status !== "EN_EJECUCION") {
      alert("Esta cotización debe estar confirmada o en ejecución para liquidar.")
      return
    }

    const damageCost = formData.items
      .filter(i => i.returnStatus === "RETORNADO_DANADO")
      .reduce((sum, i) => sum + i.repairCost, 0)
    
    const lossCost = formData.items
      .filter(i => i.returnStatus === "NO_RETORNADO")
      .reduce((sum, i) => sum + (i.repairCost || 0), 0)

    try {
      // 1. Create event closing
      const closingRes = await fetch("/api/event-closings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteId: selectedQuote.id,
          returnStatus: formData.returnStatus,
          observations: formData.observations,
          damageCost,
          lossCost,
          items: formData.items,
        }),
      })
      
      if (!closingRes.ok) {
        const err = await closingRes.json()
        alert(err.error || "Error al cerrar evento")
        return
      }

      // 2. Update quote status to FINALIZADA
      await fetch(`/api/quotes/${selectedQuote.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FINALIZADA" }),
      })

      setIsDialogOpen(false)
      fetchData()
      resetForm()
    } catch (error) {
      console.error("Error liquidating event:", error)
      alert("Error al liquidar evento")
    }
  }

  const resetForm = () => {
    setSelectedQuote(null)
    setFormData({
      returnStatus: "COMPLETO",
      observations: "",
      items: [],
    })
  }

  const openLiquidationDialog = (quote: Quote) => {
    setSelectedQuote(quote)
    
    // Use ALL items from the quote (products + furniture)
    const itemsFromQuote = quote.items
      ?.map(item => ({
        itemId: item.id,
        name: item.name,
        quantity: item.dailyQuantities?.reduce((sum, dq) => sum + dq.quantity, 0) || 0,
        returnStatus: "RETORNADO_OK" as string,
        damageDescription: "",
        repairCost: 0,
      })) || []
    
    setFormData({
      returnStatus: "COMPLETO",
      observations: "",
      items: itemsFromQuote,
    })
    setIsDialogOpen(true)
  }

  const updateItemStatus = (index: number, returnStatus: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, returnStatus } : item
      )
    }))
  }

  const updateItemRepairCost = (index: number, cost: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, repairCost: cost } : item
      )
    }))
  }

  const activeQuotes = quotes.filter(q => q.status === "EN_EJECUCION")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Eventos</h1>
          <p className="text-gray-500">Liquidación de eventos y control de mobiliario</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-full">
              <Archive className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeQuotes.length}</p>
              <p className="text-sm text-gray-500">En Ejecución</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-full">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {closings.filter(c => c.returnStatus === "COMPLETO").length}
              </p>
              <p className="text-sm text-gray-500">Cierres Completados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-full">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {closings.filter(c => c.returnStatus === "CON_DANOS").length}
              </p>
              <p className="text-sm text-gray-500">Con Daños</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-full">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {closings.filter(c => c.returnStatus === "CON_PERDIDAS").length}
              </p>
              <p className="text-sm text-gray-500">Con Pérdidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Events */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Activos - Pendientes de Liquidación</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : activeQuotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay eventos activos para liquidar
            </div>
          ) : (
            <div className="space-y-4">
              {activeQuotes.map(quote => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{quote.client.name}</p>
                    <p className="text-sm text-gray-500">
                      {quote.spaces.map(s => s.locationName).join(", ")}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(quote.eventDate).toLocaleDateString("es-GT")}
                      {quote.endDate && quote.endDate !== quote.eventDate && 
                        ` - ${new Date(quote.endDate).toLocaleDateString("es-GT")}`}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-mono font-medium">
                        {formatCurrencyByCode(quote.totalAmount, quote.currency)}
                      </span>
                      {(quote.paidAmount || 0) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          (Pagado: {formatCurrencyByCode(quote.paidAmount || 0, quote.currency)})
                        </span>
                      )}
                    </div>
                  </div>
                  <Button 
                    onClick={() => openLiquidationDialog(quote)}
                    disabled={quote.status !== "CONFIRMADA" && quote.status !== "EN_EJECUCION"}
                    title={quote.status !== "CONFIRMADA" && quote.status !== "EN_EJECUCION" ? "La cotización debe estar confirmada para liquidar" : ""}
                  >
                    Liquidar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Closings */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cierres</CardTitle>
        </CardHeader>
        <CardContent>
          {closings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay cierres registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Fecha Cierre</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Costo Daños</th>
                    <th className="text-left p-3 font-medium">Costo Pérdidas</th>
                    <th className="text-left p-3 font-medium">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {closings.map(closing => (
                    <tr key={closing.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {new Date(closing.closingDate).toLocaleDateString("es-GT")}
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={
                            closing.returnStatus === "COMPLETO" ? "default" :
                            closing.returnStatus === "CON_DANOS" ? "secondary" : "destructive"
                          }
                        >
                          {returnStatusLabels[closing.returnStatus as keyof typeof returnStatusLabels] || closing.returnStatus}
                        </Badge>
                      </td>
                      <td className="p-3">{formatCurrency(closing.damageCost)}</td>
                      <td className="p-3">{formatCurrency(closing.lossCost)}</td>
                      <td className="p-3 text-gray-600">{closing.observations || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liquidation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Liquidación de Evento</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <form onSubmit={handleLiquidate} className="space-y-6">
              {/* Quote Summary */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-lg">{selectedQuote.client.name}</p>
                  <Badge style={{ backgroundColor: quoteStatusColors["EN_EJECUCION"], color: "#fff" }}>
                    {quoteStatusLabels["EN_EJECUCION"]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedQuote.spaces.map(s => `${s.locationName} (${s.startTime}-${s.endTime})`).join(" | ")}
                </p>
                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Cotización</p>
                    <p className="font-mono font-semibold">{formatCurrencyByCode(selectedQuote.totalAmount, selectedQuote.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pagado</p>
                    <p className="font-mono font-semibold text-green-600">
                      {formatCurrencyByCode(selectedQuote.paidAmount || 0, selectedQuote.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pendiente</p>
                    <p className="font-mono font-semibold text-orange-600">
                      {formatCurrencyByCode(selectedQuote.pendingAmount || selectedQuote.totalAmount, selectedQuote.currency)}
                    </p>
                  </div>
                </div>
                {selectedQuote.payments && selectedQuote.payments.length > 0 && (
                  <div className="pt-2 border-t border-border mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Pagos registrados:</p>
                    <div className="space-y-1">
                      {selectedQuote.payments && selectedQuote.payments.map((p: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{new Date(p.createdAt).toLocaleDateString("es-GT")}</span>
                          <span className="font-mono">{formatCurrencyByCode(p.amount, p.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Return Status */}
              <div className="space-y-2">
                <label className="font-medium">Estado de Retorno del Mobiliario</label>
                <Select
                  value={formData.returnStatus}
                  onValueChange={(value) => setFormData({ ...formData, returnStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPLETO">Completo - Todo retornado</SelectItem>
                    <SelectItem value="CON_DANOS">Con Daños</SelectItem>
                    <SelectItem value="CON_PERDIDAS">Con Pérdidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Furniture Items */}
              <div className="space-y-2">
                <label className="font-medium">Control de Mobiliario</label>
                {formData.items.length === 0 ? (
                  <div className="p-4 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
                    Esta cotización no tiene items asignados.
                  </div>
                ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 border rounded bg-background">
                      <span className="flex-1 text-sm font-medium">
                        {item.name} {item.quantity > 1 && `(x${item.quantity})`}
                      </span>
                      <Select
                        value={item.returnStatus}
                        onValueChange={(value) => updateItemStatus(index, value)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RETORNADO_OK">OK</SelectItem>
                          <SelectItem value="RETORNADO_DANADO">Dañado</SelectItem>
                          <SelectItem value="NO_RETORNADO">Perdido</SelectItem>
                        </SelectContent>
                      </Select>
                      {item.returnStatus === "RETORNADO_DANADO" && (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Costo reparación"
                          value={item.repairCost || ""}
                          onChange={(e) => updateItemRepairCost(index, parseFloat(e.target.value) || 0)}
                          className="w-28"
                        />
                      )}
                    </div>
                  ))}
                </div>
                )}
              </div>

              {/* Observations */}
              <div className="space-y-2">
                <label className="font-medium">Observaciones / Incidencias</label>
                <textarea
                  className="w-full p-2 border rounded-md bg-background"
                  rows={3}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  placeholder="Describa cualquier incidencia durante el evento..."
                />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  <Check className="w-4 h-4 mr-2" />
                  Liquidar Evento
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
