"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { productCategoryLabels } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { Plus, Search, Package, Loader2, Edit, Trash2 } from "lucide-react"
import Link from "next/link"

interface Product {
  id: string
  name: string
  category: string
  menuType?: string
  unitPrice: number
  quantity: number
  unitMeasure: string
  available: boolean
  isFree: boolean
  pricePerDay?: number
  pricePerHour?: number
  rentalPrice?: number
  color?: string
  packageSize?: number
}

interface Category {
  id: string
  name: string
  type: string
}

const PRODUCT_CATEGORIES = [
  { value: "COMIDA_MENU", label: "Comida/Menú" },
  { value: "MOBILIARIO", label: "Mobiliario" },
  { value: "ADORNOS_DECORACION", label: "Adornos/Decoración" },
  { value: "SERVICIOS_ADICIONALES", label: "Servicios Adicionales" },
  { value: "PLATOS", label: "Platos" },
  { value: "CUBIERTOS", label: "Cubiertos" },
  { value: "PICHELES", label: "Picheles" },
  { value: "VASOS", label: "Vasos" },
  { value: "COPAS", label: "Copas" },
]

const MENU_TYPES = [
  { value: "DESAYUNO", label: "Desayuno" },
  { value: "REFACCION", label: "Refacción" },
  { value: "COFFEE_BREAK", label: "Coffee Break" },
  { value: "ALMUERZO", label: "Almuerzo" },
  { value: "CENA", label: "Cena" },
]

