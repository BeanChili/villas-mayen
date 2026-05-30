"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { locationTypeLabels } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { Plus, Search, MapPin, Loader2, Edit, Trash2 } from "lucide-react"
import Link from "next/link"

interface Location {
  id: string
  name: string
  type: string
  capacity?: number
  unitPrice: number
  active: boolean
}

const LOCATION_TYPES = [
  { value: "FREE_AREA", label: "Área Libre" },
  { value: "DINING_ROOM", label: "Comedor" },
  { value: "HALL", label: "Salón" },
  { value: "GARDEN", label: "Jardín" },
  { value: "TERRACE", label: "Terraza" },
]

export default function LocationsCatalogPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    type: "FREE_AREA",
    capacity: "",
    unitPrice: "",
    active: true,
  })

  useEffect(() => {
    fetchLocations()
  }, [typeFilter])

  async function fetchLocations() {
    try {
      setLoading(true)
      const url = typeFilter !== "all" ? `/api/locations?type=${typeFilter}` : "/api/locations"
      const response = await fetch(url)
      const result = await response.json()
      // Filter out ROOM types since they are managed separately
      const data = (result.data || result || []).filter((loc: Location) => loc.type !== "ROOM")
      setLocations(data)
    } catch (error) {
      console.error("Error fetching locations:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = selectedLocation ? `/api/locations/${selectedLocation.id}` : "/api/locations"
      const method = selectedLocation ? "PUT" : "POST"

      const payload = {
        name: formData.name,
        type: formData.type,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : 0,
        active: formData.active,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (response.ok && result.success) {
        setIsDialogOpen(false)
        fetchLocations()
        resetForm()
      } else {
        alert(result.error || "Error al guardar ubicación")
      }
    } catch (error) {
      console.error("Error saving location:", error)
    }
  }

  const handleEdit = (location: Location) => {
    setSelectedLocation(location)
    setFormData({
      name: location.name,
      type: location.type,
      capacity: location.capacity?.toString() || "",
      unitPrice: location.unitPrice?.toString() || "",
      active: location.active,
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta ubicación?")) return
    try {
      const response = await fetch(`/api/locations/${id}`, { method: "DELETE" })
      const result = await response.json()
      if (result.success) {
        fetchLocations()
      } else {
        alert(result.error || "Error al eliminar ubicación")
      }
    } catch (error) {
      console.error("Error deleting location:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      type: "FREE_AREA",
      capacity: "",
      unitPrice: "",
      active: true,
    })
    setSelectedLocation(null)
    setIsEditing(false)
  }

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(search.toLowerCase()) ||
    location.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Catálogo de Ubicaciones</h1>
          <p className="text-gray-500">Administra áreas, salones, jardines y comedores</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/catalog/products"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Productos
          </Link>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Ubicación
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar ubicaciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {LOCATION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{locations.length}</p>
              <p className="text-sm text-gray-500">Total Ubicaciones</p>
            </div>
          </CardContent>
        </Card>
        {LOCATION_TYPES.map((type) => {
          const count = locations.filter((l) => l.type === type.value).length
          return (
            <Card key={type.value}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-gray-50 rounded-full">
                  <MapPin className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-gray-500">{type.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ubicaciones</CardTitle>
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
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-left p-3 font-medium">Capacidad</th>
                    <th className="text-left p-3 font-medium">Precio Unitario</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((location) => (
                    <tr key={location.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{location.name}</td>
                      <td className="p-3">
                        <Badge variant="secondary">
                          {locationTypeLabels[location.type as keyof typeof locationTypeLabels] || location.type}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-600">{location.capacity ?? "-"}</td>
                      <td className="p-3 text-gray-600">{formatCurrency(location.unitPrice || 0)}</td>
                      <td className="p-3">
                        <Badge
                          variant={location.active ? "default" : "secondary"}
                          className={location.active ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}
                        >
                          {location.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(location)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(location.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredLocations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay ubicaciones registradas
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Ubicación" : "Nueva Ubicación"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacidad</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio Unitario (GTQ)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="active" className="mb-0">Activo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{isEditing ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
