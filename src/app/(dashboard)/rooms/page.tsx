"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Home, Loader2, Edit, Trash2 } from "lucide-react"
import { roomStatusLabels, bedTypeLabels, type RoomStatus } from "@/types"
import { cn, formatCurrency } from "@/lib/utils"

interface Room {
  id: string
  floorId: string
  number: string
  capacity: number | null
  bedType: string | null
  pricePerNight: number | null
  pricePerPerson: number | null
  status: string
  photo: string | null
  active: boolean
  floor: {
    id: string
    level: number
    buildingId: string
    building: {
      id: string
      name: string
    }
  }
}

interface Building {
  id: string
  name: string
  floors: { id: string; level: number }[]
}

interface Floor {
  id: string
  level: number
  buildingId: string
  building: { id: string; name: string }
}

const statusColorMap: Record<string, string> = {
  DISPONIBLE: "bg-green-100 text-green-700 border-green-200",
  RESERVADA: "bg-blue-100 text-blue-700 border-blue-200",
  OCUPADA: "bg-purple-100 text-purple-700 border-purple-200",
  MANTENIMIENTO: "bg-amber-100 text-amber-700 border-amber-200",
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [buildingFilter, setBuildingFilter] = useState<string>("ALL")
  const [floorFilter, setFloorFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formBuildingId, setFormBuildingId] = useState<string>("")
  const [formFloors, setFormFloors] = useState<Floor[]>([])
  const [formData, setFormData] = useState({
    floorId: "",
    number: "",
    capacity: "",
    bedType: "",
    pricePerNight: "",
    pricePerPerson: "",
    status: "DISPONIBLE" as RoomStatus,
    active: true,
  })

  useEffect(() => {
    fetchRooms()
    fetchBuildings()
    fetchFloors()
  }, [])

  async function fetchRooms() {
    try {
      const response = await fetch("/api/rooms")
      const result = await response.json()
      setRooms(result.data || [])
    } catch (error) {
      console.error("Error fetching rooms:", error)
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchBuildings() {
    try {
      const response = await fetch("/api/buildings")
      const result = await response.json()
      setBuildings(result.data || [])
    } catch (error) {
      console.error("Error fetching buildings:", error)
    }
  }

  async function fetchFloors() {
    try {
      const response = await fetch("/api/floors")
      const result = await response.json()
      setFloors(result.data || [])
    } catch (error) {
      console.error("Error fetching floors:", error)
    }
  }

  useEffect(() => {
    if (formBuildingId) {
      const availableFloors = floors.filter(f => f.buildingId === formBuildingId)
      setFormFloors(availableFloors)
      if (!isEditing || !selectedRoom || selectedRoom.floor.buildingId !== formBuildingId) {
        setFormData(prev => ({ ...prev, floorId: "" }))
      }
    } else {
      setFormFloors([])
    }
  }, [formBuildingId, floors, isEditing, selectedRoom])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = selectedRoom ? `/api/rooms/${selectedRoom.id}` : "/api/rooms"
      const method = selectedRoom ? "PUT" : "POST"

      const payload = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
        pricePerNight: formData.pricePerNight ? parseFloat(formData.pricePerNight) : null,
        pricePerPerson: formData.pricePerPerson ? parseFloat(formData.pricePerPerson) : null,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (response.ok && result.success) {
        setIsDialogOpen(false)
        fetchRooms()
        resetForm()
      } else {
        alert(result.error || "Error al guardar habitación")
      }
    } catch (error) {
      console.error("Error saving room:", error)
    }
  }

  const handleEdit = (room: Room) => {
    setSelectedRoom(room)
    setFormBuildingId(room.floor.buildingId)
    setFormData({
      floorId: room.floorId,
      number: room.number,
      capacity: room.capacity?.toString() || "",
      bedType: room.bedType || "",
      pricePerNight: room.pricePerNight?.toString() || "",
      pricePerPerson: room.pricePerPerson?.toString() || "",
      status: room.status as RoomStatus,
      active: room.active,
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta habitación?")) return
    try {
      const response = await fetch(`/api/rooms/${id}`, { method: "DELETE" })
      const result = await response.json()
      if (response.ok && result.success) {
        fetchRooms()
      } else {
        alert(result.error || "Error al eliminar habitación")
      }
    } catch (error) {
      console.error("Error deleting room:", error)
    }
  }

  const resetForm = () => {
    setFormBuildingId("")
    setFormFloors([])
    setFormData({
      floorId: "",
      number: "",
      capacity: "",
      bedType: "",
      pricePerNight: "",
      pricePerPerson: "",
      status: "DISPONIBLE",
      active: true,
    })
    setSelectedRoom(null)
    setIsEditing(false)
  }

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch = room.number.toLowerCase().includes(search.toLowerCase())
      const matchesBuilding = buildingFilter === "ALL" || room.floor.buildingId === buildingFilter
      const matchesFloor = floorFilter === "ALL" || room.floorId === floorFilter
      const matchesStatus = statusFilter === "ALL" || room.status === statusFilter
      return matchesSearch && matchesBuilding && matchesFloor && matchesStatus
    })
  }, [rooms, search, buildingFilter, floorFilter, statusFilter])

  const availableFloorsForFilter = useMemo(() => {
    if (buildingFilter === "ALL") return floors
    return floors.filter(f => f.buildingId === buildingFilter)
  }, [buildingFilter, floors])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Habitaciones</h1>
          <p className="text-gray-500">Administra las habitaciones del centro de eventos</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Habitación
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rooms.length}</p>
              <p className="text-sm text-gray-500">Total Habitaciones</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-full">
              <Home className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rooms.filter(r => r.status === "DISPONIBLE").length}</p>
              <p className="text-sm text-gray-500">Disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-full">
              <Home className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rooms.filter(r => r.status === "OCUPADA").length}</p>
              <p className="text-sm text-gray-500">Ocupadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-full">
              <Home className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rooms.filter(r => r.status === "MANTENIMIENTO").length}</p>
              <p className="text-sm text-gray-500">En Mantenimiento</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Edificio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los edificios</SelectItem>
              {buildings.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={floorFilter} onValueChange={setFloorFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Piso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los pisos</SelectItem>
              {availableFloorsForFilter.map(f => (
                <SelectItem key={f.id} value={f.id}>Piso {f.level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              <SelectItem value="DISPONIBLE">Disponible</SelectItem>
              <SelectItem value="RESERVADA">Reservada</SelectItem>
              <SelectItem value="OCUPADA">Ocupada</SelectItem>
              <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rooms List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Habitaciones</CardTitle>
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
                    <th className="text-left p-3 font-medium">Edificio</th>
                    <th className="text-left p-3 font-medium">Piso</th>
                    <th className="text-left p-3 font-medium">Número</th>
                    <th className="text-left p-3 font-medium">Capacidad</th>
                    <th className="text-left p-3 font-medium">Tipo Cama</th>
                    <th className="text-left p-3 font-medium">Precio/Noche</th>
                    <th className="text-left p-3 font-medium">Precio/Persona</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Activo</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map(room => (
                    <tr key={room.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{room.floor.building.name}</td>
                      <td className="p-3 text-gray-600">Piso {room.floor.level}</td>
                      <td className="p-3 text-gray-600">{room.number}</td>
                      <td className="p-3 text-gray-600">{room.capacity ?? "-"}</td>
                      <td className="p-3 text-gray-600">
                        {room.bedType ? bedTypeLabels[room.bedType as keyof typeof bedTypeLabels] || room.bedType : "-"}
                      </td>
                      <td className="p-3 text-gray-600">
                        {room.pricePerNight ? formatCurrency(room.pricePerNight) : "-"}
                      </td>
                      <td className="p-3 text-gray-600">
                        {room.pricePerPerson ? formatCurrency(room.pricePerPerson) : "-"}
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary" className={cn(statusColorMap[room.status])}>
                          {roomStatusLabels[room.status as keyof typeof roomStatusLabels] || room.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={room.active ? "default" : "secondary"}>
                          {room.active ? "Sí" : "No"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(room)} data-testid="edit-room-btn">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(room.id)} data-testid="delete-room-btn">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRooms.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay habitaciones registradas
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Habitación" : "Nueva Habitación"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Edificio *</Label>
                <Select
                  value={formBuildingId}
                  onValueChange={(value) => setFormBuildingId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar edificio" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Piso *</Label>
                <Select
                  value={formData.floorId}
                  onValueChange={(value) => setFormData({ ...formData, floorId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar piso" />
                  </SelectTrigger>
                  <SelectContent>
                    {formFloors.map(f => (
                      <SelectItem key={f.id} value={f.id}>Piso {f.level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número *</Label>
                <Input
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Capacidad</Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Cama</Label>
                <Select
                  value={formData.bedType}
                  onValueChange={(value) => setFormData({ ...formData, bedType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="MATRIMONIAL">Matrimonial</SelectItem>
                    <SelectItem value="QUEEN">Queen</SelectItem>
                    <SelectItem value="KING">King</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as RoomStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                    <SelectItem value="RESERVADA">Reservada</SelectItem>
                    <SelectItem value="OCUPADA">Ocupada</SelectItem>
                    <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio por Noche</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pricePerNight}
                  onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Precio por Persona</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.pricePerPerson}
                  onChange={(e) => setFormData({ ...formData, pricePerPerson: e.target.value })}
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
