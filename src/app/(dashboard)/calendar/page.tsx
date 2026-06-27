"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { statusLabels, quoteStatusLabels, quoteStatusColors } from "@/types"
import { formatCurrency, getStatusColor, getStatusLabel, getScheduleFromTime, formatParkingSpots } from "@/lib/utils"
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
  spaces?: any[]
  payments?: Payment[]
  eventTitle?: string
  parkingSpot?: string
  guestCount?: number

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

// Franjas horarias para la vista de Día — en horas decimales, fin de NOCHE = 25 (1am del día siguiente)
const SCHEDULE_BANDS: { key: Schedule; label: string; start: number; end: number; bg: string }[] = [
  { key: "MANANA", label: "Mañana", start: 7,  end: 13, bg: "rgba(217, 119, 6, 0.06)" },
  { key: "TARDE",  label: "Tarde",  start: 14, end: 19, bg: "rgba(59, 130, 246, 0.06)" },
  { key: "NOCHE",  label: "Noche",  start: 20, end: 25, bg: "rgba(99, 102, 241, 0.07)" },
]

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

// ─── status flow ──────────────────────────────────────────────────────────────

const QUOTE_STATUS_FLOW = [
  "BORRADOR",
  "ENVIADA",
  "NO_CONFIRMADA",
  "CONFIRMADA",
  "EN_EJECUCION",
  "FINALIZADA",
] as const

// ─── componente modal de detalle ─────────────────────────────────────────────

interface ReservationDetailModalProps {
  reservation: Reservation
  onUpdate: (updated: Reservation) => void
}