const UNIT_MEASURES = [
  { value: "PIEZA", label: "Pieza" },
  { value: "PERSONA", label: "Persona" },
  { value: "HORA", label: "Hora" },
  { value: "EVENTO", label: "Evento" },
]

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    category: "COMIDA_MENU",
    menuType: "",
    unitPrice: "",
    quantity: "0",
    unitMeasure: "PIEZA",
    available: true,
    isFree: false,
    pricePerDay: "",
    pricePerHour: "",
    rentalPrice: "",
    color: "",
    packageSize: "",
  })

  useEffect(() => {
    fetchProducts()
  }, [categoryFilter])

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      const response = await fetch("/api/categories?type=PRODUCT")
      const result = await response.json()
      setCategories(result.data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const categoryOptions = categories.length > 0
    ? categories.map((c) => ({ value: c.name, label: productCategoryLabels[c.name] || c.name }))
    : PRODUCT_CATEGORIES

  async function fetchProducts() {
    try {
      setLoading(true)
      const url = categoryFilter !== "all" ? `/api/products?category=${categoryFilter}` : "/api/products"
      const response = await fetch(url)
      const result = await response.json()
      setProducts(result.data || result || [])
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = selectedProduct ? `/api/products/${selectedProduct.id}` : "/api/products"
      const method = selectedProduct ? "PUT" : "POST"

      const payload = {
        name: formData.name,
        category: formData.category,
        menuType: formData.menuType || undefined,
        unitPrice: parseFloat(formData.unitPrice || "0"),
        quantity: parseInt(formData.quantity || "0"),
        unitMeasure: formData.unitMeasure,
        available: formData.available,
        isFree: formData.isFree,
        pricePerDay: formData.pricePerDay ? parseFloat(formData.pricePerDay) : undefined,
        pricePerHour: formData.pricePerHour ? parseFloat(formData.pricePerHour) : undefined,
        rentalPrice: formData.rentalPrice ? parseFloat(formData.rentalPrice) : 0,
        color: formData.color || undefined,
        packageSize: formData.packageSize ? parseInt(formData.packageSize) : undefined,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (response.ok && result.success) {
        setIsDialogOpen(false)
        fetchProducts()
        resetForm()
      } else {
        alert(result.error || "Error al guardar producto")
      }
    } catch (error) {
      console.error("Error saving product:", error)
    }
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      category: product.category,
      menuType: product.menuType || "",
      unitPrice: product.unitPrice?.toString() || "",
      quantity: product.quantity?.toString() || "0",
      unitMeasure: product.unitMeasure || "PIEZA",
      available: product.available,
      isFree: product.isFree,
      pricePerDay: product.pricePerDay?.toString() || "",
      pricePerHour: product.pricePerHour?.toString() || "",
      rentalPrice: product.rentalPrice?.toString() || "",
      color: product.color || "",
      packageSize: product.packageSize?.toString() || "",
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return
    try {
      const response = await fetch(`/api/products/${id}`, { method: "DELETE" })
      const result = await response.json()
      if (result.success) {
        fetchProducts()
      } else {
        alert(result.error || "Error al eliminar producto")
      }
    } catch (error) {
      console.error("Error deleting product:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      category: "COMIDA_MENU",
      menuType: "",
      unitPrice: "",
      quantity: "0",
      unitMeasure: "PIEZA",
      available: true,
      isFree: false,
      pricePerDay: "",
      pricePerHour: "",
      rentalPrice: "",
      color: "",
      packageSize: "",
    })
    setSelectedProduct(null)
    setIsEditing(false)
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.category.toLowerCase().includes(search.toLowerCase())
  )

  const showMenuType = formData.category === "COMIDA_MENU"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Catálogo de Productos</h1>
          <p className="text-gray-500">Administra productos, menús y servicios</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/catalog/locations"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Ubicaciones
          </Link>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar productos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{products.length}</p>
              <p className="text-sm text-gray-500">Total Productos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-full">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{products.filter((p) => p.available).length}</p>
              <p className="text-sm text-gray-500">Disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-full">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {products.filter((p) => p.category === "COMIDA_MENU").length}
              </p>
              <p className="text-sm text-gray-500">Comida/Menú</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-full">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {products.filter((p) => p.isFree).length}
              </p>
              <p className="text-sm text-gray-500">Gratuitos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
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
                    <th className="text-left p-3 font-medium">Categoría</th>
                    <th className="text-left p-3 font-medium">Tipo Menú</th>
                    <th className="text-left p-3 font-medium">Precio</th>
                    <th className="text-left p-3 font-medium">Alquiler</th>
                    <th className="text-left p-3 font-medium">Stock</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">
                        {product.name}
                        {product.color && <span className="ml-2 text-xs text-gray-500 font-normal">({product.color})</span>}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">
                          {productCategoryLabels[product.category as keyof typeof productCategoryLabels] || product.category}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-600">{product.menuType || "-"}</td>
                      <td className="p-3 text-gray-600">
                        {product.isFree ? (
                          <span className="text-green-600 font-medium">Gratis</span>
                        ) : (
                          formatCurrency(product.unitPrice || 0)
                        )}
                      </td>
                      <td className="p-3 font-mono">{formatCurrency(product.rentalPrice || 0)}</td>
                      <td className="p-3 text-gray-600">
                        {product.quantity} {product.unitMeasure?.toLowerCase()}
                        {product.packageSize ? <span className="ml-1 text-xs text-gray-400">(x{product.packageSize})</span> : null}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={product.available ? "default" : "secondary"}
                          className={product.available ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}
                        >
                          {product.available ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay productos registrados
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value, menuType: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unidad de Medida *</Label>
                <Select
                  value={formData.unitMeasure}
                  onValueChange={(value) => setFormData({ ...formData, unitMeasure: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_MEASURES.map((u) => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showMenuType && (
              <div className="space-y-2">
                <Label>Tipo de Menú</Label>
                <Select
                  value={formData.menuType}
                  onValueChange={(value) => setFormData({ ...formData, menuType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo de menú" />
                  </SelectTrigger>
                  <SelectContent>
                    {MENU_TYPES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio Unitario (GTQ) *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad/Stock</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color (opcional)</Label>
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="ej: Azul, Rojo"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidades por Paquete (opcional)</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.packageSize}
                  onChange={(e) => setFormData({ ...formData, packageSize: e.target.value })}
                  placeholder="ej: 50 (Tazas x50)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio por Día (opcional)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.pricePerDay}
                  onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio por Hora (opcional)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.pricePerHour}
                  onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Precio de Alquiler (para cotizaciones)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={formData.rentalPrice}
                onChange={(e) => setFormData({ ...formData, rentalPrice: e.target.value })}
                placeholder="Precio cuando se alquila en una cotización"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="available"
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="available" className="mb-0">Disponible</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFree"
                  checked={formData.isFree}
                  onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isFree" className="mb-0">Gratuito</Label>
              </div>
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
