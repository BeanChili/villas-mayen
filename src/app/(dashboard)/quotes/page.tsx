"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { quoteStatusLabels, quoteStatusColors, productCategoryLabels, locationTypeLabels, itemReturnStatusLabels } from "@/types"
import { formatCurrency, formatCurrencyByCode, getScheduleFromTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { Plus, Search, Loader2, Eye, Send, Check, X, FileText, Trash2, Clock, MapPin, Wallet, Mail, AlertTriangle } from "lucide-react"

// ─── tipos locales ────────────────────────────────────────────────────────────

interface Client {
  id: string; name: string
}
interface LocationItem {
  id: string; name: string; type: string; capacity?: number; unitPrice?: number
}
interface Product {
  id: string; name: string; category: string; unitPrice: number; unitMeasure: string; menuType?: string
}
interface QuoteSpace {
  id?: string
  locationType: string; locationId: string; locationName: string
  startTime: string; endTime: string
  pricingMode: string; unitPrice: number; totalPrice: number
}
interface QuoteItem {
  id?: string; productId?: string; furnitureId?: string; name: string; category: string
  quantity: number; unitPrice: number; totalPrice: number
  discountType?: string; discountValue?: number
  scheduledDate?: string; startTime?: string; endTime?: string
}
interface Payment {
  id: string; amount: number; createdAt: string; createdByName: string; notes?: string
}
interface EventClosingItem {
  id: string; furnitureId: string; furniture?: { id: string; name: string; inventoryNumber: string }
  returnStatus: string; damageDescription?: string; repairCost: number; notes?: string
}
interface EventClosing {
  id: string; closingDate: string; returnStatus: string; observations?: string
  damageCost: number; lossCost: number; items: EventClosingItem[]
}
interface ReservationDetail {
  id: string; status: string; paidAmount: number; pendingAmount: number
  payments: Payment[]; eventClosing?: EventClosing
}
interface Quote {
  id: string; clientId: string; client: { name: string }
  eventDate: string; currency: string; guestCount?: number
  status: string; totalAmount: number; notes?: string
  spaces?: QuoteSpace[]; items?: QuoteItem[]
  reservation?: ReservationDetail
  createdAt: string
}
interface FurnitureItem {
  id: string; name: string; inventoryNumber: string; category: string; rentalPrice: number
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const LOCATION_OPTIONS = [
  { value: "FREE_AREA", label: "Área Libre" },
  { value: "DINING_ROOM", label: "Comedor" },
  { value: "HALL", label: "Salón" },
  { value: "GARDEN", label: "Jardín" },
  { value: "TERRACE", label: "Terraza" },
  { value: "ROOM", label: "Habitación" },
]

// ─── componente principal ─────────────────────────────────────────────────────

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [furniture, setFurniture] = useState<FurnitureItem[]>([])
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [clientSearch, setClientSearch] = useState("")
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(7.85)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  // Liquidation state
  const [liquidationOpen, setLiquidationOpen] = useState(false)
  const [liquidationFurniture, setLiquidationFurniture] = useState<FurnitureItem[]>([])
  const [liquidationItems, setLiquidationItems] = useState<Array<{
    itemId: string
    name: string
    quantity: number
    returnStatus: string
    damageDescription: string
    repairCost: number
    notes: string
  }>>([])
  const [liquidationReturnStatus, setLiquidationReturnStatus] = useState("COMPLETO")
  const [liquidationObservations, setLiquidationObservations] = useState("")
  const [savingLiquidation, setSavingLiquidation] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  // Menu dialog state (F3)
  const [menuDialogOpen, setMenuDialogOpen] = useState(false)
  const [selectedMenuProduct, setSelectedMenuProduct] = useState<Product | null>(null)
  const [menuFormData, setMenuFormData] = useState({
    scheduledDate: "",
    startTime: "",
    endTime: "",
    quantity: 1,
  })

  const [formData, setFormData] = useState({
    clientId: "",
    eventDate: "",
    endDate: "",
    currency: "GTQ" as "GTQ" | "USD",
    exchangeRate: 7.85,
    guestCount: 0,
    spaces: [] as QuoteSpace[],
    notes: "",
    items: [] as QuoteItem[],
  })

  useEffect(() => { fetchData(); fetchExchangeRate() }, [])

  async function fetchExchangeRate() {
    try {
      const res = await fetch("/api/exchange-rate")
      const data = await res.json()
      if (data.data?.rate) {
        setExchangeRate(data.data.rate)
        setFormData(prev => ({ ...prev, exchangeRate: data.data.rate }))
      }
    } catch {}
  }

  async function fetchData() {
    try {
      const [quotesRes, clientsRes, productsRes, furnitureRes, locationsRes] = await Promise.all([
        fetch("/api/quotes"),
        fetch("/api/clients"),
        fetch("/api/products"),
        fetch("/api/furniture"),
        fetch("/api/locations"),
      ])
      const q = await quotesRes.json()
      const c = await clientsRes.json()
      const p = await productsRes.json()
      const f = await furnitureRes.json()
      const l = await locationsRes.json()
      setQuotes(q.data || q)
      setClients(Array.isArray(c) ? c : c.data || [])
      setProducts(Array.isArray(p) ? p : p.data || [])
      setFurniture(Array.isArray(f) ? f : f.data || [])
      setLocations(Array.isArray(l) ? l : l.data || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally { setLoading(false) }
  }

  // ── form logic ──────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({ clientId: "", eventDate: "", endDate: "", currency: "GTQ", exchangeRate: exchangeRate || 7.85, guestCount: 0, spaces: [], notes: "", items: [] })
    setClientSearch("")
    setClientDropdownOpen(false)
  }

  const addSpace = () => {
    setFormData(prev => ({
      ...prev,
      spaces: [...prev.spaces, { locationType: "HALL", locationId: "", locationName: "", startTime: "07:00", endTime: "13:00", pricingMode: "PER_SPACE", unitPrice: 0, totalPrice: 0 }],
    }))
    setConflictWarning(null)
  }

  // Check for space conflicts
  const checkSpaceConflict = async (space: any, eventDate: string) => {
    if (!space.locationId || !eventDate) return
    
    try {
      const params = new URLSearchParams({
        locationId: space.locationId,
        eventDate: eventDate,
        startTime: space.startTime,
        endTime: space.endTime,
      })
      const res = await fetch(`/api/quotes/check-conflict?${params}`)
      const data = await res.json()
      if (data.hasConflict) {
        setConflictWarning(`⚠️ ${data.message}`)
      } else {
        setConflictWarning(null)
      }
    } catch (error) {
      console.error("Error checking conflict:", error)
    }
  }

  const updateSpace = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const spaces = [...prev.spaces]
      spaces[index] = { ...spaces[index], [field]: value }

      // Auto-completar locationName y precio al seleccionar ubicación
      if (field === "locationId") {
        const loc = locations.find(l => l.id === value)
        spaces[index].locationName = loc?.name || ""
        // Precio base en GTQ, convertir si la cotización es USD
        const basePrice = loc?.unitPrice || 0
        spaces[index].unitPrice = prev.currency === "USD" ? +(basePrice / exchangeRate).toFixed(2) : basePrice
      }

      // Recalcular totalPrice
      if (field === "unitPrice" || field === "pricingMode") {
        const price = spaces[index].pricingMode === "PER_PERSON" && prev.guestCount > 0
          ? prev.guestCount * (spaces[index].unitPrice || 0)
          : spaces[index].unitPrice || 0
        spaces[index].totalPrice = price
      }

      return { ...prev, spaces }
    })

    // Check for conflicts when location or time changes
    if (["locationId", "startTime", "endTime"].includes(field)) {
      const space = formData.spaces[index]
      const updatedSpace = { ...space, [field]: value }
      setTimeout(() => {
        checkSpaceConflict(updatedSpace, formData.eventDate)
      }, 100)
    }
  }

  // Recalcular todos los espacios cuando cambia moneda o guestCount
  const recalcSpaces = (newCurrency: string, newGuestCount: number) => {
    setFormData(prev => {
      const oldCurrency = prev.currency
      return {
        ...prev,
        currency: newCurrency as any,
        guestCount: newGuestCount,
        spaces: prev.spaces.map(sp => {
          let newPrice = sp.unitPrice
          if (oldCurrency === "GTQ" && newCurrency === "USD") newPrice = +(sp.unitPrice / exchangeRate).toFixed(2)
          else if (oldCurrency === "USD" && newCurrency === "GTQ") newPrice = +(sp.unitPrice * exchangeRate).toFixed(2)
          const total = sp.pricingMode === "PER_PERSON" && newGuestCount > 0 ? newGuestCount * newPrice : newPrice
          return { ...sp, unitPrice: newPrice, totalPrice: total }
        }),
        items: prev.items.map(item => {
          let newPrice = item.unitPrice
          if (oldCurrency === "GTQ" && newCurrency === "USD") newPrice = +(item.unitPrice / exchangeRate).toFixed(2)
          else if (oldCurrency === "USD" && newCurrency === "GTQ") newPrice = +(item.unitPrice * exchangeRate).toFixed(2)
          const t = item.quantity * newPrice
          const d = item.discountType === "PERCENT" ? t * ((item.discountValue || 0) / 100) : (item.discountValue || 0)
          return { ...item, unitPrice: newPrice, totalPrice: t - d }
        }),
      }
    })
  }

  const removeSpace = (index: number) => {
    setFormData(prev => ({ ...prev, spaces: prev.spaces.filter((_, i) => i !== index) }))
  }

  const addItem = (product: Product) => {
    // Si es comida/menu, abrir diálogo de configuración (F3)
    if (product.category === "COMIDA_MENU") {
      setSelectedMenuProduct(product)
      setMenuFormData({
        scheduledDate: formData.eventDate || "",
        startTime: "",
        endTime: "",
        quantity: formData.guestCount || 1,
      })
      setMenuDialogOpen(true)
      return
    }

    // Convertir precio si la cotización es USD
    const price = formData.currency === "USD" ? +(product.unitPrice / exchangeRate).toFixed(2) : product.unitPrice
    const exists = formData.items.find(i => i.productId === product.id)
    if (exists) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice - (i.discountValue || 0) } : i
        ),
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { productId: product.id, name: product.name, category: product.category, quantity: 1, unitPrice: price, totalPrice: price }],
      }))
    }
  }

  const addFurnitureItem = (furnitureItem: FurnitureItem) => {
    const rentalPrice = furnitureItem.rentalPrice || 0
    const price = formData.currency === "USD" && rentalPrice > 0
      ? +(rentalPrice / exchangeRate).toFixed(2) 
      : rentalPrice
    const exists = formData.items.find(i => i.furnitureId === furnitureItem.id)
    if (exists) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.furnitureId === furnitureItem.id ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice } : i
        ),
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { furnitureId: furnitureItem.id, name: furnitureItem.name, category: "MOBILIARIO", quantity: 1, unitPrice: price, totalPrice: price }],
      }))
    }
  }

  const confirmMenuItem = () => {
    if (!selectedMenuProduct) return
    const price = formData.currency === "USD" ? +(selectedMenuProduct.unitPrice / exchangeRate).toFixed(2) : selectedMenuProduct.unitPrice
    const qty = menuFormData.quantity || 1
    const total = qty * price
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: selectedMenuProduct.id,
        name: selectedMenuProduct.name,
        category: selectedMenuProduct.category,
        quantity: qty,
        unitPrice: price,
        totalPrice: total,
        scheduledDate: menuFormData.scheduledDate,
        startTime: menuFormData.startTime,
        endTime: menuFormData.endTime,
      }],
    }))
    setMenuDialogOpen(false)
    setSelectedMenuProduct(null)
  }

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const items = [...prev.items]
      items[index] = { ...items[index], [field]: value }
      if (field === "quantity" || field === "unitPrice" || field === "discountValue" || field === "discountType") {
        const t = items[index].quantity * items[index].unitPrice
        const d = items[index].discountType === "PERCENT" ? t * ((items[index].discountValue || 0) / 100) : (items[index].discountValue || 0)
        items[index].totalPrice = t - d
      }
      return { ...prev, items }
    })
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))
  }

  // ── submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.spaces.length === 0) { alert("Agregá al menos un espacio"); return }
    setSaving(true)
    try {
      const totalAmount = formData.spaces.reduce((s, sp) => s + sp.totalPrice, 0) +
        formData.items.reduce((s, it) => s + it.totalPrice, 0)

      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, totalAmount }),
      })
      if (response.ok) {
        setIsDialogOpen(false); resetForm(); fetchData()
      } else {
        const err = await response.json()
        alert(err.error || "Error al crear cotización")
      }
    } catch (error) {
      console.error("Error creating quote:", error)
    } finally { setSaving(false) }
  }

  // ── status change ───────────────────────────────────────────────────────────

  const handleStatusChange = async (quoteId: string, status: string) => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) { fetchData() }
      else {
        const err = await res.json()
        alert(err.error || "Error al cambiar estado")
      }
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  const viewQuoteDetails = async (quote: Quote) => {
    try {
      const response = await fetch(`/api/quotes/${quote.id}`)
      const data = await response.json()
      const detail = data.data || data
      setSelectedQuote({ ...quote, spaces: detail.spaces, items: detail.items, reservation: detail.reservation })
    } catch (error) {
      console.error("Error fetching quote details:", error)
    }
  }

  // ── liquidation ─────────────────────────────────────────────────────────────

  const openLiquidation = async () => {
    if (!selectedQuote?.reservation?.id) return
    
    // Use ALL items from the quote (products + furniture)
    const itemsFromQuote = selectedQuote.items
      ?.map((item: any) => ({
        itemId: item.id,
        name: item.name,
        quantity: item.quantity || 1,
        returnStatus: "RETORNADO_OK",
        damageDescription: "",
        repairCost: 0,
        notes: "",
      })) || []
    
    setLiquidationItems(itemsFromQuote)
    setLiquidationReturnStatus("COMPLETO")
    setLiquidationObservations("")
    setLiquidationOpen(true)
  }

  const addLiquidationItem = (itemId: string, name: string, quantity: number = 1) => {
    if (liquidationItems.find(i => i.itemId === itemId)) return
    setLiquidationItems(prev => [...prev, {
      itemId,
      name,
      quantity,
      returnStatus: "RETORNADO_OK",
      damageDescription: "",
      repairCost: 0,
      notes: "",
    }])
  }

  const removeLiquidationItem = (itemId: string) => {
    setLiquidationItems(prev => prev.filter(i => i.itemId !== itemId))
  }

  const updateLiquidationItem = (itemId: string, field: string, value: any) => {
    setLiquidationItems(prev => prev.map(i =>
      i.itemId === itemId ? { ...i, [field]: value } : i
    ))
  }

  const handleLiquidationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedQuote?.reservation?.id) return
    setSavingLiquidation(true)
    try {
      // 1. Create event closing
      const res = await fetch("/api/event-closings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: selectedQuote.reservation.id,
          returnStatus: liquidationReturnStatus,
          observations: liquidationObservations,
          items: liquidationItems,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Error al crear liquidación")
        return
      }

      // 2. Update quote status to FINALIZADA
      await fetch(`/api/quotes/${selectedQuote.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "FINALIZADA" }),
      })

      setLiquidationOpen(false)
      setSelectedQuote(null)
      fetchData() // Refresh the list
    } catch (error) {
      console.error("Error creating liquidation:", error)
      alert("Error al liquidar evento")
    } finally {
      setSavingLiquidation(false)
    }
  }

  const handleSendToAccounting = async () => {
    if (!selectedQuote) return
    const to = prompt("Ingrese el correo de contabilidad:", "contabilidad@villasmayen.com")
    if (!to) return
    setSendingEmail(true)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: selectedQuote.id, to }),
      })
      const data = await res.json()
      if (data.success) {
        alert("Email enviado a contabilidad")
      } else {
        alert(data.error || "Error al enviar email")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      alert("Error al enviar email")
    } finally {
      setSendingEmail(false)
    }
  }

  const downloadPDF = async (quote: Quote) => {
    try {
      const { pdf } = await import("@react-pdf/renderer")
      const QuotePDF = (await import("@/components/quote-pdf")).default
      
      const blob = await pdf(
        <QuotePDF quote={quote} />
      ).toBlob()
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Cotizacion-${quote.client.name}-${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Error al generar PDF")
    }
  }

  // ── computed ────────────────────────────────────────────────────────────────

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.client.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || q.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const spacesTotal = formData.spaces.reduce((s, sp) => s + sp.totalPrice, 0)
  const itemsTotal = formData.items.reduce((s, it) => s + it.totalPrice, 0)

  const locationsByType = locations.reduce((acc, loc) => {
    if (!acc[loc.type]) acc[loc.type] = []
    acc[loc.type].push(loc)
    return acc
  }, {} as Record<string, LocationItem[]>)

  const productsByCategory = products.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {} as Record<string, Product[]>)

  const statuses = ["BORRADOR", "ENVIADA", "NO_CONFIRMADA", "CONFIRMADA", "EN_EJECUCION", "CANCELADO", "FINALIZADA"]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">Administra las cotizaciones de eventos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nueva Cotización
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex rounded-lg overflow-hidden border border-border flex-wrap">
          {(["all", ...statuses] as const).map(s => (
            <button
              key={s}
              className={cn("vm-view-switch", statusFilter === s ? "vm-view-switch--active" : "vm-view-switch--idle")}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "Todos" : (quoteStatusLabels[s] ?? s)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Evento</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Espacios</th>
                  <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                  <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center"><FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No hay cotizaciones</p></td></tr>
                ) : (
                  filteredQuotes.map(quote => (
                    <tr key={quote.id} className="vm-table-row cursor-pointer" onClick={() => viewQuoteDetails(quote)}>
                      <td className="p-3 font-medium text-foreground max-w-[160px] truncate" title={quote.client.name}>{quote.client.name}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(quote.eventDate).toLocaleDateString("es-GT", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {quote.spaces?.length || 1} {quote.spaces?.length === 1 ? "espacio" : "espacios"}
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-foreground">
                        {formatCurrencyByCode(quote.totalAmount, quote.currency)}
                      </td>
                      <td className="p-3">
                        <span className="vm-status-badge" style={{ backgroundColor: quoteStatusColors[quote.status] || "#9ca3af", color: "#fff" }}>
                          {quoteStatusLabels[quote.status] ?? quote.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => viewQuoteDetails(quote)} title="Ver detalle"><Eye className="w-3.5 h-3.5" /></Button>
                          {quote.status === "BORRADOR" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-vm-gold" onClick={() => handleStatusChange(quote.id, "ENVIADA")} title="Enviar"><Send className="w-3.5 h-3.5" /></Button>
                          )}
                          {quote.status === "ENVIADA" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-vm-sage" onClick={() => handleStatusChange(quote.id, "CONFIRMADA")} title="Confirmar"><Check className="w-3.5 h-3.5" /></Button>
                          )}
                          {quote.status === "NO_CONFIRMADA" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-vm-gold" onClick={() => handleStatusChange(quote.id, "ENVIADA")} title="Reenviar"><Send className="w-3.5 h-3.5" /></Button>
                          )}
                          {(quote.status === "CONFIRMADA" || quote.status === "EN_EJECUCION") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("¿Cancelar esta cotización?")) handleStatusChange(quote.id, "CANCELADO") }} title="Cancelar"><X className="w-3.5 h-3.5" /></Button>
                          )}
                          {quote.status === "EN_EJECUCION" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-vm-sienna" onClick={() => { if (confirm("¿Finalizar y liquidar?")) handleStatusChange(quote.id, "FINALIZADA") }} title="Finalizar"><Check className="w-3.5 h-3.5" /></Button>
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
            {/* Cliente + Fecha + Moneda + Personas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="relative">
                  <div className="flex items-center border border-input rounded-md bg-background px-3 py-2 text-sm cursor-pointer" onClick={() => setClientDropdownOpen(v => !v)}>
                    <Search className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
                    {formData.clientId ? <span className="truncate">{clients.find(c => c.id === formData.clientId)?.name ?? "Cliente"}</span> : <span className="text-muted-foreground">Buscar cliente...</span>}
                  </div>
                  {clientDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                      <div className="p-2 border-b border-border">
                        <input autoFocus className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Escribir nombre..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} onClick={e => e.stopPropagation()} />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 20).map(c => (
                          <div key={c.id} className={cn("px-3 py-2 text-sm cursor-pointer hover:bg-accent truncate", formData.clientId === c.id && "bg-accent font-medium")}
                            onClick={() => { setFormData({ ...formData, clientId: c.id }); setClientDropdownOpen(false); setClientSearch("") }}>
                            {c.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha del Evento *</Label>
                <Input type="date" value={formData.eventDate} onChange={e => {
                  const v = e.target.value
                  setFormData({ ...formData, eventDate: v, endDate: formData.endDate || v })
                }} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Fin</Label>
                <Input type="date" value={formData.endDate || formData.eventDate} min={formData.eventDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={formData.currency} onValueChange={v => {
                  const newRate = v === "USD" ? exchangeRate : 1
                  setFormData(prev => ({ ...prev, exchangeRate: newRate }))
                  recalcSpaces(v, formData.guestCount)
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="GTQ">Quetzales (Q)</SelectItem><SelectItem value="USD">Dólares ($)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>No. de Personas</Label>
                <Input type="number" min="0" value={formData.guestCount || ""} onChange={e => setFormData({ ...formData, guestCount: parseInt(e.target.value) || 0 })} placeholder="Cantidad de asistentes" />
              </div>
            </div>

            {/* Espacios */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Espacios *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSpace} className="gap-1"><Plus className="w-3.5 h-3.5" /> Agregar</Button>
              </div>
              {conflictWarning && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {conflictWarning}
                </div>
              )}
              {formData.spaces.length === 0 && <p className="text-xs text-muted-foreground">Agregá al menos un espacio.</p>}
              {formData.spaces.map((space, idx) => (
                <div key={idx} className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Espacio {idx + 1}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeSpace(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo *</Label>
                      <Select value={space.locationType} onValueChange={v => updateSpace(idx, "locationType", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LOCATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ubicación *</Label>
                      <Select value={space.locationId} onValueChange={v => updateSpace(idx, "locationId", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {(locationsByType[space.locationType] || []).map(loc => (
                            <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Modo de precio</Label>
                      <Select value={space.pricingMode} onValueChange={v => updateSpace(idx, "pricingMode", v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PER_SPACE">Precio fijo</SelectItem>
                          <SelectItem value="PER_PERSON">Por persona</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hora inicio</Label>
                      <Input type="time" className="h-8 text-xs" value={space.startTime} onChange={e => updateSpace(idx, "startTime", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hora fin</Label>
                      <Input type="time" className="h-8 text-xs" value={space.endTime} onChange={e => updateSpace(idx, "endTime", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Precio ({formData.currency})</Label>
                      <Input type="number" min="0" step="0.01" className="h-8 text-xs font-mono" value={space.unitPrice || ""} onChange={e => updateSpace(idx, "unitPrice", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono text-muted-foreground">
                    Subtotal: {formatCurrencyByCode(space.totalPrice, formData.currency)}
                  </div>
                </div>
              ))}
            </div>

            {/* Productos y Mobiliario */}
            <div className="space-y-2">
              <Label>Agregar Productos/Servicios/Mobiliario</Label>
              <Tabs defaultValue="COMIDA_MENU">
                <TabsList className="flex-wrap h-auto">
                  {Object.keys(productCategoryLabels).map(cat => (
                    <TabsTrigger key={cat} value={cat} className="text-xs">{productCategoryLabels[cat as keyof typeof productCategoryLabels]}</TabsTrigger>
                  ))}
                  <TabsTrigger value="MOBILIARIO" className="text-xs">Mobiliario</TabsTrigger>
                </TabsList>
                {Object.entries(productCategoryLabels).map(([cat]) => (
                  <TabsContent key={cat} value={cat}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {(productsByCategory[cat] || []).map(product => (
                        <button key={product.id} type="button" onClick={() => addItem(product)}
                          className="flex items-center justify-between text-left text-xs px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">
                          <span className="truncate mr-2">{product.name}</span>
                          <span className="font-mono text-muted-foreground shrink-0">
                            {formData.currency === "USD" 
                              ? formatCurrencyByCode(+(product.unitPrice / exchangeRate).toFixed(2), "USD")
                              : formatCurrency(product.unitPrice)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
                <TabsContent value="MOBILIARIO">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {furniture.map(item => (
                      <button key={item.id} type="button" onClick={() => addFurnitureItem(item)}
                        className="flex items-center justify-between text-left text-xs px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors">
                        <span className="truncate mr-2">{item.name}</span>
                        <span className="font-mono text-muted-foreground shrink-0 text-[10px]">{item.inventoryNumber}</span>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Items seleccionados */}
            {formData.items.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Producto</th>
                      <th className="text-center p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Fecha</th>
                      <th className="text-center p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Hora</th>
                      <th className="text-center p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16">Cant.</th>
                      <th className="text-center p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-20">Desc.</th>
                      <th className="text-right p-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index} className="border-b border-border last:border-0">
                        <td className="p-2.5 font-medium text-xs">
                          {item.name}
                        </td>
                        <td className="p-2.5 text-center text-xs text-muted-foreground">
                          {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString("es-GT", { day: "numeric", month: "short" }) : "—"}
                        </td>
                        <td className="p-2.5 text-center text-xs text-muted-foreground">
                          {item.startTime && item.endTime ? `${item.startTime}–${item.endTime}` : item.startTime || "—"}
                        </td>
                        <td className="p-2.5 text-center">
                          <Input type="number" min="1" step="1" value={item.quantity} onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 1)} className="w-14 h-7 text-center mx-auto font-mono text-xs" />
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <select className="h-7 text-xs border border-border rounded bg-background px-1" value={item.discountType || ""} onChange={e => updateItem(index, "discountType", e.target.value || undefined)}>
                              <option value="">-</option><option value="PERCENT">%</option><option value="FIXED">$</option>
                            </select>
                            {item.discountType && (
                              <Input type="number" min="0" step={item.discountType === "PERCENT" ? "1" : "0.01"} value={item.discountValue || ""} onChange={e => updateItem(index, "discountValue", parseFloat(e.target.value) || 0)} className="w-14 h-7 text-center font-mono text-xs" />
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono text-xs font-medium">{formatCurrencyByCode(item.totalPrice, formData.currency)}</td>
                        <td className="p-2.5"><button type="button" onClick={() => removeItem(index)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30">
                      <td colSpan={5} className="p-2.5 text-right text-sm font-semibold text-muted-foreground">Total:</td>
                      <td className="p-2.5 text-right font-mono font-semibold text-foreground">{formatCurrencyByCode(spacesTotal + itemsTotal, formData.currency)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Notas adicionales (opcional)" />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm() }}>Cancelar</Button>
              <Button type="submit" disabled={saving || formData.spaces.length === 0}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Crear Cotización</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Configurar Menú/Comida (F3) ──────────────────────────────── */}
      <Dialog open={menuDialogOpen} onOpenChange={open => { setMenuDialogOpen(open); if (!open) setSelectedMenuProduct(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Agregar {selectedMenuProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Fecha del servicio</Label>
              <Input type="date" value={menuFormData.scheduledDate} onChange={e => setMenuFormData({ ...menuFormData, scheduledDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Hora inicio</Label>
                <Input type="time" value={menuFormData.startTime} onChange={e => setMenuFormData({ ...menuFormData, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Hora fin</Label>
                <Input type="time" value={menuFormData.endTime} onChange={e => setMenuFormData({ ...menuFormData, endTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Cantidad (personas)</Label>
              <Input type="number" min="1" value={menuFormData.quantity} onChange={e => setMenuFormData({ ...menuFormData, quantity: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="text-sm text-muted-foreground">
              Precio unitario: {selectedMenuProduct && formatCurrencyByCode(formData.currency === "USD" ? +(selectedMenuProduct.unitPrice / exchangeRate).toFixed(2) : selectedMenuProduct.unitPrice, formData.currency)}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setMenuDialogOpen(false); setSelectedMenuProduct(null) }}>Cancelar</Button>
            <Button type="button" onClick={confirmMenuItem}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalle de Cotización ─────────────────────────────────────── */}
      {selectedQuote && (
        <Dialog open={!!selectedQuote} onOpenChange={open => { if (!open) setSelectedQuote(null) }}>
          <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Detalle de Cotización</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {selectedQuote.client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground truncate">{selectedQuote.client.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {new Date(selectedQuote.eventDate).toLocaleDateString("es-GT", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    {selectedQuote.guestCount ? ` · ${selectedQuote.guestCount} personas` : ""}
                  </p>
                </div>
                <span className="vm-status-badge shrink-0" style={{ backgroundColor: quoteStatusColors[selectedQuote.status] || "#9ca3af", color: "#fff" }}>
                  {quoteStatusLabels[selectedQuote.status] ?? selectedQuote.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="vm-info-block">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Moneda</p>
                  <p className="text-sm font-medium text-foreground">{selectedQuote.currency === "USD" ? "USD ($)" : "GTQ (Q)"}</p>
                </div>
                <div className="vm-info-block">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                  <p className="text-sm font-mono font-semibold text-foreground">{formatCurrencyByCode(selectedQuote.totalAmount, selectedQuote.currency)}</p>
                </div>
              </div>

              {/* Espacios */}
              {selectedQuote.spaces && selectedQuote.spaces.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Espacios</p>
                  <div className="space-y-2">
                    {selectedQuote.spaces.map((sp, i) => (
                      <div key={sp.id || i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{sp.locationName}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {sp.startTime} – {sp.endTime}
                              {sp.startTime && <span className="ml-1">({getScheduleFromTime(sp.startTime)?.toLowerCase() || ""})</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-mono font-medium">{formatCurrencyByCode(sp.totalPrice || sp.unitPrice, selectedQuote.currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              {selectedQuote.items && selectedQuote.items.length > 0 && (
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
                      {selectedQuote.items.map(item => (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="p-2.5 text-xs">{item.name}</td>
                          <td className="p-2.5 text-center font-mono text-xs">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono text-xs">{formatCurrencyByCode(item.totalPrice, selectedQuote.currency)}</td>
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

              {/* Payments summary */}
              {selectedQuote.reservation?.payments && selectedQuote.reservation.payments.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pagos Recibidos</p>
                  <div className="space-y-1.5">
                    {selectedQuote.reservation.payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20 text-xs">
                        <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("es-GT")}</span>
                        <span className="font-mono font-medium">{formatCurrencyByCode(p.amount, selectedQuote.currency)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-medium">Pagado:</span>
                      <span className="text-xs font-mono font-semibold">{formatCurrencyByCode(selectedQuote.reservation.paidAmount, selectedQuote.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Pendiente:</span>
                      <span className="text-xs font-mono font-semibold">{formatCurrencyByCode(selectedQuote.reservation.pendingAmount, selectedQuote.currency)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Status actions */}
              <div className="flex gap-2 flex-wrap pt-1">
                {selectedQuote.status === "BORRADOR" && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { handleStatusChange(selectedQuote.id, "ENVIADA"); setSelectedQuote(null) }}>
                    <Send className="w-3.5 h-3.5" /> Enviar al cliente
                  </Button>
                )}
                {selectedQuote.status === "ENVIADA" && (
                  <Button size="sm" className="gap-1.5 bg-vm-sage hover:bg-vm-sage/90" onClick={() => { handleStatusChange(selectedQuote.id, "CONFIRMADA"); setSelectedQuote(null) }}>
                    <Check className="w-3.5 h-3.5" /> Confirmar (pago anticipo)
                  </Button>
                )}
                {selectedQuote.status === "NO_CONFIRMADA" && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { handleStatusChange(selectedQuote.id, "ENVIADA"); setSelectedQuote(null) }}>
                    <Send className="w-3.5 h-3.5" /> Reenviar al cliente
                  </Button>
                )}
                {selectedQuote.status === "CONFIRMADA" && (
                  <>
                    <Button size="sm" className="gap-1.5" onClick={() => { handleStatusChange(selectedQuote.id, "EN_EJECUCION"); setSelectedQuote(null) }}>
                      ▶ Poner en ejecución
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => { if (confirm("¿Cancelar?")) { handleStatusChange(selectedQuote.id, "CANCELADO"); setSelectedQuote(null) } }}>
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                  </>
                )}
                {selectedQuote.status === "EN_EJECUCION" && (
                  <>
                    {!selectedQuote.reservation?.eventClosing && (
                      <Button size="sm" className="gap-1.5 bg-vm-sienna hover:bg-vm-sienna/90" onClick={openLiquidation}>
                        <Wallet className="w-3.5 h-3.5" /> Liquidar
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => { if (confirm("¿Cancelar?")) { handleStatusChange(selectedQuote.id, "CANCELADO"); setSelectedQuote(null) } }}>
                      <X className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                  </>
                )}
                {selectedQuote.status === "FINALIZADA" && (
                  <>
                    {!selectedQuote.reservation?.eventClosing && (
                      <Button size="sm" className="gap-1.5 bg-vm-sienna hover:bg-vm-sienna/90" onClick={openLiquidation}>
                        <Wallet className="w-3.5 h-3.5" /> Liquidar
                      </Button>
                    )}
                    {selectedQuote.reservation?.eventClosing && (
                      <Button size="sm" variant="outline" className="gap-1.5" disabled title="Función temporalmente deshabilitada">
                        <Mail className="w-3.5 h-3.5" /> Enviar a Contabilidad
                      </Button>
                    )}
                  </>
                )}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadPDF(selectedQuote)}>
                  <FileText className="w-3.5 h-3.5" /> Descargar PDF
                </Button>
                {(selectedQuote.status === "CANCELADO") && (
                  <span className="text-xs text-muted-foreground">Esta cotización es terminal (no admite más cambios).</span>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Dialog: Liquidación ───────────────────────────────────────────────── */}
      <Dialog open={liquidationOpen} onOpenChange={setLiquidationOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Liquidar Evento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLiquidationSubmit} className="space-y-5">
            {/* Return status */}
            <div className="space-y-2">
              <Label>Estado General de Devolución *</Label>
              <Select value={liquidationReturnStatus} onValueChange={setLiquidationReturnStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETO">Completo</SelectItem>
                  <SelectItem value="CON_DANOS">Con Daños</SelectItem>
                  <SelectItem value="CON_PERDIDAS">Con Pérdidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Items from Quote */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items de la Cotización</Label>
                <span className="text-xs text-muted-foreground">{liquidationItems.length} artículos</span>
              </div>

              {liquidationItems.length === 0 ? (
                <div className="p-4 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
                  Esta cotización no tiene items.
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Item</th>
                        <th className="text-left p-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                        <th className="text-left p-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Daño / Notas</th>
                        <th className="text-right p-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liquidationItems.map(item => (
                        <tr key={item.itemId} className="border-b border-border last:border-0">
                          <td className="p-2 text-xs font-medium">
                            {item.name} {item.quantity > 1 && `(x${item.quantity})`}
                          </td>
                          <td className="p-2">
                            <Select value={item.returnStatus} onValueChange={v => updateLiquidationItem(item.itemId, "returnStatus", v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="RETORNADO_OK">{itemReturnStatusLabels.RETORNADO_OK}</SelectItem>
                                <SelectItem value="RETORNADO_DANADO">{itemReturnStatusLabels.RETORNADO_DANADO}</SelectItem>
                                <SelectItem value="NO_RETORNADO">{itemReturnStatusLabels.NO_RETORNADO}</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2">
                            <Input
                              className="h-7 text-xs"
                              placeholder="Descripción de daño..."
                              value={item.damageDescription}
                              onChange={e => updateLiquidationItem(item.itemId, "damageDescription", e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="h-7 text-xs font-mono text-right"
                              value={item.repairCost || ""}
                              onChange={e => updateLiquidationItem(item.itemId, "repairCost", parseFloat(e.target.value) || 0)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Damage/loss totals */}
            {liquidationItems.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="vm-info-block">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Costo Daños</p>
                  <p className="text-sm font-mono font-semibold text-foreground">
                    {formatCurrency(liquidationItems.filter(i => i.returnStatus === "RETORNADO_DANADO").reduce((s, i) => s + (i.repairCost || 0), 0))}
                  </p>
                </div>
                <div className="vm-info-block">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Costo Pérdidas</p>
                  <p className="text-sm font-mono font-semibold text-foreground">
                    {formatCurrency(liquidationItems.filter(i => i.returnStatus === "NO_RETORNADO").reduce((s, i) => s + (i.repairCost || 0), 0))}
                  </p>
                </div>
              </div>
            )}

            {/* Observations */}
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                value={liquidationObservations}
                onChange={e => setLiquidationObservations(e.target.value)}
                placeholder="Observaciones generales de la liquidación"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setLiquidationOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingLiquidation}>
                {savingLiquidation ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Guardar Liquidación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