function ReservationDetailModal({ reservation, onUpdate }: ReservationDetailModalProps) {
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [paymentType, setPaymentType] = useState("EFECTIVO")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState("")
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  const pending = reservation.totalAmount - reservation.paidAmount
  const currentIdx = QUOTE_STATUS_FLOW.indexOf(reservation.status as any)

  const changeStatus = async (newStatus: string) => {
    if (newStatus === reservation.status) { setStatusDropdownOpen(false); return }
    setChangingStatus(true)
    setStatusDropdownOpen(false)
    try {
      const res = await fetch(`/api/calendar/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const result = await res.json()
        const updated = result.data || result
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
      const res = await fetch(`/api/calendar/${reservation.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount, 
          notes: paymentNotes || undefined,
          paymentType,
          referenceNumber: referenceNumber || undefined,
        }),
      })
      if (res.ok) {
        const result = await res.json()
        const updated = result.data || result
        onUpdate({
          ...reservation,
          paidAmount: updated.paidAmount,
          pendingAmount: updated.pendingAmount,
          paymentStatus: updated.paymentStatus,
          payments: updated.payments ?? reservation.payments,
        })
        setPaymentAmount("")
        setPaymentNotes("")
        setReferenceNumber("")
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
    if (!confirm("¿Está seguro de eliminar esta cotización?")) return
    try {
      const res = await fetch(`/api/calendar/${reservation.id}`, {
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
  const isFinalised = reservation.status === "FINALIZADA"

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
          {reservation.eventTitle && (
            <p className="text-sm text-primary font-medium mt-0.5">{reservation.eventTitle}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
              <span className="text-base">{reservation.locationName}</span>
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
              {reservation.spaces?.[0]?.startTime ?? (SCHEDULE_LABELS[reservation.startSchedule as Schedule] ?? reservation.startSchedule)}
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
              {reservation.spaces?.[reservation.spaces.length - 1]?.endTime ?? (SCHEDULE_LABELS[reservation.endSchedule as Schedule] ?? reservation.endSchedule)}
            </span>
          </div>
        </div>
      </div>

      {/* Parqueo / Personas */}
      {(reservation.parkingSpot || reservation.guestCount) && (
        <div className="grid grid-cols-2 gap-3">
          {reservation.parkingSpot && (
            <div className="vm-info-block">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Parqueo</p>
              <p className="text-sm font-medium text-foreground">{formatParkingSpots(reservation.parkingSpot)}</p>
            </div>
          )}
          {reservation.guestCount && (
            <div className="vm-info-block">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Personas</p>
              <p className="text-sm font-medium text-foreground">{reservation.guestCount}</p>
            </div>
          )}
        </div>
      )}

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
                {QUOTE_STATUS_FLOW.map((s, idx) => {
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
                    <span>Eliminar Cotización</span>
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
                    {(p as any).paymentType && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          {(p as any).paymentType}
                        </Badge>
                        {(p as any).referenceNumber && (
                          <span className="text-[10px] text-muted-foreground">Ref: {(p as any).referenceNumber}</span>
                        )}
                      </div>
                    )}
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
            {reservation.status !== "CONFIRMADA" && reservation.status !== "EN_EJECUCION" ? (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                <p className="font-medium">Cotización no confirmada</p>
                <p className="text-xs mt-1">Esta cotización está en estado <strong>{getStatusLabel(reservation.status)}</strong>. Debe confirmarse primero para poder registrar pagos.</p>
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
                <div className="flex gap-2">
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                      <SelectItem value="DEPOSITO">Depósito</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="TARJETA">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="N° Referencia (opcional)"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    className="flex-1"
                  />
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

      <a href={`/quotes?id=${reservation.id}`} className="block">
        <Button type="button" variant="outline" className="w-full gap-2">
          <FileText className="w-4 h-4" /> Ver cotización completa
        </Button>
      </a>
    </div>
  )
}

// ─── componente principal ─────────────────────────────────────────────────────

export const dynamic = "force-dynamic"

function ReservationsContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateFilter = searchParams.get('date')
  
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [displayMode, setDisplayMode] = useState<"list" | "calendar">("calendar")
  const [granularity, setGranularity] = useState<"biweek" | "week" | "day">("biweek")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [formError, setFormError] = useState("")
  const [hoverCard, setHoverCard] = useState<{ res: Reservation; x: number; y: number; above: boolean } | null>(null)

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
          paymentStatus: q.paymentStatus || "SIN_PAGO",
          totalAmount: q.totalAmount || 0,
          paidAmount: q.paidAmount || 0,
          pendingAmount: (q.totalAmount || 0) - (q.paidAmount || 0),
          observations: q.notes || "",
          payments: q.payments || [],
          spaces,
          eventTitle: q.eventTitle || undefined,
          parkingSpot: q.parkingSpot || undefined,
          guestCount: q.guestCount || undefined,
        } as Reservation
      })

      const locRes = await fetch("/api/locations")
      const locData = await locRes.json()
      setLocations(Array.isArray(locData) ? locData : (locData.data || []))

      const cliRes = await fetch("/api/clients")
      const cliData = await cliRes.json()
      setClients(Array.isArray(cliData) ? cliData : (cliData.data || []))

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
    if (granularity === "biweek") {
      const d = new Date(currentDate)
      d.setDate(d.getDate() - 14)
      setCurrentDate(d)
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
    if (granularity === "biweek") {
      const d = new Date(currentDate)
      d.setDate(d.getDate() + 14)
      setCurrentDate(d)
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
      const response = await fetch("/api/calendar", {
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

  const getBiweekDays = (date: Date): Date[] => {
    const week1 = getWeekDays(date)
    const week2 = week1.map(d => {
      const n = new Date(d)
      n.setDate(n.getDate() + 7)
      return n
    })
    return [...week1, ...week2]
  }

  const getResForDay = (dayKey: string) =>
    reservations.filter(r => {
      const sk = getDateKey(parseDate(r.startDate))
      const ek = getDateKey(parseDate(r.endDate))
      return dayKey >= sk && dayKey <= ek
    })

  const availableLocations = (locations || []).filter(l => l.type === formData.locationType)

  const today = getDateKey(new Date())

  // ── hover card (posición fija, no se recorta por overflow del contenedor) ──

  const showHoverCard = (e: React.MouseEvent, res: Reservation) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const above = rect.bottom > window.innerHeight - 220
    setHoverCard({
      res,
      x: Math.min(rect.left, window.innerWidth - 280),
      y: above ? rect.top - 4 : rect.bottom + 4,
      above,
    })
  }

  // ── helpers de horario tipo Google Calendar (usados en Día, Semana y 2 Semanas) ──

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

  // Rango de horas compartido: 7:00 a 25:00 (1:00 AM del día siguiente) = 18 horas
  const TIMELINE_START = 7
  const TIMELINE_END = 25
  const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START

  // ── columna-timeline de un día (usada en Día, Semana y 2 Semanas) ───────────

  // Posición vertical en % del alto del timeline (7:00 = 0%, 1:00 del día sig. = 100%)
  const timelinePct = (hour: number) => ((hour - TIMELINE_START) / TIMELINE_HOURS) * 100

  const renderTimelineDayColumn = (dayKey: string) => {
    const dayRes = getResForDay(dayKey)
    const events = dayRes.map((res) => {
      const range = getEventTimeRange(res)
      return {
        id: res.id,
        res,
        start: Math.max(range.start, TIMELINE_START),
        end: Math.min(range.end, TIMELINE_END),
      }
    })
    const overlapGroups = computeOverlapGroups(events)
    const isToday = dayKey === today

    return (
      <div className="flex-1 relative min-w-0">
        {/* Franjas Mañana / Tarde / Noche */}
        {SCHEDULE_BANDS.map(b => {
          const bandStart = Math.max(b.start, TIMELINE_START)
          const bandEnd = Math.min(b.end, TIMELINE_END)
          if (bandEnd <= bandStart) return null
          return (
            <div
              key={b.key}
              className="absolute left-0 right-0 border-t border-border pointer-events-none"
              style={{ top: `${timelinePct(bandStart)}%`, height: `${timelinePct(bandEnd) - timelinePct(bandStart)}%`, backgroundColor: b.bg }}
            />
          )
        })}

        {/* Líneas de hora */}
        {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-border/60"
            style={{ top: `${(i / TIMELINE_HOURS) * 100}%` }}
          />
        ))}

        {/* Línea de hora actual */}
        {isToday && (() => {
          const now = new Date()
          const currentHour = now.getHours() + now.getMinutes() / 60
          if (currentHour >= TIMELINE_START && currentHour <= TIMELINE_END) {
            return (
              <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${timelinePct(currentHour)}%` }}>
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
          const top = timelinePct(ev.start)
          const height = Math.max(timelinePct(ev.end) - timelinePct(ev.start), 3)
          const overlap = overlapGroups.get(ev.id) ?? { col: 0, totalCols: 1 }
          const widthPct = 100 / overlap.totalCols
          const leftPct = overlap.col * widthPct

          const statusColor = quoteStatusColors[ev.res.status] || getStatusColor(ev.res.status)
          const time = ev.res.spaces?.[0]?.startTime
            ? `${ev.res.spaces[0].startTime} – ${ev.res.spaces[ev.res.spaces.length - 1].endTime}`
            : `${SCHEDULE_LABELS[ev.res.startSchedule as Schedule]} – ${SCHEDULE_LABELS[ev.res.endSchedule as Schedule]}`

          return (
            <div
              key={ev.id}
              className="absolute cursor-pointer rounded-md overflow-hidden border-l-[3px] transition-all duration-150 hover:shadow-md hover:z-20"
              style={{
                top: `${top}%`,
                height: `${height}%`,
                left: `calc(${leftPct}% + 2px)`,
                width: `calc(${widthPct}% - 4px)`,
                backgroundColor: `${statusColor}18`,
                borderLeftColor: statusColor,
                boxShadow: `0 1px 3px ${statusColor}30`,
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedReservation(ev.res) }}
              onMouseEnter={(e) => showHoverCard(e, ev.res)}
              onMouseLeave={() => setHoverCard(null)}
            >
              {/* Contenido agrupado arriba — nombre, título, horario y precio juntos */}
              <div className="px-1.5 py-1 flex flex-col leading-tight gap-0.5 overflow-hidden">
                <div className="text-[11px] font-bold text-foreground truncate">
                  {ev.res.client.name}
                </div>
                {ev.res.eventTitle && (
                  <div className="text-[10px] text-foreground/70 italic truncate">{ev.res.eventTitle}</div>
                )}
                <div className="text-[10px] text-muted-foreground truncate">{time}</div>
                <div className="text-[10px] font-mono font-semibold text-foreground/90 truncate">
                  {formatCurrency(ev.res.totalAmount)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── barra de tercios (Mañana/Tarde/Noche) — usada en Semana y 2 Semanas ─────
  // Cada evento ocupa su propia fila; dentro de la fila, la barra de color
  // arranca en el tercio de su horario de inicio y termina en el de su fin.

  const renderThirdsRow = (res: Reservation, rowHeight: number, fontSizeClass: string) => {
    const color = quoteStatusColors[res.status] || getStatusColor(res.status)
    const si = Math.max(SCHEDULE_ORDER.indexOf(res.startSchedule as Schedule), 0)
    const ei = Math.max(SCHEDULE_ORDER.indexOf(res.endSchedule as Schedule), 0)
    const left  = `${(si / 3) * 100}%`
    const right = `${((2 - ei) / 3) * 100}%`

    return (
      <div
        key={res.id}
        className="relative cursor-pointer"
        style={{ height: rowHeight }}
        onClick={(e) => { e.stopPropagation(); setSelectedReservation(res) }}
        onMouseEnter={(e) => showHoverCard(e, res)}
        onMouseLeave={() => setHoverCard(null)}
      >
        {/* Guías de tercios */}
        <div className="absolute inset-0 flex pointer-events-none" aria-hidden="true">
          <div className="flex-1 border-r border-border/30" />
          <div className="flex-1 border-r border-border/30" />
          <div className="flex-1" />
        </div>
        {/* Barra */}
        <div
          className="absolute top-0 bottom-0 rounded-sm border-l-[3px] overflow-hidden flex items-center transition-all duration-150 hover:shadow-md hover:z-10"
          style={{ left, right, backgroundColor: `${color}22`, borderLeftColor: color }}
        >
          <span className={cn("font-bold text-foreground truncate px-2 leading-none", fontSizeClass)}>
            {res.client.name}
          </span>
        </div>
      </div>
    )
  }

  // ── celda de día: lista de filas de tercios, scrollable si hay muchos eventos ──

  const renderGridDayCell = (dayKey: string, rowHeight: number, fontSizeClass: string) => {
    const dayRes = [...getResForDay(dayKey)].sort((a, b) =>
      (a.spaces?.[0]?.startTime || "").localeCompare(b.spaces?.[0]?.startTime || "")
    )
    return (
      <div className="p-1 h-full flex flex-col">
        <div className="overflow-y-auto space-y-0.5 pr-0.5 flex-1 min-h-0">
          {dayRes.length === 0 ? (
            <div
              className="h-full min-h-[40px] flex items-center justify-center text-sm text-muted-foreground/50 cursor-pointer"
              onClick={() => (window.location.href = "/quotes?new=true")}
            >
              Libre
            </div>
          ) : (
            dayRes.map(res => renderThirdsRow(res, rowHeight, fontSizeClass))
          )}
        </div>
      </div>
    )
  }

  // ── celda de día con chips agrupados por franja (Mañana/Tarde/Noche) — 2 Semanas ──

  const firstName = (name: string) => name.replace(/\s*\(Demo\)\s*$/i, "").trim().split(" ")[0]

  const MAX_CHIPS_PER_FRANJA = 6

  const renderFranjaChipCell = (dayKey: string) => {
    const dayRes = [...getResForDay(dayKey)].sort((a, b) =>
      (a.spaces?.[0]?.startTime || "").localeCompare(b.spaces?.[0]?.startTime || "")
    )

    // Un evento aparece en cada franja que ocupa (de su inicio a su fin)
    const byFranja: Reservation[][] = [[], [], []]
    for (const res of dayRes) {
      const si = Math.max(SCHEDULE_ORDER.indexOf(res.startSchedule as Schedule), 0)
      const ei = Math.max(SCHEDULE_ORDER.indexOf(res.endSchedule as Schedule), 0)
      for (let f = si; f <= ei; f++) byFranja[f].push(res)
    }

    return (
      <div className="flex flex-col h-full">
        {SCHEDULE_BANDS.map((band, f) => {
          const items = byFranja[f]
          const visible = items.slice(0, MAX_CHIPS_PER_FRANJA)
          const overflow = items.length - visible.length
          return (
            <div
              key={band.key}
              className={cn("flex items-start gap-1 px-1.5 py-1.5 overflow-hidden flex-1", f > 0 && "border-t border-border/40")}
              style={{ backgroundColor: band.bg, minHeight: 44 }}
            >
              <span className="text-[9px] font-bold text-muted-foreground/60 uppercase w-5 shrink-0 pt-0.5">
                {SCHEDULE_SHORT[band.key]}
              </span>
              <div className="flex flex-wrap gap-1 flex-1 min-w-0 content-start">
                {visible.map(res => {
                  const color = quoteStatusColors[res.status] || getStatusColor(res.status)
                  return (
                    <button
                      key={res.id}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full pl-1 pr-1.5 py-0.5 max-w-[88px] cursor-pointer transition-transform hover:scale-105"
                      style={{ backgroundColor: `${color}22` }}
                      onClick={(e) => { e.stopPropagation(); setSelectedReservation(res) }}
                      onMouseEnter={(e) => showHoverCard(e, res)}
                      onMouseLeave={() => setHoverCard(null)}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[10px] font-medium text-foreground truncate leading-none">
                        {firstName(res.client.name)}
                      </span>
                    </button>
                  )
                })}
                {overflow > 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 bg-muted text-[10px] font-semibold text-muted-foreground cursor-pointer hover:bg-muted-foreground/20"
                    onClick={(e) => { e.stopPropagation(); setCurrentDate(parseDate(dayKey)); setGranularity("day") }}
                    title="Ver todos los eventos del día"
                  >
                    +{overflow}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── fila de semana: encabezados de día + celdas — reusada por Semana y 2 Semanas ──

  // ── vista semanal: barras por tercios, se estira para llenar la pantalla ─────

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate)
    return (
      <div
        className="flex flex-col border border-border rounded-xl overflow-hidden"
        style={{ height: "max(560px, calc(100vh - 300px))" }}
      >
        {/* Encabezados de día */}
        <div className="grid grid-cols-7 shrink-0">
          {weekDays.map((d, i) => {
            const isT = getDateKey(d) === today
            return (
              <div key={`wk-h-${i}`} className={cn("pt-2 text-center border-b border-border", isT ? "bg-primary/10" : "bg-muted/50", i > 0 && "border-l border-border")}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{dayNames[d.getDay()]}</div>
                <div className="flex items-center justify-center mt-0.5">
                  {isT ? (
                    <span className="vm-day-today text-lg w-8 h-8">{d.getDate()}</span>
                  ) : (
                    <span className="text-lg font-medium text-foreground">{d.getDate()}</span>
                  )}
                </div>
                {/* Leyenda Mañana / Tarde / Noche alineada con los tercios */}
                <div className="grid grid-cols-3 mt-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 border-t border-border/60">
                  <span className="py-0.5 border-r border-border/40">M</span>
                  <span className="py-0.5 border-r border-border/40">T</span>
                  <span className="py-0.5">N</span>
                </div>
              </div>
            )
          })}
        </div>
        {/* Celdas — se estiran para llenar el alto disponible */}
        <div className="grid grid-cols-7 flex-1 min-h-0">
          {weekDays.map((d, i) => {
            const dayKey = getDateKey(d)
            const isT = dayKey === today
            return (
              <div key={`wk-c-${i}`} className={cn("border-t border-border min-h-0", isT && "bg-primary/[0.03]", i > 0 && "border-l border-border")}>
                {renderGridDayCell(dayKey, 22, "text-xs")}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── vista de 2 semanas: chips por franja, se estira para llenar la pantalla ──

  const renderChipWeekSection = (weekDays: Date[], keyPrefix: string, topSeparator: boolean) => (
    <div key={keyPrefix} className={cn("flex flex-col flex-1 min-h-0", topSeparator && "border-t-2 border-t-border")}>
      {/* Encabezados de día */}
      <div className="grid grid-cols-7 shrink-0">
        {weekDays.map((d, i) => {
          const isT = getDateKey(d) === today
          return (
            <div key={`${keyPrefix}-h-${i}`} className={cn("py-2.5 text-center border-b border-border", isT ? "bg-primary/10" : "bg-muted/50", i > 0 && "border-l border-border")}>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{dayNames[d.getDay()]}</div>
              <div className="flex items-center justify-center mt-0.5">
                {isT ? (
                  <span className="vm-day-today text-base w-7 h-7">{d.getDate()}</span>
                ) : (
                  <span className="text-base font-medium text-foreground">{d.getDate()}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {/* Celdas — se estiran para repartir el alto disponible */}
      <div className="grid grid-cols-7 flex-1 min-h-0">
        {weekDays.map((d, i) => {
          const dayKey = getDateKey(d)
          const isT = dayKey === today
          return (
            <div key={`${keyPrefix}-c-${i}`} className={cn("border-t border-border min-h-0", isT && "bg-primary/[0.03]", i > 0 && "border-l border-border")}>
              {renderFranjaChipCell(dayKey)}
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderBiweekView = () => {
    const allDays = getBiweekDays(currentDate)
    return (
      <div
        className="flex flex-col border border-border rounded-xl overflow-hidden"
        style={{ height: "max(560px, calc(100vh - 300px))" }}
      >
        {renderChipWeekSection(allDays.slice(0, 7), "w1", false)}
        {renderChipWeekSection(allDays.slice(7, 14), "w2", true)}
      </div>
    )
  }

  // ── vista por día ────────────────────────────────────────────────────────────

  const renderDayView = () => {
    const dayKey = getDateKey(currentDate)
    const dayCount = getResForDay(dayKey).length

    return (
      <div className="flex flex-col overflow-hidden" style={{ height: "max(560px, calc(100vh - 300px))" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground capitalize">
            {currentDate.toLocaleDateString("es-GT", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
          <span className="text-sm text-muted-foreground">
            {dayCount} evento{dayCount !== 1 ? "s" : ""}
          </span>
        </div>

        {dayCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
            <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg">Sin eventos para este día</p>
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => (window.location.href = `/quotes?new=true`)}
            >
              <Plus className="w-4 h-4" /> Cotizar
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Columna de horas */}
            <div className="relative flex-shrink-0 border-r border-border bg-muted/30" style={{ width: 56 }}>
              {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => {
                const hour = TIMELINE_START + i
                const displayHour = hour >= 24 ? hour - 24 : hour
                const ampm = hour < 12 || hour >= 24 ? "a.m." : "p.m."
                return (
                  <span
                    key={hour}
                    className="absolute right-1.5 text-[10px] text-muted-foreground"
                    style={{
                      top: `${(i / TIMELINE_HOURS) * 100}%`,
                      transform: i === 0 ? "none" : i === TIMELINE_HOURS ? "translateY(-100%)" : "translateY(-50%)",
                    }}
                  >
                    {displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour} {ampm}
                  </span>
                )
              })}
            </div>

            {renderTimelineDayColumn(dayKey)}
          </div>
        )}
      </div>
    )
  }

  // ── vista de lista ────────────────────────────────────────────────────────

  const renderListView = () => {
    // Filter reservations to the current period
    let filtered: Reservation[]
    
    // Si hay un filtro de fecha específico (desde dashboard), usarlo
    if (dateFilter) {
      filtered = reservations.filter(r => {
        const s = getDateKey(parseDate(r.startDate))
        const e = getDateKey(parseDate(r.endDate))
        return s <= dateFilter && e >= dateFilter
      })
    } else if (granularity === "day") {
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
      const biweekDays = getBiweekDays(currentDate)
      const biweekStart = getDateKey(biweekDays[0])
      const biweekEnd   = getDateKey(biweekDays[13])
      filtered = reservations.filter(r => {
        const s = getDateKey(parseDate(r.startDate))
        const e = getDateKey(parseDate(r.endDate))
        return s <= biweekEnd && e >= biweekStart
      })
    }

    const sorted = [...filtered].sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ubicación</th>
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fechas</th>
              <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
              <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
              <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pagado</th>
              <th className="text-right p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <CalendarDays className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No hay eventos para este período</p>
                </td>
              </tr>
            ) : (
              sorted.map(res => {
                const pend = res.totalAmount - res.paidAmount
                return (
                  <tr
                    key={res.id}
                    className="vm-table-row"
                  onClick={(e) => { e.stopPropagation(); router.push(`/quotes?id=${res.id}`) }}
                  >
                    <td className="p-3 font-medium text-foreground max-w-[160px] truncate" title={res.client.name}>{res.client.name}</td>
                    <td className="p-3 text-muted-foreground">{res.locationName}</td>
                    <td className="p-3 text-muted-foreground text-sm">
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
    if (granularity === "day") {
      return currentDate.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    }
    const range = granularity === "biweek" ? getBiweekDays(currentDate) : getWeekDays(currentDate)
    const first = range[0]
    const last  = range[range.length - 1]
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
            Calendario de Eventos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administra los eventos y cotizaciones
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/menu.pdf" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Ver Menú</span>
            </Button>
          </a>
          <a href="/quotes?new=true">
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
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} data-testid="today-button" className="h-8 rounded-lg shrink-0 ml-1">
              Hoy
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
            {/* 2 Semanas / Semana / Día */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(["biweek", "week", "day"] as const).map(g => (
                <button
                  key={g}
                  className={cn(
                    "vm-view-switch",
                    granularity === g ? "vm-view-switch--active" : "vm-view-switch--idle"
                  )}
                  onClick={() => setGranularity(g)}
                >
                  {g === "biweek" ? "2 Semanas" : g === "week" ? "Semana" : "Día"}
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
              <div className={cn("w-full p-4", !(displayMode === "calendar" && granularity === "biweek") && "hidden")}>
                {renderBiweekView()}
              </div>
              <div className={cn("w-full p-4", !(displayMode === "calendar" && granularity === "week") && "hidden")}>
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

      {/* ── Dialog: Detalle de Cotización ───────────────────────────────────── */}
      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Cotización</DialogTitle>
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

      {/* ── Hover card: detalle rápido al pasar el mouse sobre un evento ────── */}
      {hoverCard && (
        <div
          className="fixed z-[100] w-64 rounded-lg border border-border bg-popover shadow-xl p-3 text-xs space-y-1.5 pointer-events-none"
          style={{ left: hoverCard.x, top: hoverCard.y, transform: hoverCard.above ? "translateY(-100%)" : undefined }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm text-foreground truncate">{hoverCard.res.client.name}</span>
            <span
              className="vm-status-badge text-[9px] shrink-0"
              style={{ backgroundColor: quoteStatusColors[hoverCard.res.status] || getStatusColor(hoverCard.res.status), color: "#fff" }}
            >
              {quoteStatusLabels[hoverCard.res.status] || getStatusLabel(hoverCard.res.status)}
            </span>
          </div>
          {hoverCard.res.eventTitle && (
            <p className="text-primary font-medium">{hoverCard.res.eventTitle}</p>
          )}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 border-t border-border text-foreground/90">
            <div>
              <span className="text-muted-foreground">Horario: </span>
              {hoverCard.res.spaces?.[0]?.startTime
                ? `${hoverCard.res.spaces[0].startTime} – ${hoverCard.res.spaces[hoverCard.res.spaces.length - 1].endTime}`
                : `${SCHEDULE_LABELS[hoverCard.res.startSchedule as Schedule]} – ${SCHEDULE_LABELS[hoverCard.res.endSchedule as Schedule]}`}
            </div>
            <div className="truncate">
              <span className="text-muted-foreground">Salón: </span>
              {hoverCard.res.locationName}
            </div>
            {hoverCard.res.parkingSpot && (
              <div>
                <span className="text-muted-foreground">Parqueo: </span>
                {formatParkingSpots(hoverCard.res.parkingSpot)}
              </div>
            )}
            {hoverCard.res.guestCount && (
              <div>
                <span className="text-muted-foreground">Personas: </span>
                {hoverCard.res.guestCount}
              </div>
            )}
          </div>
          <div className="pt-1.5 border-t border-border font-mono font-semibold text-foreground">
            {formatCurrency(hoverCard.res.totalAmount)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <ReservationsContent />
    </Suspense>
  )
}
