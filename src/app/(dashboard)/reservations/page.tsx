"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { statusLabels } from "@/types"
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils"
import { Plus, ChevronLeft, ChevronRight, MapPin, Clock, Loader2, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── tipos locales ────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  clientType: string
  phone?: string
  email?: string
}

interface Reservation {
  id: string
  clientId: string
  client: { name: string }
  locationType: string
  locationName: string
  startDate: string
  endDate: string
  startSchedule: string
  endSchedule: string
  schedules: string | string[]
  status: string
  totalAmount: number
  paidAmount: number
  pendingAmount?: number
  observations?: string
}

interface Location {
  id: string
  name: string
  type: string
  capacity?: number
}

// ─── constantes de horarios ───────────────────────────────────────────────────

const SCHEDULE_ORDER = ["MANANA", "TARDE", "NOCHE"] as const
type Schedule = typeof SCHEDULE_ORDER[number]

const SCHEDULE_LABELS: Record<Schedule, string> = {
  MANANA: "Mañana",
  TARDE:  "Tarde",
  NOCHE:  "Noche",
}

const SCHEDULE_SHORT: Record<Schedule, string> = {
  MANANA: "M",
  TARDE:  "T",
  NOCHE:  "N",
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function parseDate(str: string | Date): Date {
  if (str instanceof Date) return str
  if (typeof str === "string" && str.length === 10) {
    const [y, m, d] = str.split("-").map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(str)
}

function slotVisible(res: Reservation, dayKey: string, slotIdx: number): boolean {
  const startKey = getDateKey(parseDate(res.startDate))
  const endKey   = getDateKey(parseDate(res.endDate))
  const si = SCHEDULE_ORDER.indexOf(res.startSchedule as Schedule)
  const ei = SCHEDULE_ORDER.indexOf(res.endSchedule as Schedule)

  if (dayKey < startKey || dayKey > endKey) return false

  const isFirst = dayKey === startKey
  const isLast  = dayKey === endKey

  if (isFirst && isLast) return slotIdx >= si && slotIdx <= ei
  if (isFirst)           return slotIdx >= si
  if (isLast)            return slotIdx <= ei
  return true
}

// ─── status flow ──────────────────────────────────────────────────────────────

const RESERVATION_STATUS_FLOW = [
  "COTIZADO",
  "ANTICIPO",
  "DEPOSITO",
  "SALDO",
  "EN_EJECUCION",
  "FINALIZADO",
  "FINALIZADO_COBRO",
] as const

// ─── componente modal de detalle ─────────────────────────────────────────────

interface ReservationDetailModalProps {
  reservation: Reservation
  onUpdate: (updated: Reservation) => void
}

function ReservationDetailModal({ reservation, onUpdate }: ReservationDetailModalProps) {
  const [paymentAmount, setPaymentAmount] = useState("")
  const [savingPayment, setSavingPayment] = useState(false)

  const pending = reservation.totalAmount - reservation.paidAmount
  const currentIdx = RESERVATION_STATUS_FLOW.indexOf(reservation.status as any)
  const nextStatus = currentIdx < RESERVATION_STATUS_FLOW.length - 1
    ? RESERVATION_STATUS_FLOW[currentIdx + 1]
    : null

  const advanceStatus = async () => {
    if (!nextStatus) return
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate({ ...reservation, status: updated.status })
      }
    } catch (err) {
      console.error("Error advancing status:", err)
    }
  }

  const registerPayment = async () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Ingrese un monto válido")
      return
    }

    setSavingPayment(true)
    try {
      const newPaid = reservation.paidAmount + amount
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAmount: newPaid,
          totalAmount: reservation.totalAmount,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate({
          ...reservation,
          paidAmount: updated.paidAmount,
          pendingAmount: updated.pendingAmount ?? reservation.totalAmount - updated.paidAmount,
        })
        setPaymentAmount("")
      }
    } catch (err) {
      console.error("Error registering payment:", err)
    } finally {
      setSavingPayment(false)
    }
  }

  const cancelReservation = async () => {
    if (!confirm("¿Está seguro de cancelar esta reservación?")) return
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "TOTAL_CANCELADO" }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate({ ...reservation, status: updated.status })
      }
    } catch (err) {
      console.error("Error canceling:", err)
    }
  }

  const paymentProgress = reservation.totalAmount > 0
    ? (reservation.paidAmount / reservation.totalAmount) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
          {reservation.client.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground">
            {reservation.client.name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm">{reservation.locationName}</span>
          </div>
        </div>
        <span
          className="vm-status-badge"
          style={{ backgroundColor: getStatusColor(reservation.status), color: "#fff" }}
        >
          {getStatusLabel(reservation.status)}
        </span>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="vm-info-block">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Inicio</p>
          <p className="text-sm font-medium text-foreground">
            {parseDate(reservation.startDate).toLocaleDateString("es-MX", {
              weekday: "short", day: "numeric", month: "short"
            })}
          </p>
          <div className="flex items-center gap-1 mt-1.5 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-xs">
              {SCHEDULE_LABELS[reservation.startSchedule as Schedule] ?? reservation.startSchedule}
            </span>
          </div>
        </div>
        <div className="vm-info-block">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Fin</p>
          <p className="text-sm font-medium text-foreground">
            {parseDate(reservation.endDate).toLocaleDateString("es-MX", {
              weekday: "short", day: "numeric", month: "short"
            })}
          </p>
          <div className="flex items-center gap-1 mt-1.5 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-xs">
              {SCHEDULE_LABELS[reservation.endSchedule as Schedule] ?? reservation.endSchedule}
            </span>
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="rounded-xl border border-border p-5 space-y-4 bg-card">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Pagos</span>
          <span className={cn(
            "text-2xl font-display",
            paymentProgress >= 100 ? "text-vm-sage" : "text-foreground"
          )}>
            {paymentProgress.toFixed(0)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="vm-progress">
          <div
            className={cn(
              "vm-progress-fill",
              paymentProgress >= 100 ? "bg-vm-sage" : "bg-primary"
            )}
            style={{ width: `${Math.min(paymentProgress, 100)}%` }}
          />
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-sm font-mono font-medium text-foreground mt-0.5">{formatCurrency(reservation.totalAmount)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pagado</p>
            <p className="text-sm font-mono font-medium text-vm-sage mt-0.5">{formatCurrency(reservation.paidAmount)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pendiente</p>
            <p className="text-sm font-mono font-medium text-vm-sienna mt-0.5">{formatCurrency(pending)}</p>
          </div>
        </div>

        {/* Register payment */}
        {pending > 0 && (
          <div className="flex gap-2 pt-4 border-t border-border">
            <Input
              type="number"
              placeholder="Monto"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              className="flex-1 font-mono"
              min={0}
              max={pending}
            />
            <Button
              onClick={registerPayment}
              disabled={savingPayment || !paymentAmount}
              size="sm"
              className="px-5"
            >
              {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar"}
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {nextStatus && reservation.status !== "TOTAL_CANCELADO" && reservation.status !== "FINALIZADO_COBRO" && (
          <Button variant="outline" onClick={advanceStatus} size="sm">
            Avanzar a: {getStatusLabel(nextStatus)}
          </Button>
        )}

        {reservation.status !== "TOTAL_CANCELADO" &&
         reservation.status !== "FINALIZADO" &&
         reservation.status !== "FINALIZADO_COBRO" && (
          <Button variant="destructive" onClick={cancelReservation} size="sm">
            Cancelar Reservación
          </Button>
        )}

        {paymentProgress >= 100 && reservation.status !== "FINALIZADO_COBRO" && (
          <Button
            size="sm"
            onClick={async () => {
              const res = await fetch(`/api/reservations/${reservation.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "FINALIZADO_COBRO" }),
              })
              if (res.ok) {
                const updated = await res.json()
                onUpdate({ ...reservation, status: updated.status })
              }
            }}
          >
            Completar Cobro
          </Button>
        )}
      </div>

      {/* Observations */}
      {reservation.observations && (
        <div className="vm-info-block">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Notas</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{reservation.observations}</p>
        </div>
      )}
    </div>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function ReservationsPage() {
  const { data: session } = useSession()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("list")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  const [formData, setFormData] = useState({
    clientId: "",
    locationType: "HALL",
    locationId: "",
    locationName: "",
    startDate: "",
    startSchedule: "MANANA" as Schedule,
    endDate: "",
    endSchedule: "NOCHE" as Schedule,
    totalAmount: 0,
    observations: "",
  })

  useEffect(() => {
    fetchData()
  }, [currentDate, viewMode])

  async function fetchData() {
    setLoading(true)
    try {
      const months: Array<{ month: number; year: number }> = []
      const m1 = { month: currentDate.getMonth() + 1, year: currentDate.getFullYear() }
      months.push(m1)

      if (viewMode === "week") {
        const weekDays = getWeekDays(currentDate)
        const lastDay  = weekDays[6]
        const m2 = { month: lastDay.getMonth() + 1, year: lastDay.getFullYear() }
        if (m2.month !== m1.month || m2.year !== m1.year) months.push(m2)
      }

      const resResults = await Promise.all(
        months.map(({ month, year }) =>
          fetch(`/api/reservations?month=${month}&year=${year}`).then(r => r.json())
        )
      )

      const merged = Object.values(
        resResults.flat().reduce((acc: Record<string, Reservation>, r: Reservation) => {
          acc[r.id] = r
          return acc
        }, {})
      ) as Reservation[]

      const [cliRes, locRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/locations"),
      ])

      setReservations(merged)
      setClients(await cliRes.json())
      setLocations(await locRes.json())
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── navegación ─────────────────────────────────────────────────────────────

  const prevPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - 7)
      setCurrentDate(d)
    }
  }

  const nextPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + 7)
      setCurrentDate(d)
    }
  }

  // ── submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.startDate > formData.endDate) {
      alert("La fecha de inicio no puede ser posterior a la fecha de fin")
      return
    }
    if (formData.startDate === formData.endDate) {
      const si = SCHEDULE_ORDER.indexOf(formData.startSchedule)
      const ei = SCHEDULE_ORDER.indexOf(formData.endSchedule)
      if (si > ei) {
        alert("En el mismo día, el horario de inicio no puede ser posterior al horario de fin")
        return
      }
    }

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        const err = await response.json()
        alert(err.error || "Error al crear reservación")
      }
    } catch (err) {
      console.error("Error creating reservation:", err)
    }
  }

  const resetForm = () => {
    setFormData({
      clientId: "",
      locationType: "HALL",
      locationId: "",
      locationName: "",
      startDate: "",
      startSchedule: "MANANA",
      endDate: "",
      endSchedule: "NOCHE",
      totalAmount: 0,
      observations: "",
    })
  }

  // ── helpers de calendario ──────────────────────────────────────────────────

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
  const dayNames   = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]

  const getMonthDays = (date: Date): (number | null)[] => {
    const year  = date.getFullYear()
    const month = date.getMonth()
    const first = new Date(year, month, 1).getDay()
    const last  = new Date(year, month + 1, 0).getDate()
    const arr: (number | null)[] = []
    for (let i = 0; i < first; i++) arr.push(null)
    for (let i = 1; i <= last; i++) arr.push(i)
    return arr
  }

  const getWeekDays = (date: Date): Date[] => {
    const dow = date.getDay()
    const sunday = new Date(date)
    sunday.setDate(date.getDate() - dow)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      return d
    })
  }

  const getResForDay = (dayKey: string) =>
    reservations.filter(r => {
      const sk = getDateKey(parseDate(r.startDate))
      const ek = getDateKey(parseDate(r.endDate))
      return dayKey >= sk && dayKey <= ek
    })

  const availableLocations = locations.filter(l => l.type === formData.locationType)

  const today = getDateKey(new Date())

  // ── calendar bar positioning ──────────────────────────────────────────────

  const slotToLeft  = (idx: number) => `${(idx / 3) * 100}%`
  const slotToRight = (idx: number) => `${((2 - idx) / 3) * 100}%`

  // ── render celda calendario ───────────────────────────────────────────────

  const renderDayCell = (dayKey: string, dayNum: number | string) => {
    const isToday  = dayKey === today
    const dayRes   = getResForDay(dayKey)

    return (
      <div className="vm-day-cell">
        {/* Day number */}
        <div className="flex items-center gap-1 mb-1 shrink-0">
          {isToday ? (
            <span className="vm-day-today">{dayNum}</span>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">{dayNum}</span>
          )}
        </div>

        {/* Third guides + bars */}
        <div className="relative flex-1 flex flex-col gap-0.5">
          {/* Third dividers */}
          <div className="absolute inset-0 flex pointer-events-none" aria-hidden="true">
            <div className="flex-1 border-r border-border/40" />
            <div className="flex-1 border-r border-border/40" />
            <div className="flex-1" />
          </div>

          {/* Reservation bars */}
          {dayRes.map((res, i) => {
            const startKey = getDateKey(parseDate(res.startDate))
            const endKey   = getDateKey(parseDate(res.endDate))
            const isFirst  = dayKey === startKey
            const isLast   = dayKey === endKey
            const si = SCHEDULE_ORDER.indexOf(res.startSchedule as Schedule)
            const ei = SCHEDULE_ORDER.indexOf(res.endSchedule as Schedule)

            const left  = isFirst ? slotToLeft(si)  : "0%"
            const right = isLast  ? slotToRight(ei) : "0%"

            return (
              <div
                key={res.id}
                className="relative h-[5px]"
                style={{ marginTop: i > 0 ? "2px" : undefined }}
              >
                <div
                  className="vm-res-bar"
                  style={{
                    left,
                    right,
                    backgroundColor: getStatusColor(res.status),
                  }}
                  onClick={() => setSelectedReservation(res)}
                  title={`${res.client.name} — ${res.locationName}`}
                />
              </div>
            )
          })}

          {/* Client name label */}
          {dayRes.length > 0 && (
            <div className="mt-0.5 truncate">
              {dayRes.slice(0, 1).map(res => {
                const startKey = getDateKey(parseDate(res.startDate))
                if (dayKey !== startKey) return null
                return (
                  <span key={res.id} className="text-[8px] leading-none text-muted-foreground/60">
                    {res.client.name}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── vista mensual ──────────────────────────────────────────────────────────

  const renderMonthView = () => {
    const days = getMonthDays(currentDate)
    return (
      <div className="grid grid-cols-7 border border-border rounded-xl overflow-hidden">
        {dayNames.map(d => (
          <div key={d} className="text-[11px] font-semibold text-muted-foreground text-center py-2.5 bg-muted/50 border-b border-border uppercase tracking-wider">
            {d}
          </div>
        ))}
        {days.map((day, idx) => {
          if (!day) return (
            <div
              key={idx}
              className={cn("min-h-28 bg-muted/30", idx >= 7 && "border-t border-border")}
            />
          )
          const dayKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const row = Math.floor(idx / 7)
          return (
            <div
              key={idx}
              className={cn(
                row > 0 && "border-t border-border",
                idx % 7 > 0 && "border-l border-border"
              )}
            >
              {renderDayCell(dayKey, day)}
            </div>
          )
        })}
      </div>
    )
  }

  // ── vista semanal ──────────────────────────────────────────────────────────

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate)

    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 border border-border rounded-xl overflow-hidden min-w-[640px]">
          {/* Header */}
          <div className="text-[11px] font-semibold text-muted-foreground text-center py-2.5 bg-muted/50 border-b border-border uppercase tracking-wider">
            Horario
          </div>
          {weekDays.map((d, i) => {
            const isT = getDateKey(d) === today
            return (
              <div key={i} className="py-2.5 text-center bg-muted/50 border-b border-border border-l">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{dayNames[d.getDay()]}</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {isT ? (
                    <span className="vm-day-today text-sm w-7 h-7">{d.getDate()}</span>
                  ) : (
                    <span className="text-sm font-medium text-foreground">{d.getDate()}</span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Rows per schedule */}
          {SCHEDULE_ORDER.map((slot, slotIdx) => (
            <React.Fragment key={slot}>
              <div className="p-2 flex items-center justify-center bg-muted/30 border-t border-border">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{SCHEDULE_LABELS[slot]}</span>
              </div>

              {weekDays.map((d, di) => {
                const dayKey = getDateKey(d)
                const visible = getResForDay(dayKey).filter(r => slotVisible(r, dayKey, slotIdx))
                return (
                  <div
                    key={`${slot}-${di}`}
                    className="min-h-14 p-1 space-y-0.5 bg-card border-t border-l border-border"
                  >
                    {visible.map(res => (
                      <div
                        key={res.id}
                        className="text-[9px] leading-4 px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 truncate transition-opacity text-white font-medium"
                        style={{ backgroundColor: getStatusColor(res.status) }}
                        onClick={() => setSelectedReservation(res)}
                        title={`${res.client.name} — ${res.locationName}`}
                      >
                        {res.client.name}
                      </div>
                    ))}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  }

  // ── vista de lista ────────────────────────────────────────────────────────

  const renderListView = () => {
    const sorted = [...reservations].sort((a, b) =>
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
              <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Ubicación</th>
              <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Fechas</th>
              <th className="text-left p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
              <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
              <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pagado</th>
              <th className="text-right p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No hay reservaciones para este período</p>
                </td>
              </tr>
            ) : (
              sorted.map(res => {
                const pend = res.totalAmount - res.paidAmount
                return (
                  <tr
                    key={res.id}
                    className="vm-table-row"
                    onClick={() => setSelectedReservation(res)}
                  >
                    <td className="p-3 font-medium text-foreground">{res.client.name}</td>
                    <td className="p-3 text-muted-foreground">{res.locationName}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {parseDate(res.startDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                      {" — "}
                      {parseDate(res.endDate).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </td>
                    <td className="p-3">
                      <span
                        className="vm-status-badge"
                        style={{ backgroundColor: getStatusColor(res.status), color: "#fff" }}
                      >
                        {getStatusLabel(res.status)}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-foreground">{formatCurrency(res.totalAmount)}</td>
                    <td className="p-3 text-right font-mono font-medium text-vm-sage">{formatCurrency(res.paidAmount)}</td>
                    <td className="p-3 text-right font-mono font-medium text-vm-sienna">{formatCurrency(pend)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    )
  }

  // ── título del período ─────────────────────────────────────────────────────

  const getPeriodTitle = () => {
    if (viewMode === "month") {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    }
    const week = getWeekDays(currentDate)
    const first = week[0]
    const last  = week[6]
    const sameMonth = first.getMonth() === last.getMonth()
    if (sameMonth) {
      return `${first.getDate()} – ${last.getDate()} de ${monthNames[first.getMonth()]} ${first.getFullYear()}`
    }
    return `${first.getDate()} ${monthNames[first.getMonth()]} – ${last.getDate()} ${monthNames[last.getMonth()]} ${last.getFullYear()}`
  }

  // ── JSX principal ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground tracking-tight">
            Reservaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra las reservaciones del centro de eventos
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Reservación
        </Button>
      </div>

      {/* Calendar section — no wrapping Card, just a bordered container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
          {/* Period navigation */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={prevPeriod} data-testid="prev-period" className="h-8 w-8 rounded-lg">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[220px] text-center text-foreground" data-testid="current-period">
              {getPeriodTitle()}
            </span>
            <Button variant="ghost" size="icon" onClick={nextPeriod} data-testid="next-period" className="h-8 w-8 rounded-lg">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* View switcher */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            {(["list", "month", "week"] as const).map(mode => (
              <button
                key={mode}
                className={cn(
                  "vm-view-switch",
                  viewMode === mode ? "vm-view-switch--active" : "vm-view-switch--idle"
                )}
                onClick={() => setViewMode(mode)}
              >
                {mode === "list" ? "Lista" : mode === "month" ? "Mes" : "Semana"}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : viewMode === "list" ? renderListView() : viewMode === "month" ? renderMonthView() : renderWeekView()}
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Estados</span>
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStatusColor(key) }} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Dialog: Nueva Reservación ──────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Nueva Reservación</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cliente *</label>
              <Select
                value={formData.clientId}
                onValueChange={v => setFormData({ ...formData, clientId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de ubicación */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tipo de ubicación *</label>
              <Select
                value={formData.locationType}
                onValueChange={v => setFormData({ ...formData, locationType: v, locationId: "", locationName: "" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE_AREA">Área Libre</SelectItem>
                  <SelectItem value="DINING_ROOM">Comedor</SelectItem>
                  <SelectItem value="HALL">Salón</SelectItem>
                  <SelectItem value="ROOM">Habitación</SelectItem>
                  <SelectItem value="GARDEN">Jardín</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ubicación */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Ubicación *</label>
              <Select
                value={formData.locationId}
                onValueChange={v => {
                  const sel = locations.find(l => l.id === v)
                  setFormData({ ...formData, locationId: v, locationName: sel?.name || "" })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar espacio" />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inicio */}
            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <p className="text-sm font-semibold text-foreground">Inicio de la reservación</p>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Fecha inicio *</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Horario inicio *</label>
                <div className="flex rounded-lg overflow-hidden border border-border">
                  {SCHEDULE_ORDER.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({ ...formData, startSchedule: s })}
                      className={cn(
                        "vm-schedule-btn",
                        formData.startSchedule === s
                          ? "vm-schedule-btn--active"
                          : "vm-schedule-btn--idle"
                      )}
                    >
                      {SCHEDULE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fin */}
            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <p className="text-sm font-semibold text-foreground">Fin de la reservación</p>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Fecha fin *</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  min={formData.startDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Horario fin *</label>
                <div className="flex rounded-lg overflow-hidden border border-border">
                  {SCHEDULE_ORDER.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({ ...formData, endSchedule: s })}
                      className={cn(
                        "vm-schedule-btn",
                        formData.endSchedule === s
                          ? "vm-schedule-btn--active"
                          : "vm-schedule-btn--idle"
                      )}
                    >
                      {SCHEDULE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date range summary */}
            {formData.startDate && formData.endDate && (
              <div className="text-xs p-3 bg-primary/5 text-primary rounded-lg border border-primary/10">
                <span className="font-semibold">Rango: </span>
                {new Date(formData.startDate + "T12:00").toLocaleDateString("es-MX")} {SCHEDULE_LABELS[formData.startSchedule]}
                {" → "}
                {new Date(formData.endDate + "T12:00").toLocaleDateString("es-MX")} {SCHEDULE_LABELS[formData.endSchedule]}
              </div>
            )}

            {/* Monto */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Monto total</label>
              <Input
                type="number"
                min={0}
                value={formData.totalAmount}
                onChange={e => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                className="font-mono"
              />
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observaciones</label>
              <Input
                value={formData.observations}
                onChange={e => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Notas adicionales (opcional)"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsDialogOpen(false); resetForm() }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Crear Reservación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Detalle de Reservación ───────────────────────────────────── */}
      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Reservación</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <ReservationDetailModal
              reservation={selectedReservation}
              onUpdate={(updated) => {
                setSelectedReservation(updated)
                fetchData()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
