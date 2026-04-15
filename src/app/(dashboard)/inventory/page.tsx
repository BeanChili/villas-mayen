"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { furnitureCategoryLabels, furnitureStatusLabels } from "@/types"
import { Plus, Search, Package, Loader2, Edit, Trash2, AlertTriangle } from "lucide-react"

interface Furniture {
  id: string
  inventoryNumber: string
  name: string
  category: string
  purchaseValue: number
  depreciationRate: number
  currentValue: number
  status: string
  location?: string
  purchaseDate?: string
  observations?: string
}

export default function InventoryPage() {
  const [furniture, setFurniture] = useState<Furniture[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Furniture | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    inventoryNumber: "",
    name: "",
    category: "SILLAS",
    purchaseValue: 0,
    depreciationRate: 10,
    status: "BUENO",
    location: "",
    purchaseDate: "",
    observations: "",
  })

  useEffect(() => {
    fetchFurniture()
  }, [])

  async function fetchFurniture() {
    try {
      const response = await fetch("/api/furniture")
      const data = await response.json()
      setFurniture(data)
    } catch (error) {
      console.error("Error fetching furniture:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = selectedItem ? `/api/furniture/${selectedItem.id}` : "/api/furniture"
      const method = selectedItem ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          purchaseDate: formData.purchaseDate || null,
        }),
      })
      
      if (response.ok) {
        setIsDialogOpen(false)
        fetchFurniture()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || "Error al guardar mobiliario")
      }
    } catch (error) {
      console.error("Error saving furniture:", error)
    }
  }

  const handleEdit = (item: Furniture) => {
    setSelectedItem(item)
    setFormData({
      inventoryNumber: item.inventoryNumber,
      name: item.name,
      category: item.category,
      purchaseValue: item.purchaseValue,
      depreciationRate: item.depreciationRate,
      status: item.status,
      location: item.location || "",
      purchaseDate: item.purchaseDate ? item.purchaseDate.split('T')[0] : "",
      observations: item.observations || "",
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este artículo?")) return
    
    try {
      await fetch(`/api/furniture/${id}`, { method: "DELETE" })
      fetchFurniture()
    } catch (error) {
      console.error("Error deleting furniture:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      inventoryNumber: "",
      name: "",
      category: "SILLAS",
      purchaseValue: 0,
      depreciationRate: 10,
      status: "BUENO",
      location: "",
      purchaseDate: "",
      observations: "",
    })
    setSelectedItem(null)
    setIsEditing(false)
  }

  const filteredFurniture = furniture.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.inventoryNumber.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    const matchesStatus = statusFilter === "all" || item.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const totalValue = furniture.reduce((sum, item) => sum + item.currentValue, 0)
  const damagedCount = furniture.filter(f => f.status === "DANADO" || f.status === "DADO_BAJA").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventario</h1>
          <p className="text-gray-500">Administra el mobiliario del centro de eventos</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Artículo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar mobiliario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {Object.entries(furnitureCategoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(furnitureStatusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{furniture.length}</p>
              <p className="text-sm text-gray-500">Total Artículos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-full">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">${totalValue.toLocaleString("es-MX")}</p>
              <p className="text-sm text-gray-500">Valor Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-full">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{furniture.filter(f => f.status === "BUENO").length}</p>
              <p className="text-sm text-gray-500">En Buen Estado</p>
            </div>
          </CardContent>
        </Card>
        {damagedCount > 0 && (
          <Card className="border-red-200">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{damagedCount}</p>
                <p className="text-sm text-gray-500">Dañados/Baja</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Furniture List */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario de Mobiliario</CardTitle>
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
                    <th className="text-left p-3 font-medium">No. Inventario</th>
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Categoría</th>
                    <th className="text-left p-3 font-medium">Valor Compra</th>
                    <th className="text-left p-3 font-medium">Valor Actual</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Ubicación</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFurniture.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-sm">{item.inventoryNumber}</td>
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {furnitureCategoryLabels[item.category as keyof typeof furnitureCategoryLabels] || item.category}
                        </Badge>
                      </td>
                      <td className="p-3">${item.purchaseValue.toLocaleString("es-MX")}</td>
                      <td className="p-3 font-medium">${item.currentValue.toLocaleString("es-MX")}</td>
                      <td className="p-3">
                        <Badge 
                          variant={item.status === "BUENO" ? "default" : item.status === "DANADO" ? "destructive" : "secondary"}
                        >
                          {furnitureStatusLabels[item.status as keyof typeof furnitureStatusLabels] || item.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-600">{item.location || "-"}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" data-testid="edit-furniture-btn" onClick={() => handleEdit(item)}>
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button variant="ghost" size="sm" data-testid="delete-furniture-btn" onClick={() => handleDelete(item.id)}>
                             <Trash2 className="w-4 h-4 text-red-500" />
                           </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredFurniture.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay artículos en el inventario
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Artículo" : "Nuevo Artículo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>No. Inventario *</Label>
              <Input
                value={formData.inventoryNumber}
                onChange={(e) => setFormData({ ...formData, inventoryNumber: e.target.value })}
                required
                disabled={isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(furnitureCategoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(furnitureStatusLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor de Compra</Label>
                <Input
                  type="number"
                  value={formData.purchaseValue}
                  onChange={(e) => setFormData({ ...formData, purchaseValue: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>% Depreciación Anual</Label>
                <Input
                  type="number"
                  value={formData.depreciationRate}
                  onChange={(e) => setFormData({ ...formData, depreciationRate: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Compra</Label>
                <Input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
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