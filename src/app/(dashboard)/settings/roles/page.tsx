"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, Edit, Trash2, Shield, ArrowLeft, DollarSign, Lock } from "lucide-react"
import Link from "next/link"
import { MODULES } from "@/lib/modules"
import { usePermissions } from "@/components/permissions-provider"
import { RequireModule } from "@/components/require-module"

interface RolePermissionRow {
  module: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

interface Role {
  id: string
  key: string
  name: string
  description: string | null
  isSystem: boolean
  canEditPrices: boolean
  permissions: RolePermissionRow[]
  _count: { users: number }
}

type Matrix = Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>

const ACTIONS: Array<{ key: "view" | "create" | "edit" | "delete"; label: string }> = [
  { key: "view", label: "Ver" },
  { key: "create", label: "Crear" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Eliminar" },
]

function emptyMatrix(): Matrix {
  const matrix: Matrix = {}
  for (const m of MODULES) {
    matrix[m.key] = { view: false, create: false, edit: false, delete: false }
  }
  return matrix
}

function matrixFromRole(role: Role): Matrix {
  const matrix = emptyMatrix()
  for (const p of role.permissions) {
    if (matrix[p.module]) {
      matrix[p.module] = {
        view: p.canView,
        create: p.canCreate,
        edit: p.canEdit,
        delete: p.canDelete,
      }
    }
  }
  return matrix
}

export default function RolesPage() {
  return (
    <RequireModule module="roles">
      <RolesPageContent />
    </RequireModule>
  )
}

function RolesPageContent() {
  const { can, refresh } = usePermissions()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [canEditPrices, setCanEditPrices] = useState(false)
  const [matrix, setMatrix] = useState<Matrix>(emptyMatrix)

  useEffect(() => {
    fetchRoles()
  }, [])

  async function fetchRoles() {
    try {
      const res = await fetch("/api/roles")
      const body = await res.json()
      if (body.success) setRoles(body.data)
    } catch (error) {
      console.error("Error fetching roles:", error)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setSelectedRole(null)
    setName("")
    setDescription("")
    setCanEditPrices(false)
    setMatrix(emptyMatrix())
    setIsDialogOpen(true)
  }

  const openEdit = (role: Role) => {
    setSelectedRole(role)
    setName(role.name)
    setDescription(role.description || "")
    setCanEditPrices(role.canEditPrices)
    setMatrix(matrixFromRole(role))
    setIsDialogOpen(true)
  }

  // Coherencia de la fila: crear/editar/eliminar implican ver;
  // sacar ver apaga todo el modulo
  const toggleCell = (moduleKey: string, action: "view" | "create" | "edit" | "delete") => {
    setMatrix((prev) => {
      const row = { ...prev[moduleKey] }
      const next = !row[action]
      row[action] = next
      if (action === "view" && !next) {
        row.create = false
        row.edit = false
        row.delete = false
      } else if (action !== "view" && next) {
        row.view = true
      }
      return { ...prev, [moduleKey]: row }
    })
  }

  const toggleRow = (moduleKey: string) => {
    setMatrix((prev) => {
      const row = prev[moduleKey]
      const allOn = row.view && row.create && row.edit && row.delete
      const value = !allOn
      return {
        ...prev,
        [moduleKey]: { view: value, create: value, edit: value, delete: value },
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const permissions = MODULES.map((m) => ({
      module: m.key,
      canView: matrix[m.key].view,
      canCreate: matrix[m.key].create,
      canEdit: matrix[m.key].edit,
      canDelete: matrix[m.key].delete,
    })).filter((p) => p.canView || p.canCreate || p.canEdit || p.canDelete)

    setSaving(true)
    try {
      const url = selectedRole ? `/api/roles/${selectedRole.id}` : "/api/roles"
      const method = selectedRole ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          canEditPrices,
          permissions,
        }),
      })
      const body = await res.json()
      if (res.ok && body.success) {
        setIsDialogOpen(false)
        fetchRoles()
        // Si el admin edito su propio rol, el menu se actualiza al toque
        refresh()
      } else {
        alert(body.error || "Error al guardar el rol")
      }
    } catch (error) {
      console.error("Error saving role:", error)
      alert("Error al guardar el rol")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (role: Role) => {
    if (!confirm(`¿Eliminar el rol "${role.name}"?`)) return
    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" })
      const body = await res.json()
      if (res.ok && body.success) {
        fetchRoles()
      } else {
        alert(body.error || "Error al eliminar el rol")
      }
    } catch (error) {
      console.error("Error deleting role:", error)
    }
  }

  const countPermissions = (role: Role) =>
    role.permissions.filter((p) => p.canView || p.canCreate || p.canEdit || p.canDelete).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Roles y Permisos</h1>
          </div>
          <p className="text-gray-500 mt-1">
            Definí qué puede ver y hacer cada rol en cada sección del sistema
          </p>
        </div>
        {can("roles", "create") && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Rol
          </Button>
        )}
      </div>

      {/* Roles List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Roles del Sistema
          </CardTitle>
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
                    <th className="text-left p-3 font-medium">Rol</th>
                    <th className="text-left p-3 font-medium">Descripción</th>
                    <th className="text-center p-3 font-medium">Usuarios</th>
                    <th className="text-center p-3 font-medium">Módulos</th>
                    <th className="text-center p-3 font-medium">Precios</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.name}</span>
                          {role.isSystem && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Lock className="w-3 h-3" />
                              Sistema
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 max-w-xs truncate">
                        {role.description || "-"}
                      </td>
                      <td className="p-3 text-center">{role._count.users}</td>
                      <td className="p-3 text-center">
                        {role.isSystem ? "Todos" : countPermissions(role)}
                      </td>
                      <td className="p-3 text-center">
                        {role.canEditPrices ? (
                          <Badge className="bg-green-500 gap-1">
                            <DollarSign className="w-3 h-3" />
                            Sí
                          </Badge>
                        ) : (
                          <Badge variant="secondary">No</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {!role.isSystem && can("roles", "edit") && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(role)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {!role.isSystem && can("roles", "delete") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(role)}
                              disabled={role._count.users > 0}
                              title={role._count.users > 0 ? "Tiene usuarios asignados" : undefined}
                            >
                              <Trash2 className={`w-4 h-4 ${role._count.users > 0 ? "text-gray-300" : "text-red-500"}`} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {roles.length === 0 && (
                <div className="text-center py-8 text-gray-500">No hay roles</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRole ? `Editar Rol: ${selectedRole.name}` : "Nuevo Rol"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Recepción de fin de semana"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qué hace este rol"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border p-3 bg-amber-50/50">
              <input
                type="checkbox"
                id="canEditPrices"
                checked={canEditPrices}
                onChange={(e) => setCanEditPrices(e.target.checked)}
              />
              <Label htmlFor="canEditPrices" className="cursor-pointer">
                Puede modificar precios (cotizaciones, catálogos y tipo de cambio)
              </Label>
            </div>

            <div className="space-y-2">
              <Label>Permisos por sección</Label>
              <p className="text-xs text-muted-foreground">
                Crear, editar o eliminar activan Ver automáticamente. Click en el nombre de la
                sección marca o desmarca toda la fila.
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2 font-medium">Sección</th>
                      {ACTIONS.map((a) => (
                        <th key={a.key} className="text-center p-2 font-medium w-20">
                          {a.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((m) => (
                      <tr key={m.key} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="p-2">
                          <button
                            type="button"
                            className="text-left hover:text-vm-green hover:underline"
                            onClick={() => toggleRow(m.key)}
                          >
                            {m.label}
                          </button>
                        </td>
                        {ACTIONS.map((a) => (
                          <td key={a.key} className="text-center p-2">
                            <input
                              type="checkbox"
                              className="cursor-pointer"
                              checked={matrix[m.key][a.key]}
                              onChange={() => toggleCell(m.key, a.key)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedRole ? "Guardar cambios" : "Crear rol"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
