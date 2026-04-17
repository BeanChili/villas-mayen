"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { quoteStatusLabels, productCategoryLabels } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Plus, Search, Loader2, Eye, Send, Check, X, FileText } from "lucide-react"

// ─── tipos locales ────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  category: string
  unitPrice: number
  unitMeasure: string
}

interface Quote {
  id: string
  clientId: string
  client: { name: string }
  eventDate: string
  locationName: string
  schedules: string
  status: string
  totalAmount: number
  notes?: string
  createdAt: string
}

interface QuoteItem {
  id: string
  name: string
  category: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

// ─── colores de estado de cotización ─────────────────────────────────────────

const QUOTE_STATUS_COLOR: Record<string, string> = {
  BORRADOR:  "#9ca3af",
  ENVIADA:   "#f59e0b",
  APROBADA:  "#22c55e",
  RECHAZADA: "#ef4444",
}

function getQuoteStatusColor(status: string) {
  return QUOTE_STATUS_COLOR[status] ?? "#9ca3af"
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])

  // Client search state
  const [clientSearch, setClientSearch] = useState("")
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

  const [formData, setFormData] = useState({
    clientId: "",
    eventDate: "",
    locationType: "HALL",
    locationId: "",
    schedules: [] as string[],
    notes: "",
    items: [] as { productId: string; name: string; category: string; quantity: number; unitPrice: number }[],
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [quotesRes, clientsRes, productsRes, locationsRes] = await Promise.all([
        fetch("/api/quotes"),
        fetch("/api/clients"),
        fetch("/api/products"),
        fetch("/api/locations"),
      ])
      setQuotes(await quotesRes.json())
      setClients(await clientsRes.json())
      setProducts(await productsRes.json())
      setLocations(await locationsRes.json())
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const totalAmount = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          locationName: locations.find(l => l.id === formData.locationId)?.name || "",
          totalAmount,
        }),
      })
      if (response.ok) {
        setIsDialogOpen(false)
        fetchData()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || "Error al crear cotización")
      }
    } catch (error) {
      console.error("Error creating quote:", error)
    }
  }

  const resetForm = () => {
    setFormData({ clientId: "", eventDate: "", locationType: "HALL", locationId: "", schedules: [], notes: "", items: [] })
    setClientSearch("")
    setClientDropdownOpen(false)
  }

  const toggleSchedule = (schedule: string) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.includes(schedule)
        ? prev.schedules.filter(s => s !== schedule)
        : [...prev.schedules, schedule],
    }))
  }

  const addItem = (product: Product) => {
    const exists = formData.items.find(i => i.productId === product.id)
    if (exists) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { productId: product.id, name: product.name, category: product.category, quantity: 1, unitPrice: product.unitPrice }],
      }))
    }
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  const updateItemQuantity = (index: number, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, quantity } : item)),
    }))
  }

  const handleStatusChange = async (quoteId: string, status: string) => {
    try {
      await fetch(`/api/quotes/${quoteId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      fetchData()
    } catch (error) {
      console.error("Error updating quote status:", error)
    }
  }

  const viewQuoteDetails = async (quote: Quote) => {
    try {
      const response = await fetch(`/api/quotes/${quote.id}`)
      const data = await response.json()
      setSelectedQuote(quote)
      setQuoteItems(data.items || [])
    } catch (error) {
      console.error("Error fetching quote details:", error)
    }
  }

  const availableLocations = locations.filter(l => l.type === formData.locationType)
  const totalAmount = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.client.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || q.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = []
    acc[product.category].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  const SCHEDULE_LABELS: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" }

  // Stats
  const statBorrador  = quotes.filter(q => q.status === "BORRADOR").length
  const statEnviada   = quotes.filter(q => q.status === "ENVIADA").length
  const statAprobada  = quotes.filter(q => q.status === "APROBADA").length
  const statRechazada = quotes.filter(q => q.status === "RECHAZADA").length

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">Administra las cotizaciones de eventos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Cotización
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: quotes.length, color: "text-foreground" },
          { label: "Borrador", value: statBorrador, color: "text-muted-foreground" },
          { label: "Enviadas", value: statEnviada, color: "text-vm-gold" },
          { label: "Aprobadas", value: statAprobada, color: "text-vm-sage" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            <p className={cn("text-3xl font-display mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex rounded-lg overflow-hidden border border-border">
          {(["all", "BORRADOR", "ENVIADA", "APROBADA", "RECHAZADA"] as const).map(s => (
            <button
              key={s}
              className={cn(
                "vm-view-switch",
                statusFilter === s ? "vm-view-switch--active" : "vm-view-switch--idle"
              )}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "Todos" : (quoteStatusLabels[s as keyof typeof quoteStatusLabels] ?? s)}
            </button>
          ))}
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
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Evento</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ubicación</th>
                  <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Creada</th>
                  <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No hay cotizaciones</p>
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map(quote => (
                    <tr key={quote.id} className="vm-table-row">
                      <td className="p-3 font-medium text-foreground max-w-[160px] truncate" title={quote.client.name}>
                        {quote.client.name}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(quote.eventDate).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-3 text-muted-foreground max-w-[120px] truncate">{quote.locationName}</td>
                      <td className="p-3 text-right font-mono font-medium text-foreground">{formatCurrency(quote.totalAmount)}</td>
                      <td className="p-3">
                        <span
                          className="vm-status-badge"
                          style={{ backgroundColor: getQuoteStatusColor(quote.status), color: "#fff" }}
                        >
                          {quoteStatusLabels[quote.status as keyof typeof quoteStatusLabels] ?? quote.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(quote.createdAt).toLocaleDateString("es-GT", { day: "numeric", month: "short" })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewQuoteDetails(quote)} title="Ver detalle">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {quote.status === "BORRADOR" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-vm-gold hover:text-vm-gold" onClick={() => handleStatusChange(quote.id, "ENVIADA")} title="Enviar">
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {quote.status === "ENVIADA" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-vm-sage hover:text-vm-sage" onClick={() => handleStatusChange(quote.id, "APROBADA")} title="Aprobar">
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleStatusChange(quote.id, "RECHAZADA")} title="Rechazar">
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Dialog: Nueva Cotización ──────────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Nueva Cotización</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cliente con búsqueda */}
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="relative">
                  <div
                    className="flex items-center border border-input rounded-md bg-background px-3 py-2 text-sm cursor-pointer"
                    onClick={() => setClientDropdownOpen(v => !v)}
                  >
                    <Search className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
                    {formData.clientId
                      ? <span className="truncate">{clients.find(c => c.id === formData.clientId)?.name ?? "Cliente"}</span>
                      : <span className="text-muted-foreground">Buscar cliente...</span>
                    }
                  </div>
                  {clientDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                      <div className="p-2 border-b border-border">
                        <input
                          autoFocus
                          className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                          placeholder="Escribir nombre..."
                          value={clientSearch}
                          onChange={e => setClientSearch(e.target.value)}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {clients
                          .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                          .slice(0, 20)
                          .map(c => (
                            <div
                              key={c.id}
                              className={cn(
                                "px-3 py-2 text-sm cursor-pointer hover:bg-accent truncate",
                                formData.clientId === c.id && "bg-accent font-medium"
                              )}
                              onClick={() => {
                                setFormData({ ...formData, clientId: c.id })
                                setClientDropdownOpen(false)
                                setClientSearch("")
                              }}
                            >
                              {c.name}
                            </div>
                          ))
                        }
                        {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-4 text-sm text-muted-foreground text-center">Sin resultados</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fecha del evento */}
              <div className="space-y-2">
                <Label>Fecha del Evento</Label>
                <Input
                  type="date"
                  value={formData.eventDate}
                  onChange={e => setFormData({ ...formData, eventDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tipo de ubicación */}
              <div className="space-y-2">
                <Label>Tipo de Ubicación</Label>
                <Select
                  value={formData.locationType}
                  onValueChange={v => setFormData({ ...formData, locationType: v, locationId: "" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE_AREA">Área Libre</SelectItem>
                    <SelectItem value="DINING_ROOM">Comedor</SelectItem>
                    <SelectItem value="HALL">Salón</SelectItem>
                    <SelectItem value="GARDEN">Jardín</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ubicación */}
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Select
                  value={formData.locationId}
                  onValueChange={v => setFormData({ ...formData, locationId: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {availableLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Horarios */}
            <div className="space-y-2">
              <Label>Horarios</Label>
              <div className="grid grid-cols-3 rounded-lg overflow-hidden border border-border">
                {(["MANANA", "TARDE", "NOCHE"] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    className={cn(
                      "py-3 text-sm font-medium text-center transition-all duration-150",
                      formData.schedules.includes(s)
                        ? "vm-schedule-btn--active"
                        : "vm-schedule-btn--idle border-r border-border last:border-r-0"
                    )}
                    onClick={() => toggleSchedule(s)}
                  >
                    {SCHEDULE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Productos */}
            <div className="space-y-2">
              <Label>Agregar Productos</Label>
              <Tabs defaultValue="COMIDA_MENU">
                <TabsList className="flex-wrap h-auto">
                  {Object.keys(productCategoryLabels).map(cat => (
                    <TabsTrigger key={cat} value={cat} className="text-xs">
                      {productCategoryLabels[cat as keyof typeof productCategoryLabels]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(productCategoryLabels).map(([cat]) => (
                  <TabsContent key={cat} value={cat}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {(productsByCategory[cat] || []).map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addItem(product)}
                          className="flex items-center justify-between text-left text-xs px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
                        >
                          <span className="truncate mr-2">{product.name}</span>
                          <span className="font-mono text-muted-foreground shrink-0">{formatCurrency(product.unitPrice)}</span>
                        </button>
                      ))}
                      {(productsByCategory[cat] || []).length === 0 && (
                        <p className="text-xs text-muted-foreground col-span-3 py-4 text-center">Sin productos en esta categoría</p>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Items seleccionados */}
            {formData.items.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                      <th className="text-center p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Cant.</th>
                      <th className="text-right p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Precio</th>
                      <th className="text-right p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index} className="border-b border-border last:border-0">
                        <td className="p-2.5 font-medium">{item.name}</td>
                        <td className="p-2.5 text-center">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-16 h-7 text-center mx-auto font-mono text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-right font-mono text-muted-foreground">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-2.5 text-right font-mono font-medium">{formatCurrency(item.quantity * item.unitPrice)}</td>
                        <td className="p-2.5">
                          <button type="button" onClick={() => removeItem(index)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td colSpan={3} className="p-2.5 text-right text-sm font-semibold text-muted-foreground">Total:</td>
                      <td className="p-2.5 text-right font-mono font-semibold text-foreground">{formatCurrency(totalAmount)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales (opcional)"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm() }}>
                Cancelar
              </Button>
              <Button type="submit">Crear Cotización</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalle de Cotización ─────────────────────────────────────── */}
      {selectedQuote && (
        <Dialog open={!!selectedQuote} onOpenChange={open => { if (!open) { setSelectedQuote(null); setQuoteItems([]) } }}>
          <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Detalle de Cotización</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              {/* Client + status */}
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {selectedQuote.client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground truncate">{selectedQuote.client.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{selectedQuote.locationName}</p>
                </div>
                <span
                  className="vm-status-badge shrink-0"
                  style={{ backgroundColor: getQuoteStatusColor(selectedQuote.status), color: "#fff" }}
                >
                  {quoteStatusLabels[selectedQuote.status as keyof typeof quoteStatusLabels] ?? selectedQuote.status}
                </span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="vm-info-block">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha Evento</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(selectedQuote.eventDate).toLocaleDateString("es-GT", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="vm-info-block">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                  <p className="text-sm font-mono font-semibold text-foreground">{formatCurrency(selectedQuote.totalAmount)}</p>
                </div>
              </div>

              {/* Items */}
              {quoteItems.length > 0 && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                        <th className="text-center p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cant.</th>
                        <th className="text-right p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteItems.map(item => (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="p-2.5">{item.name}</td>
                          <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Notes */}
              {selectedQuote.notes && (
                <div className="vm-info-block">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notas</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{selectedQuote.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap pt-1">
                {selectedQuote.status === "BORRADOR" && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { handleStatusChange(selectedQuote.id, "ENVIADA"); setSelectedQuote({ ...selectedQuote, status: "ENVIADA" }) }}>
                    <Send className="w-3.5 h-3.5" /> Enviar
                  </Button>
                )}
                {selectedQuote.status === "ENVIADA" && (
                  <>
                    <Button size="sm" className="gap-1.5 bg-vm-sage hover:bg-vm-sage/90" onClick={() => { handleStatusChange(selectedQuote.id, "APROBADA"); setSelectedQuote({ ...selectedQuote, status: "APROBADA" }) }}>
                      <Check className="w-3.5 h-3.5" /> Aprobar
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => { handleStatusChange(selectedQuote.id, "RECHAZADA"); setSelectedQuote({ ...selectedQuote, status: "RECHAZADA" }) }}>
                      <X className="w-3.5 h-3.5" /> Rechazar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
