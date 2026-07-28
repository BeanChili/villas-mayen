"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Loader2, Edit, Trash2, RotateCcw } from "lucide-react"
import { usePermissions } from "@/components/permissions-provider"
import { RequireModule } from "@/components/require-module"

interface Seller {
  id: string
  name: string
  phone?: string | null
  active: boolean
  _count: { quotes: number }
}

export default function SellersCatalogPage() {
  return (
    <RequireModule module="sellers">
      <SellersCatalogContent />
    </RequireModule>
  )
}

function SellersCatalogContent() {
  const { can } = usePermissions()
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  })

  useEffect(() => {
    fetchSellers()
  }, [])

  async function fetchSellers() {
    try {
      setLoading(true)
      const response = await fetch("/api/sellers")
      const result = await response.json()
      setSellers(result.data || [])
    } catch (error) {
      console.error("Error fetching sellers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = selectedSeller ? `/api/sellers/${selectedSeller.id}` : "/api/sellers"
      const method = selectedSeller ? "PUT" : "POST"

      const payload = {
        name: formData.name,
        phone: formData.phone || null,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (response.ok && result.success) {
        setIsDialogOpen(false)
        fetchSellers()
        resetForm()
      } else {
        alert(result.error || "Error al guardar vendedor")
      }
    } catch (error) {
      console.error("Error saving seller:", error)
    }
  }

  const handleEdit = (seller: Seller) => {
    setSelectedSeller(seller)
    setFormData({
      name: seller.name,
      phone: seller.phone || "",
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Desactivar este vendedor? Las cotizaciones existentes conservan su nombre.")) return
    try {
      const response = await fetch(`/api/sellers/${id}`, { method: "DELETE" })
      const result = await response.json()
      if (result.success) {
        fetchSellers()
      } else {
        alert(result.error || "Error al desactivar vendedor")
      }
    } catch (error) {
      console.error("Error deleting seller:", error)
    }
  }

  const handleReactivate = async (id: string) => {
    try {
      const response = await fetch(`/api/sellers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      })
      const result = await response.json()
      if (response.ok && result.success) {
        fetchSellers()
      } else {
        alert(result.error || "Error al reactivar vendedor")
      }
    } catch (error) {
      console.error("Error reactivating seller:", error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
    })
    setSelectedSeller(null)
    setIsEditing(false)
  }

  const filteredSellers = sellers.filter(seller =>
    seller.name.toLowerCase().includes(search.toLowerCase()) ||
    (seller.phone || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Catálogo de Vendedores</h1>
          <p className="text-gray-500">Administra los vendedores que se asignan a las cotizaciones</p>
        </div>
        {can("sellers", "create") && (
          <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Vendedor
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar vendedores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sellers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Vendedores</CardTitle>
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
                    <th className="text-left p-3 font-medium">Teléfono</th>
                    <th className="text-left p-3 font-medium">Cotizaciones</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSellers.map((seller) => (
                    <tr key={seller.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{seller.name}</td>
                      <td className="p-3 text-gray-600">{seller.phone || "-"}</td>
                      <td className="p-3 text-gray-600">{seller._count.quotes}</td>
                      <td className="p-3">
                        <Badge
                          variant={seller.active ? "default" : "secondary"}
                          className={seller.active ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}
                        >
                          {seller.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {can("sellers", "edit") && (
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(seller)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {!seller.active && can("sellers", "edit") && (
                            <Button variant="ghost" size="sm" title="Reactivar" onClick={() => handleReactivate(seller.id)}>
                              <RotateCcw className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          {seller.active && can("sellers", "delete") && (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(seller.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSellers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay vendedores registrados
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seller Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Vendedor" : "Nuevo Vendedor"}</DialogTitle>
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
              <Label>Teléfono</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
