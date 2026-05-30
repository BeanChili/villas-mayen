"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { statusLabels, quoteStatusLabels, quoteStatusColors } from "@/types"
import { formatCurrency, getStatusColor, getStatusLabel, getScheduleFromTime } from "@/lib/utils"
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
  spaces?: any[]
  reservationId?: string // ID de la reservación real (si existe)
  isQuote?: boolean // true si es una quote mostrada como reservation

  // Computed on fetch
  _total?: number
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
      const res = await fetch(`/api/reservations/${reservation.reservationId}/payments`, {
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
            {!reservation.reservationId ? (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                <p className="font-medium">Cotización sin reservación</p>
                <p className="text-xs mt-1">Esta cotización está en estado <strong>{getStatusLabel(reservation.status)}</strong>. Debe confirmarse primero para crear la reservación y poder registrar pagos.</p>
              </div>
            ) : (
              <>
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
              </>
            )}
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
  const [granularity, setGranularity] = useState<"month" | "week" | "day">("month")
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
      // Fetch quotes (primary data source for calendar — F6)
      const quotesRes = await fetch("/api/quotes")
      const quotesData = await quotesRes.json()
      const quotes = Array.isArray(quotesData) ? quotesData : (quotesData.data || [])

      // Map quotes to calendar-compatible format
      const mappedQuotes = quotes.map((q: any) => {
        const spaces = q.spaces || []
        const firstSpace = spaces[0]
        const lastSpace = spaces[spaces.length - 1]
        const startSchedule = firstSpace ? (getScheduleFromTime(firstSpace.startTime) || "MANANA") : "MANANA"
        const endSchedule = lastSpace ? (getScheduleFromTime(lastSpace.endTime) || "NOCHE") : "NOCHE"
        const locationName = spaces.map((s: any) => s.locationName).filter(Boolean).join(", ") || "—"

          return {
          id: q.id,
          clientId: q.clientId,
          client: q.client || { name: "—" },
          locationType: firstSpace?.locationType || "HALL",
          locationName,
          startDate: q.eventDate,
          endDate: q.endDate || q.eventDate,
          startSchedule,
          endSchedule,
          schedules: JSON.stringify([startSchedule]),
          status: q.status, // quote status (BORRADOR, ENVIADA, etc.)
          paymentStatus: q.reservation?.paymentStatus || "SIN_PAGO",
          totalAmount: q.totalAmount || 0,
          paidAmount: q.reservation?.paidAmount || 0,
          pendingAmount: (q.totalAmount || 0) - (q.reservation?.paidAmount || 0),
          observations: q.notes || "",
          payments: q.reservation?.payments || [],
          spaces,
          reservationId: q.reservationId,
          isQuote: true,
        } as Reservation
      })

      const locRes = await fetch("/api/locations")
      const locData = await locRes.json()
      setLocations(Array.isArray(locData) ? locData : (locData.data || []))

      setReservations(mappedQuotes)
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
    } else if (granularity === "week") {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - 7)
      setCurrentDate(d)
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - 1)
      setCurrentDate(d)
    }
  }

  const nextPeriod = () => {
    if (granularity === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else if (granularity === "week") {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + 7)
      setCurrentDate(d)
    } else {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + 1)
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

  const availableLocations = (locations || []).filter(l => l.type === formData.locationType)

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
      window.location.href = "/quotes"
    }

    return (
      <div
        className="vm-day-cell cursor-pointer"
        style={{ minHeight: granularity === "week" ? 180 : 140 }}
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
                className="relative"
                style={{ height: granularity === "week" ? 22 : 18 }}
              >
                <div
                  className="vm-res-bar flex items-center overflow-hidden rounded-sm"
                  style={{
                    left,
                    right,
                    backgroundColor: quoteStatusColors[res.status] || getStatusColor(res.status),
                  }}
                  onClick={(e) => { e.stopPropagation(); setSelectedReservation(res) }}
                  title={`${res.locationName} — ${res.client.name}`}
                >
                  {showLabel && (
                    <span
                      className="truncate leading-none pointer-events-none select-none"
                      style={{
                        fontSize: granularity === "week" ? "11px" : "9px",
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.95)",
                        paddingLeft: "6px",
                        paddingRight: "6px",
                        letterSpacing: "0.01em",
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

  // ── vista por día (pantalla grande / TV) ───────────────────────────────────

  /* ── helpers para vista de día tipo Google Calendar ── */

  function parseTimeToDecimal(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number)
    return h + (m || 0) / 60
  }

  function getEventTimeRange(res: Reservation): { start: number; end: number } {
    // Si hay espacios con horarios exactos, usarlos
    if (res.spaces && res.spaces.length > 0) {
      const times = res.spaces.flatMap((sp: any) => {
        const s = sp.startTime ? parseTimeToDecimal(sp.startTime) : null
        const e = sp.endTime ? parseTimeToDecimal(sp.endTime) : null
        return s !== null && e !== null ? [{ start: s, end: e }] : []
      })
      if (times.length > 0) {
        return {
          start: Math.min(...times.map((t: any) => t.start)),
          end: Math.max(...times.map((t: any) => t.end)),
        }
      }
    }
    // Fallback a bloques de horario
    const scheduleStart: Record<string, number> = { MANANA: 7, TARDE: 14, NOCHE: 20 }
    const scheduleEnd: Record<string, number> = { MANANA: 13, TARDE: 19, NOCHE: 25 }
    return {
      start: scheduleStart[res.startSchedule] ?? 7,
      end: scheduleEnd[res.endSchedule] ?? 13,
    }
  }

  function computeOverlapGroups(events: { id: string; start: number; end: number }[]) {
    // Algoritmo greedy para asignar columnas a eventos solapados
    // Similar a Google Calendar: eventos concurrentes se distribuyen en columnas
    const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end)
    const result = new Map<string, { col: number; totalCols: number }>()

    if (sorted.length === 0) return result

    // Para cada evento, encontrar todos los eventos que se solapan (directa o indirectamente)
    // y asignar columnas dentro de ese grupo
    const processed = new Set<string>()

    for (const ev of sorted) {
      if (processed.has(ev.id)) continue

      // Encontrar grupo de solapamiento: todos los eventos que se solapan con este
      // o con eventos que se solapan con este (transitivamente)
      const group: typeof sorted = []
      const toProcess = [ev]
      const groupIds = new Set<string>([ev.id])

      while (toProcess.length > 0) {
        const current = toProcess.pop()!
        group.push(current)
        processed.add(current.id)

        // Encontrar eventos que se solapan con current
        for (const other of sorted) {
          if (groupIds.has(other.id)) continue
          // Se solapan si: other.start < current.end && other.end > current.start
          if (other.start < current.end && other.end > current.start) {
            groupIds.add(other.id)
            toProcess.push(other)
          }
        }
      }

      // Asignar columnas greedy dentro del grupo
      group.sort((a, b) => a.start - b.start || a.end - b.end)
      const columns: { end: number; events: string[] }[] = []

      for (const gEv of group) {
        let assigned = false
        for (let i = 0; i < columns.length; i++) {
          // Si la última columna termina antes de que empiece este evento, reutilizar
          const lastEnd = Math.max(...columns[i].events.map((eId) => {
            const e = group.find((x) => x.id === eId)
            return e?.end ?? 0
          }))
          if (lastEnd <= gEv.start) {
            columns[i].events.push(gEv.id)
            assigned = true
            break
          }
        }
        if (!assigned) {
          columns.push({ end: gEv.end, events: [gEv.id] })
        }
      }

      const totalCols = Math.max(columns.length, 1)
      for (let i = 0; i < columns.length; i++) {
        for (const eId of columns[i].events) {
          result.set(eId, { col: i, totalCols })
        }
      }
    }

    return result
  }

  const renderDayView = () => {
    const dayKey = getDateKey(currentDate)
    const dayRes = getResForDay(dayKey)

    // Rango de horas: 7:00 a 25:00 (1:00 AM) = 18 horas
    const DAY_START = 7
    const DAY_END = 25
    const HOUR_HEIGHT = 64 // px por hora
    const TOTAL_HOURS = DAY_END - DAY_START
    const TIMELINE_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT

    // Preparar eventos con tiempos
    const events = dayRes.map((res) => {
      const range = getEventTimeRange(res)
      return {
        id: res.id,
        res,
        start: Math.max(range.start, DAY_START),
        end: Math.min(range.end, DAY_END),
      }
    })

    // Calcular columnas para solapamientos
    const overlapGroups = computeOverlapGroups(events)

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {currentDate.toLocaleDateString("es-GT", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
          <span className="text-sm text-muted-foreground">
            {events.length} evento{events.length !== 1 ? "s" : ""}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg">Sin eventos para este día</p>
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => (window.location.href = `/quotes`)}
            >
              <Plus className="w-4 h-4" /> Cotizar
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 overflow-auto">
            {/* Columna de horas */}
            <div
              className="flex-shrink-0 border-r border-border bg-muted/30"
              style={{ width: 64, height: TIMELINE_HEIGHT + 24 }}
            >
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
                const hour = DAY_START + i
                const displayHour = hour >= 24 ? hour - 24 : hour
                const ampm = hour < 12 || hour >= 24 ? "a.m." : "p.m."
                return (
                  <div
                    key={hour}
                    className="text-[11px] text-muted-foreground text-right pr-2 relative"
                    style={{
                      height: HOUR_HEIGHT,
                      lineHeight: "14px",
                      marginTop: i === 0 ? 24 : 0,
                    }}
                  >
                    <span className="absolute right-2 -top-2">
                      {displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour}{" "}
                      {ampm}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Área de eventos */}
            <div className="flex-1 relative" style={{ height: TIMELINE_HEIGHT + 24, minWidth: 300 }}>
              {/* Líneas de hora */}
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-border/60"
                  style={{ top: i * HOUR_HEIGHT + 24 }}
                />
              ))}

              {/* Línea de hora actual */}
              {(() => {
                const now = new Date()
                const currentHour = now.getHours() + now.getMinutes() / 60
                if (currentHour >= DAY_START && currentHour <= DAY_END) {
                  const currentTop = (currentHour - DAY_START) * HOUR_HEIGHT + 24
                  return (
                    <div
                      className="absolute left-0 right-0 z-10 pointer-events-none"
                      style={{ top: currentTop }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                        <div className="flex-1 border-t border-red-500 border-dashed" />
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              {/* Eventos */}
              {events.map((ev) => {
                const top = (ev.start - DAY_START) * HOUR_HEIGHT + 24
                const height = Math.max((ev.end - ev.start) * HOUR_HEIGHT - 2, 28)
                const overlap = overlapGroups.get(ev.id) ?? { col: 0, totalCols: 1 }
                const widthPct = 100 / overlap.totalCols
                const leftPct = overlap.col * widthPct

                const statusColor = quoteStatusColors[ev.res.status] || "#9ca3af"
                const statusLabel = quoteStatusLabels[ev.res.status] || ev.res.status
                const clientName = ev.res.client.name
                const shortName =
                  clientName.length > 20 ? clientName.slice(0, 18) + "…" : clientName

                return (
                  <div
                    key={ev.id}
                    className="absolute cursor-pointer transition-all duration-200 rounded-lg overflow-hidden border-l-[4px] hover:shadow-md hover:scale-[1.02]"
                    style={{
                      top,
                      height,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      backgroundColor: `${statusColor}18`,
                      borderLeftColor: statusColor,
                      boxShadow: `0 1px 3px ${statusColor}30`,
                    }}
                    onClick={() => setSelectedReservation(ev.res)}
                    title={`${clientName} — ${statusLabel}\n${ev.res.locationName}\n${formatCurrency(
                      ev.res.totalAmount
                    )}`}
                  >
                    <div className="px-2 py-1 h-full flex flex-col">
                      {/* Título: nombre del cliente */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white"
                          style={{ backgroundColor: statusColor }}
                        />
                        <span className="text-[11px] font-bold text-foreground truncate leading-tight">
                          {shortName}
                        </span>
                      </div>

                      {/* Info secundaria: horario + ubicación */}
                      {height > 36 && (
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground truncate">
                            <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                            <span className="truncate">
                              {SCHEDULE_LABELS[ev.res.startSchedule as Schedule]} —{" "}
                              {SCHEDULE_LABELS[ev.res.endSchedule as Schedule]}
                            </span>
                          </div>
                          {height > 52 && (
                            <div className="flex items-center gap-1 text-[9px] text-muted-foreground truncate">
                              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{ev.res.locationName}</span>
                            </div>
                          )}
                          {height > 72 && (
                            <div className="text-[9px] font-mono font-semibold text-foreground/90 truncate">
                              {formatCurrency(ev.res.totalAmount)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── vista de lista ────────────────────────────────────────────────────────

  const renderListView = () => {
    // Filter reservations to the current period
    let filtered: Reservation[]
    if (granularity === "day") {
      const dayKey = getDateKey(currentDate)
      filtered = reservations.filter(r => {
        const s = getDateKey(parseDate(r.startDate))
        const e = getDateKey(parseDate(r.endDate))
        return s <= dayKey && e >= dayKey
      })
    } else if (granularity === "week") {
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
                        style={{ backgroundColor: quoteStatusColors[res.status] || getStatusColor(res.status), color: "#fff" }}
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
    if (granularity === "day") {
      return currentDate.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
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
          <a href="/quotes">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Cotizar</span>
              <span className="sm:hidden">Cotizar</span>
            </Button>
          </a>
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
            {/* Mes / Semana / Día */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(["month", "week", "day"] as const).map(g => (
                <button
                  key={g}
                  className={cn(
                    "vm-view-switch",
                    granularity === g ? "vm-view-switch--active" : "vm-view-switch--idle"
                  )}
                  onClick={() => setGranularity(g)}
                >
                  {g === "month" ? "Mes" : g === "week" ? "Semana" : "Día"}
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
              <div className={cn("w-full", !(displayMode === "calendar" && granularity === "day") && "hidden")}>
                {renderDayView()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status legend — Quote statuses (F6) */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-1">
        {/* Quote statuses */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cotización</span>
          {(["BORRADOR","ENVIADA","NO_CONFIRMADA","CONFIRMADA","EN_EJECUCION","CANCELADO","FINALIZADA"] as const).map(key => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: quoteStatusColors[key] || "#9ca3af" }} />
              <span className="text-xs text-muted-foreground">{quoteStatusLabels[key] || key}</span>
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
