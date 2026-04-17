"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { statusLabels, returnStatusLabels, itemReturnStatusLabels } from "@/types"
import { Archive, Loader2, Check, AlertTriangle, XCircle } from "lucide-react"

interface Reservation {
  id: string
  client: { name: string }
  locationName: string
  startDate: string
  endDate: string
  status: string
}

interface EventClosing {
  id: string
  reservationId: string
  closingDate: string
  returnStatus: string
  observations: string
  damageCost: number
  lossCost: number
  items: EventClosingItem[]
}

interface EventClosingItem {
  id: string
  furnitureId: string
  furniture: { name: string; inventoryNumber: string }
  returnStatus: string
  damageDescription?: string
  repairCost: number
}

export default function EventsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [closings, setClosings] = useState<EventClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [furnitureItems, setFurnitureItems] = useState<any[]>([])
  const [formData, setFormData] = useState({
    returnStatus: "COMPLETO",
    observations: "",
    items: [] as { furnitureId: string; returnStatus: string; damageDescription: string; repairCost: number }[],
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [reservationsRes, closingsRes, furnitureRes] = await Promise.all([
        fetch("/api/reservations?status=EN_EJECUCION"),
        fetch("/api/events/closing"),
        fetch("/api/furniture"),
      ])
      
      const reservationsData = await reservationsRes.json()
      const closingsData = await closingsRes.json()
      const furnitureData = await furnitureRes.json()
      
      setReservations(reservationsData)
      setClosings(closingsData)
      setFurnitureItems(furnitureData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedReservation) return

    const damageCost = formData.items
      .filter(i => i.returnStatus === "RETORNADO_DANADO")
      .reduce((sum, i) => sum + i.repairCost, 0)
    
    const lossCost = formData.items
      .filter(i => i.returnStatus === "NO_RETORNADO")
      .reduce((sum, i) => {
        const furniture = furnitureItems.find(f => f.id === i.furnitureId)
        return sum + (furniture?.currentValue || 0)
      }, 0)

    try {
      const response = await fetch("/api/events/closing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: selectedReservation.id,
          closingDate: new Date().toISOString(),
          returnStatus: formData.returnStatus,
          observations: formData.observations,
          damageCost,
          lossCost,
          items: formData.items,
        }),
      })
      
      if (response.ok) {
        setIsDialogOpen(false)
        fetchData()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || "Error al cerrar evento")
      }
    } catch (error) {
      console.error("Error closing event:", error)
    }
  }

  const resetForm = () => {
    setSelectedReservation(null)
    setFormData({
      returnStatus: "COMPLETO",
      observations: "",
      items: [],
    })
  }

  const openClosingDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    // Create initial items for each furniture piece
    setFormData({
      returnStatus: "COMPLETO",
      observations: "",
      items: furnitureItems.slice(0, 5).map(f => ({
        furnitureId: f.id,
        returnStatus: "RETORNADO_OK",
        damageDescription: "",
        repairCost: 0,
      })),
    })
    setIsDialogOpen(true)
  }

  const updateItemStatus = (index: number, returnStatus: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, returnStatus } : item
      )
    }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETO":
        return <Check className="w-4 h-4 text-green-600" />
      case "CON_DANOS":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case "CON_PERDIDAS":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const completedReservations = reservations.filter(r => 
    r.status === "EN_EJECUCION" || r.status === "TOTAL_CANCELADO"
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">Eventos</h1>
          <p className="text-gray-500">Cierre de eventos y control de mobiliario</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <Archive className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reservations.length}</p>
              <p className="text-sm text-gray-500">En Ejecución</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-full">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {closings.filter(c => c.returnStatus === "COMPLETO").length}
              </p>
              <p className="text-sm text-gray-500">Cierres Completados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-full">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {closings.filter(c => c.returnStatus === "CON_DANOS").length}
              </p>
              <p className="text-sm text-gray-500">Con Daños</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-full">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {closings.filter(c => c.returnStatus === "CON_PERDIDAS").length}
              </p>
              <p className="text-sm text-gray-500">Con Pérdidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Events */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Activos - Pendientes de Cierre</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : completedReservations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay eventos activos para cerrar
            </div>
          ) : (
            <div className="space-y-4">
              {completedReservations.map(reservation => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{reservation.client.name}</p>
                    <p className="text-sm text-gray-500">{reservation.locationName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(reservation.startDate).toLocaleDateString("es-MX")} -{" "}
                      {new Date(reservation.endDate).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <Button onClick={() => openClosingDialog(reservation)}>
                    Cerrar Evento
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Closings */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cierres</CardTitle>
        </CardHeader>
        <CardContent>
          {closings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay cierres registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Fecha Cierre</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Costo Daños</th>
                    <th className="text-left p-3 font-medium">Costo Pérdidas</th>
                    <th className="text-left p-3 font-medium">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {closings.map(closing => (
                    <tr key={closing.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {new Date(closing.closingDate).toLocaleDateString("es-MX")}
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={
                            closing.returnStatus === "COMPLETO" ? "default" :
                            closing.returnStatus === "CON_DANOS" ? "secondary" : "destructive"
                          }
                        >
                          {returnStatusLabels[closing.returnStatus as keyof typeof returnStatusLabels] || closing.returnStatus}
                        </Badge>
                      </td>
                      <td className="p-3">${closing.damageCost.toLocaleString("es-MX")}</td>
                      <td className="p-3">${closing.lossCost.toLocaleString("es-MX")}</td>
                      <td className="p-3 text-gray-600">{closing.observations || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Closing Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cierre de Evento</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedReservation.client.name}</p>
                <p className="text-sm text-gray-500">{selectedReservation.locationName}</p>
              </div>

              <div className="space-y-2">
                <label className="font-medium">Estado de Retorno</label>
                <Select
                  value={formData.returnStatus}
                  onValueChange={(value) => setFormData({ ...formData, returnStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPLETO">Completo - Todo归还</SelectItem>
                    <SelectItem value="CON_DANOS">Con Daños</SelectItem>
                    <SelectItem value="CON_PERDIDAS">Con Pérdidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Furniture Items */}
              <div className="space-y-2">
                <label className="font-medium">Control de Mobiliario</label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {formData.items.map((item, index) => {
                    const furniture = furnitureItems.find(f => f.id === item.furnitureId)
                    return (
                      <div key={index} className="flex items-center gap-4 p-2 border rounded">
                        <span className="flex-1 text-sm">{furniture?.name || item.furnitureId}</span>
                        <Select
                          value={item.returnStatus}
                          onValueChange={(value) => updateItemStatus(index, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RETORNADO_OK">Retornado OK</SelectItem>
                            <SelectItem value="RETORNADO_DANADO">Dañado</SelectItem>
                            <SelectItem value="NO_RETORNADO">No Retornado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-medium">Observaciones</label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Confirmar Cierre</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}