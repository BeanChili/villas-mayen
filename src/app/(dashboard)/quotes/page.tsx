"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { quoteStatusLabels, productCategoryLabels, locationTypeLabels } from "@/types"
import { Plus, Search, FileText, Loader2, Eye, Send, Check, X } from "lucide-react"

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
    setFormData({
      clientId: "",
      eventDate: "",
      locationType: "HALL",
      locationId: "",
      schedules: [],
      notes: "",
      items: [],
    })
  }

  const toggleSchedule = (schedule: string) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules.includes(schedule)
        ? prev.schedules.filter(s => s !== schedule)
        : [...prev.schedules, schedule]
    }))
  }

  const addItem = (product: Product) => {
    const exists = formData.items.find(i => i.productId === product.id)
    if (exists) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map(i => 
          i.productId === product.id 
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, {
          productId: product.id,
          name: product.name,
          category: product.category,
          quantity: 1,
          unitPrice: product.unitPrice,
        }]
      }))
    }
  }

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItemQuantity = (index: number, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, quantity } : item
      )
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

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = []
    acc[product.category].push(product)
    return acc
  }, {} as Record<string, Product[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cotizaciones</h1>
          <p className="text-gray-500">Administra las cotizaciones de eventos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cotización
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar cotizaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="BORRADOR">Borrador</SelectItem>
            <SelectItem value="ENVIADA">Enviada</SelectItem>
            <SelectItem value="APROBADA">Aprobada</SelectItem>
            <SelectItem value="RECHAZADA">Rechazada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Cotizaciones</p>
            <p className="text-2xl font-bold">{quotes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Borrador</p>
            <p className="text-2xl font-bold">{quotes.filter(q => q.status === "BORRADOR").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Aprobadas</p>
            <p className="text-2xl font-bold text-green-600">{quotes.filter(q => q.status === "APROBADA").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Pendientes</p>
            <p className="text-2xl font-bold text-orange-600">{quotes.filter(q => q.status === "ENVIADA").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quotes List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cotizaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Cliente</th>
                    <th className="text-left p-3 font-medium">Evento</th>
                    <th className="text-left p-3 font-medium">Ubicación</th>
                    <th className="text-left p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Fecha</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map(quote => (
                    <tr key={quote.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{quote.client.name}</td>
                      <td className="p-3 text-gray-600">
                        {new Date(quote.eventDate).toLocaleDateString("es-MX")}
                      </td>
                      <td className="p-3 text-gray-600">{quote.locationName}</td>
                      <td className="p-3 font-medium">${quote.totalAmount.toLocaleString("es-MX")}</td>
                      <td className="p-3">
                        <Badge variant="secondary">
                          {quoteStatusLabels[quote.status as keyof typeof quoteStatusLabels] || quote.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-600">
                        {new Date(quote.createdAt).toLocaleDateString("es-MX")}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => viewQuoteDetails(quote)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {quote.status === "BORRADOR" && (
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(quote.id, "ENVIADA")}>
                              <Send className="w-4 h-4 text-blue-500" />
                            </Button>
                          )}
                          {quote.status === "ENVIADA" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleStatusChange(quote.id, "APROBADA")}>
                                <Check className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleStatusChange(quote.id, "RECHAZADA")}>
                                <X className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredQuotes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay cotizaciones
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Quote Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Cotización</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha del Evento</Label>
                <Input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Ubicación</Label>
                <Select
                  value={formData.locationType}
                  onValueChange={(value) => setFormData({ ...formData, locationType: value, locationId: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE_AREA">Área Libre</SelectItem>
                    <SelectItem value="DINING_ROOM">Comedor</SelectItem>
                    <SelectItem value="HALL">Salón</SelectItem>
                    <SelectItem value="GARDEN">Jardín</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Select
                  value={formData.locationId}
                  onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLocations.map(loc => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Horarios</Label>
              <div className="flex gap-2">
                {["MANANA", "TARDE", "NOCHE"].map(schedule => (
                  <Button
                    key={schedule}
                    type="button"
                    variant={formData.schedules.includes(schedule) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSchedule(schedule)}
                  >
                    {schedule === "MANANA" ? "🌅 Mañana" : schedule === "TARDE" ? "☀️ Tarde" : "🌙 Noche"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="space-y-2">
              <Label>Agregar Productos</Label>
              <Tabs defaultValue="COMIDA_MENU">
                <TabsList>
                  {Object.keys(productCategoryLabels).map(cat => (
                    <TabsTrigger key={cat} value={cat}>
                      {productCategoryLabels[cat as keyof typeof productCategoryLabels]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(productCategoryLabels).map(([cat, label]) => (
                  <TabsContent key={cat} value={cat}>
                    <div className="grid grid-cols-3 gap-2">
                      {(productsByCategory[cat] || []).map(product => (
                        <Button
                          key={product.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addItem(product)}
                          className="justify-start"
                        >
                          <span className="truncate">{product.name}</span>
                          <span className="ml-auto text-xs">${product.unitPrice}</span>
                        </Button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            {/* Selected Items */}
            {formData.items.length > 0 && (
              <div className="space-y-2">
                <Label>Items Seleccionados</Label>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Producto</th>
                      <th className="text-left p-2">Cantidad</th>
                      <th className="text-left p-2">Precio</th>
                      <th className="text-left p-2">Total</th>
                      <th className="text-left p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{item.name}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value))}
                            className="w-20"
                          />
                        </td>
                        <td className="p-2">${item.unitPrice}</td>
                        <td className="p-2">${(item.quantity * item.unitPrice).toLocaleString()}</td>
                        <td className="p-2">
                          <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="p-2 text-right font-bold">Total:</td>
                      <td className="p-2 font-bold">${totalAmount.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear Cotización</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}