"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Tag } from "lucide-react"
import Link from "next/link"

interface Category {
  id: string; name: string; type: string; active: boolean
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState("PRODUCT")
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  async function fetchCategories() {
    try {
      const res = await fetch("/api/categories")
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : data.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchCategories() }, [])

  async function addCategory() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), type: newType }),
      })
      if (res.ok) { setNewName(""); fetchCategories() }
      else { const err = await res.json(); alert(err.error) }
    } finally { setAdding(false) }
  }

  async function deleteCategory(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return
    await fetch(`/api/categories/${id}`, { method: "DELETE" })
    fetchCategories()
  }

  const productCategories = categories.filter(c => c.type === "PRODUCT")
  const furnitureCategories = categories.filter(c => c.type === "FURNITURE")

  return (
    <main className="p-4 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">&larr; Configuración</Link>
        <h1 className="font-display text-2xl text-foreground">Categorías</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium">Nueva Categoría</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de categoría" onKeyDown={e => e.key === "Enter" && addCategory()} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Tipo</label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCT">Productos</SelectItem>
                  <SelectItem value="FURNITURE">Mobiliario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addCategory} disabled={adding || !newName.trim()} size="sm"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Tag className="w-4 h-4" /> Productos</CardTitle></CardHeader>
          <CardContent>
            {productCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin categorías</p>
            ) : (
              <div className="space-y-2">{productCategories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">{c.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Tag className="w-4 h-4" /> Mobiliario</CardTitle></CardHeader>
          <CardContent>
            {furnitureCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin categorías</p>
            ) : (
              <div className="space-y-2">{furnitureCategories.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm">{c.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              ))}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
