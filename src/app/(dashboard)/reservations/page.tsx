"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { statusLabels } from "@/types"
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils"
import { Plus, ChevronLeft, ChevronRight, MapPin, Clock, Loader2, CalendarDays, Search, AlertCircle, Check, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── tipos locales ────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  clientType: string
  phone?: string
  email?: string
}

interface Payment {
  id: string
  amount: number
  notes?: string | null
  createdByName: string
  createdAt: string
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
  paymentStatus: string
  totalAmount: number
  paidAmount: number
  pendingAmount?: number
  observations?: string
  payments: Payment[]
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
  if (str.length === 10) {
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
  "CONFIRMADO",
  "EN_EJECUCION",
  "FINALIZADO",
] as const

// ─── componente modal de detalle ─────────────────────────────────────────────

interface ReservationDetailModalProps {
  reservation: Reservation
  onUpdate: (updated: Reservation) => void
}

function ReservationDetailModal({ reservation, onUpdate }: ReservationDetailModalProps) {
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState("")
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  const pending = reservation.totalAmount - reservation.paidAmount
  const currentIdx = RESERVATION_STATUS_FLOW.indexOf(reservation.status as any)

  const changeStatus = async (newStatus: string) => {
    if (newStatus === reservation.status) { setStatusDropdownOpen(false); return }
    setChangingStatus(true)
    setStatusDropdownOpen(false)
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate({ ...reservation, status: updated.status })
      }
    } catch (err) {
      console.error("Error changing status:", err)
    } finally {
      setChangingStatus(false)
    }
  }

  const registerPayment = async () => {
    const amount = Math.round(parseFloat(paymentAmount) * 100) / 100
    if (isNaN(amount) || amount <= 0) {
      setPaymentError("Ingresá un monto válido mayor a 0")
      return
    }
    if (amount > pending + 0.01) {
      setPaymentError(`El monto no puede superar el pendiente (${formatCurrency(pending)})`)
      return
    }
    setPaymentError("")
    setSavingPayment(true)
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, notes: paymentNotes || undefined }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate({
          ...reservation,
          paidAmount: updated.paidAmount,
          pendingAmount: updated.pendingAmount,
          paymentStatus: updated.paymentStatus,
          payments: updated.payments ?? reservation.payments,
        })
        setPaymentAmount("")
        setPaymentNotes("")
      } else {
        const err = await res.json()
        setPaymentError(err.error || "Error al registrar el pago")
      }
    } catch (err) {
      console.error("Error registering payment:", err)
      setPaymentError("Error de conexión")
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
        body: JSON.stringify({ status: "CANCELADO" }),
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

  const isCancelled = reservation.status === "CANCELADO"
  const isFinalised = reservation.status === "FINALIZADO"

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
        <div className="flex flex-col items-end gap-1.5">
          <span
            className="vm-status-badge text-[10px]"
            style={{ backgroundColor: getStatusColor(reservation.paymentStatus), color: "#fff" }}
          >
            {getStatusLabel(reservation.paymentStatus)}
          </span>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="vm-info-block">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Inicio</p>
          <p className="text-sm font-medium text-foreground">
            {parseDate(reservation.startDate).toLocaleDateString("es-GT", {
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
            {parseDate(reservation.endDate).toLocaleDateString("es-GT", {
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

      {/* Actions */}
      <div className="flex gap-3 flex-wrap items-center">
        {/* Status dropdown */}
        {!isCancelled && !isFinalised && (
          <div className="relative">
            <button
              onClick={() => setStatusDropdownOpen(v => !v)}
              disabled={changingStatus}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150",
                "border-border bg-card hover:bg-secondary text-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {changingStatus
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: getStatusColor(reservation.status) }}
                  />
              }
              <span>{getStatusLabel(reservation.status)}</span>
              <ChevronRight className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-150", statusDropdownOpen && "rotate-90")} />
            </button>

            {statusDropdownOpen && (
              <div className="absolute left-full top-0 ml-1.5 z-50 min-w-[180px] rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cambiar estado</p>
                </div>
                {RESERVATION_STATUS_FLOW.map((s, idx) => {
                  const isCurrent = s === reservation.status
                  const isPast = idx < currentIdx
                  return (
                    <button
                      key={s}
                      onClick={() => changeStatus(s)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors duration-100",
                        isCurrent
                          ? "bg-accent text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        isPast && "opacity-50"
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: getStatusColor(s) }}
                      />
                      <span className="flex-1">{getStatusLabel(s)}</span>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  )
                })}
                <div className="border-t border-border">
                  <button
                    onClick={() => { setStatusDropdownOpen(false); cancelReservation() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left text-destructive hover:bg-destructive/8 transition-colors duration-100"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0 bg-destructive" />
                    <span>Cancelar reservación</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancelled / Finalised state pill */}
        {(isCancelled || isFinalised) && (
          <span
            className="vm-status-badge"
            style={{ backgroundColor: getStatusColor(reservation.status), color: "#fff" }}
          >
            {getStatusLabel(reservation.status)}
          </span>
        )}
      </div>

      {/* Payments section */}
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

        {/* Payment history */}
        {reservation.payments && reservation.payments.length > 0 && (
          <div className="pt-3 border-t border-border space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Historial</p>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {reservation.payments.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-vm-sage">{formatCurrency(p.amount)}</span>
                      <span className="text-[10px] text-muted-foreground">{p.createdByName}</span>
                    </div>
                    {p.notes && (
                      <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{p.notes}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {new Date(p.createdAt).toLocaleDateString("es-GT", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Register payment form */}
        {!isCancelled && pending > 0 && (
          <div className="flex flex-col gap-2 pt-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Monto"
                value={paymentAmount}
                onChange={e => { setPaymentAmount(e.target.value); setPaymentError("") }}
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
            <Input
              placeholder="Notas (opcional)"
              value={paymentNotes}
              onChange={e => setPaymentNotes(e.target.value)}
              className="text-sm"
            />
            {paymentError && (
              <div className="flex items-center gap-1.5 text-destructive text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {paymentError}
              </div>
            )}
          </div>
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [displayMode, setDisplayMode] = useState<"list" | "calendar">("calendar")
  const [granularity, setGranularity] = useState<"month" | "week">("month")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [formError, setFormError] = useState("")

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

  // Add client search state
  const [clientSearch, setClientSearch] = useState("")
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [currentDate, displayMode, granularity])

  async function fetchData() {
    // First load: show full spinner. Subsequent: show subtle refresh overlay
    if (reservations.length === 0) {
      setLoading(true)
    } else {
      setIsRefreshing(true)
    }
    try {
      const months: Array<{ month: number; year: number }> = []
      const m1 = { month: currentDate.getMonth() + 1, year: currentDate.getFullYear() }
      months.push(m1)

      if (granularity === "week") {
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
      setIsRefreshing(false)
    }
  }

  // ── navegación ─────────────────────────────────────────────────────────────

  const prevPeriod = () => {
    if (granularity === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - 7)
      setCurrentDate(d)
    }
  }

  const nextPeriod = () => {
    if (granularity === "month") {
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
      setFormError("La fecha de inicio no puede ser posterior a la fecha de fin")
      return
    }
    if (formData.startDate === formData.endDate) {
      const si = SCHEDULE_ORDER.indexOf(formData.startSchedule)
      const ei = SCHEDULE_ORDER.indexOf(formData.endSchedule)
      if (si > ei) {
        setFormError("En el mismo día, el horario de inicio no puede ser posterior al horario de fin")
        return
      }
    }
    setFormError("")

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
        setFormError(err.error || "Error al crear reservación")
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
    setFormError("")
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

  // Max bars to show before "+N más" overflow label
  const MAX_BARS = 3

  // ── render celda calendario ───────────────────────────────────────────────

  const renderDayCell = (dayKey: string, dayNum: number | string, hideNumber = false) => {
    const isToday  = dayKey === today
    const dayRes   = getResForDay(dayKey)
    const visible  = dayRes.slice(0, MAX_BARS)
    const overflow = dayRes.length - MAX_BARS

    const handleCellClick = () => {
      setFormData(prev => ({
        ...prev,
        startDate: dayKey,
        endDate: dayKey,
        startSchedule: "MANANA",
        endSchedule: "NOCHE",
      }))
      setIsDialogOpen(true)
    }

    return (
      <div
        className="vm-day-cell cursor-pointer"
        onClick={handleCellClick}
      >
        {/* Day number — hidden in week view (header already shows it) */}
        {!hideNumber && (
          <div className="flex items-center gap-1 mb-1 shrink-0">
            {isToday ? (
              <span className="vm-day-today">{dayNum}</span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">{dayNum}</span>
            )}
          </div>
        )}

        {/* Third guides + bars */}
        <div className="relative flex-1 flex flex-col gap-1">
          {/* Third dividers */}
          <div className="absolute inset-0 flex pointer-events-none" aria-hidden="true">
            <div className="flex-1 border-r border-border/40" />
            <div className="flex-1 border-r border-border/40" />
            <div className="flex-1" />
          </div>

          {/* Reservation bars */}
          {visible.map((res) => {
            const startKey = getDateKey(parseDate(res.startDate))
            const endKey   = getDateKey(parseDate(res.endDate))
            const isFirst  = dayKey === startKey
            const isLast   = dayKey === endKey
            const si = SCHEDULE_ORDER.indexOf(res.startSchedule as Schedule)
            const ei = SCHEDULE_ORDER.indexOf(res.endSchedule as Schedule)

            const left  = isFirst ? slotToLeft(si)  : "0%"
            const right = isLast  ? slotToRight(ei) : "0%"

            // Show location label only on the first day of the reservation
            const showLabel = isFirst

            return (
              <div
                key={res.id}
                className="relative h-[14px]"
              >
                <div
                  className="vm-res-bar flex items-center overflow-hidden"
                  style={{
                    left,
                    right,
                    backgroundColor: getStatusColor(res.status),
                  }}
                  onClick={(e) => { e.stopPropagation(); setSelectedReservation(res) }}
                  title={`${res.locationName} — ${res.client.name}`}
                >
                  {showLabel && (
                    <span
                      className="truncate leading-none pointer-events-none select-none"
                      style={{
                        fontSize: "8px",
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.92)",
                        paddingLeft: "4px",
                        paddingRight: "4px",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {res.client.name}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Overflow badge */}
          {overflow > 0 && (
            <div className="flex items-center mt-0.5">
              <span className="text-[9px] font-semibold text-muted-foreground bg-muted rounded px-1 py-0.5 leading-none">
                +{overflow} más
              </span>
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
      <div className="grid grid-cols-7 border border-border rounded-xl overflow-hidden">
        {/* Day headers */}
        {weekDays.map((d, i) => {
          const isT = getDateKey(d) === today
          return (
            <div key={i} className={cn("py-2.5 text-center bg-muted/50 border-b border-border", i > 0 && "border-l border-border")}>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{dayNames[d.getDay()]}</div>
              <div className="flex items-center justify-center mt-1">
                {isT ? (
                  <span className="vm-day-today text-sm w-7 h-7">{d.getDate()}</span>
                ) : (
                  <span className="text-sm font-medium text-foreground">{d.getDate()}</span>
                )}
              </div>
            </div>
          )
        })}

        {/* Day cells — same renderDayCell as month view */}
        {weekDays.map((d, i) => {
          const dayKey = getDateKey(d)
          return (
            <div
              key={dayKey}
              className={cn("border-t border-border", i > 0 && "border-l border-border")}
            >
              {renderDayCell(dayKey, "", true)}
            </div>
          )
        })}
      </div>
    )
  }

  // ── vista de lista ────────────────────────────────────────────────────────

  const renderListView = () => {
    // Filter reservations to the current period
    let filtered: Reservation[]
    if (granularity === "week") {
      const weekDays = getWeekDays(currentDate)
      const weekStart = getDateKey(weekDays[0])
      const weekEnd   = getDateKey(weekDays[6])
      filtered = reservations.filter(r => {
        const s = getDateKey(parseDate(r.startDate))
        const e = getDateKey(parseDate(r.endDate))
        return s <= weekEnd && e >= weekStart
      })
    } else {
      const y = currentDate.getFullYear()
      const m = currentDate.getMonth()
      const monthStart = getDateKey(new Date(y, m, 1))
      const monthEnd   = getDateKey(new Date(y, m + 1, 0))
      filtered = reservations.filter(r => {
        const s = getDateKey(parseDate(r.startDate))
        const e = getDateKey(parseDate(r.endDate))
        return s <= monthEnd && e >= monthStart
      })
    }

    const sorted = [...filtered].sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
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
                  onClick={(e) => { e.stopPropagation(); setSelectedReservation(res) }}
                  >
                    <td className="p-3 font-medium text-foreground max-w-[160px] truncate" title={res.client.name}>{res.client.name}</td>
                    <td className="p-3 text-muted-foreground">{res.locationName}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {parseDate(res.startDate).toLocaleDateString("es-GT", { day: "numeric", month: "short" })}
                      {" — "}
                      {parseDate(res.endDate).toLocaleDateString("es-GT", { day: "numeric", month: "short" })}
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
    if (granularity === "month") {
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
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">
            Reservaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra las reservaciones del centro de eventos
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/menu.pdf" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Ver Menú</span>
            </Button>
          </a>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva Reservación</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Calendar section — no wrapping Card, just a bordered container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border bg-muted/30">
          {/* Period navigation */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevPeriod} data-testid="prev-period" className="h-8 w-8 rounded-lg shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[160px] sm:min-w-[220px] text-center text-foreground" data-testid="current-period">
              {getPeriodTitle()}
            </span>
            <Button variant="ghost" size="icon" onClick={nextPeriod} data-testid="next-period" className="h-8 w-8 rounded-lg shrink-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-2">
            {/* Lista / Calendario */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(["calendar", "list"] as const).map(mode => (
                <button
                  key={mode}
                  className={cn(
                    "vm-view-switch",
                    displayMode === mode ? "vm-view-switch--active" : "vm-view-switch--idle"
                  )}
                  onClick={() => setDisplayMode(mode)}
                >
                  {mode === "list" ? "Lista" : "Calendario"}
                </button>
              ))}
            </div>
            {/* Mes / Semana — siempre visible */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(["month", "week"] as const).map(g => (
                <button
                  key={g}
                  className={cn(
                    "vm-view-switch",
                    granularity === g ? "vm-view-switch--active" : "vm-view-switch--idle"
                  )}
                  onClick={() => setGranularity(g)}
                >
                  {g === "month" ? "Mes" : "Semana"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative w-full overflow-hidden">
          {isRefreshing && (
            <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center pointer-events-none rounded-b-xl">
              <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="w-full">
              <div className={cn("w-full", displayMode !== "list" && "hidden")}>
                {renderListView()}
              </div>
              <div className={cn("w-full p-4", !(displayMode === "calendar" && granularity === "month") && "hidden")} style={{ minHeight: 520 }}>
                {renderMonthView()}
              </div>
              <div className={cn("w-full p-4", !(displayMode === "calendar" && granularity === "week") && "hidden")} style={{ minHeight: 520 }}>
                {renderWeekView()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-1">
        {/* Reservation statuses */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reservación</span>
          {(["COTIZADO","CONFIRMADO","EN_EJECUCION","FINALIZADO","CANCELADO"] as const).map(key => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStatusColor(key) }} />
              <span className="text-xs text-muted-foreground">{statusLabels[key]}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-4 bg-border" />

        {/* Payment statuses */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Pago</span>
          {(["SIN_PAGO","PARCIAL","PAGADO"] as const).map(key => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStatusColor(key) }} />
              <span className="text-xs text-muted-foreground">{statusLabels[key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dialog: Nueva Reservación ──────────────────────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={v => { setIsDialogOpen(v); if (!v) resetForm() }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Nueva Reservación</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cliente *</label>
              <div className="relative">
                <div
                  className="flex items-center border border-input rounded-md bg-background px-3 py-2 text-sm cursor-pointer"
                  onClick={() => setClientDropdownOpen(v => !v)}
                >
                  <Search className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
                  {formData.clientId
                    ? <span className="truncate">{clients.find(c => c.id === formData.clientId)?.name ?? "Cliente"}</span>
                    : <span className="text-muted-foreground">Buscar cliente...</span>
                  }
                </div>
                {clientDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                    <div className="p-2 border-b border-border">
                      <input
                        autoFocus
                        className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                        placeholder="Escribir nombre..."
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {clients
                        .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                        .slice(0, 20)
                        .map(c => (
                          <div
                            key={c.id}
                            className={cn(
                              "px-3 py-2 text-sm cursor-pointer hover:bg-accent truncate",
                              formData.clientId === c.id && "bg-accent font-medium"
                            )}
                            onClick={() => {
                              setFormData({ ...formData, clientId: c.id })
                              setClientDropdownOpen(false)
                              setClientSearch("")
                            }}
                          >
                            {c.name}
                          </div>
                        ))
                      }
                      {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-4 text-sm text-muted-foreground text-center">Sin resultados</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
                {new Date(formData.startDate + "T12:00").toLocaleDateString("es-GT")} {SCHEDULE_LABELS[formData.startSchedule]}
                {" → "}
                {new Date(formData.endDate + "T12:00").toLocaleDateString("es-GT")} {SCHEDULE_LABELS[formData.endSchedule]}
              </div>
            )}

            {/* Monto */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Monto total</label>
              <Input
                type="number"
                min={0}
                value={formData.totalAmount}
                onChange={e => setFormData({ ...formData, totalAmount: Math.round((parseFloat(e.target.value) || 0) * 100) / 100 })}
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
              {formError && (
                <div className="flex items-start gap-2 w-full rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="flex gap-2 w-full justify-end">
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
              </div>
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
