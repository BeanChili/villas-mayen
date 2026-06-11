"use client"

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"

// ─── columnas de la tabla ──────────────────────────────────────────────────
const CODE_FLEX = 0.6
const QTY_FLEX = 0.7
const DESC_FLEX = 2.4
const DAY_FLEX = 0.95
const PRICE_FLEX = 1
const TOTAL_FLEX = 1

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottom: 1,
    borderBottomColor: "#000",
    paddingBottom: 10,
  },
  headerLeft: {
    width: "60%",
  },
  headerRight: {
    width: "35%",
    border: 1,
    borderColor: "#7C6FCD",
    borderRadius: 6,
    padding: 8,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 4,
  },
  companyInfo: {
    fontSize: 8,
    color: "#333",
    lineHeight: 1.4,
  },
  quoteInfo: {
    fontSize: 9,
    lineHeight: 1.6,
  },
  quoteInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontWeight: "bold",
  },
  section: {
    marginBottom: 12,
    border: 1,
    borderColor: "#7C6FCD",
    borderRadius: 6,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    backgroundColor: "#E8F5E9",
    padding: 4,
  },
  clientRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  clientLabel: {
    width: 80,
    fontWeight: "bold",
  },
  clientValue: {
    flex: 1,
  },
  serviceBox: {
    width: "40%",
    marginLeft: 10,
    border: 1,
    borderColor: "#7C6FCD",
    borderRadius: 6,
    padding: 8,
    alignSelf: "flex-start",
  },
  serviceLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  serviceValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  banner: {
    backgroundColor: "#2E7D32",
    borderRadius: 4,
    padding: 6,
    marginBottom: 0,
  },
  bannerText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 9,
    textAlign: "center",
  },
  table: {
    width: "100%",
    border: 1,
    borderColor: "#000",
    borderTopWidth: 0,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#D6CFF5",
    borderBottom: 1,
    borderBottomColor: "#000",
    fontWeight: "bold",
    fontSize: 8,
    minHeight: 32,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#ccc",
    fontSize: 9,
    minHeight: 22,
  },
  cell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#ccc",
    justifyContent: "center",
  },
  cellLast: {
    padding: 4,
    justifyContent: "center",
  },
  cellCenter: {
    textAlign: "center",
  },
  cellRight: {
    textAlign: "right",
  },
  daysGroup: {
    flexDirection: "column",
    borderRightWidth: 1,
    borderRightColor: "#ccc",
  },
  daysGroupHeader: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 4,
    minHeight: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  daysGroupRow: {
    flexDirection: "row",
    flex: 1,
  },
  dayHeaderCell: {
    flex: 1,
    fontSize: 7,
    textAlign: "center",
    paddingVertical: 4,
    minHeight: 16,
    borderRightWidth: 1,
    borderRightColor: "#ccc",
    justifyContent: "center",
  },
  dayHeaderCellLast: {
    flex: 1,
    fontSize: 7,
    textAlign: "center",
    paddingVertical: 4,
    minHeight: 16,
    justifyContent: "center",
  },
  dayCell: {
    flex: 1,
    fontSize: 8,
    textAlign: "center",
    padding: 3,
    borderRightWidth: 1,
    borderRightColor: "#ccc",
    justifyContent: "center",
  },
  dayCellLast: {
    flex: 1,
    fontSize: 8,
    textAlign: "center",
    padding: 3,
    justifyContent: "center",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#F0EBFB",
    borderTopWidth: 2,
    borderTopColor: "#000",
  },
  totalLabelCell: {
    padding: 6,
    textAlign: "right",
    fontWeight: "bold",
    fontSize: 11,
    borderRightWidth: 1,
    borderRightColor: "#ccc",
  },
  totalValueCell: {
    padding: 6,
    textAlign: "right",
    fontWeight: "bold",
    fontSize: 11,
  },
  observations: {
    marginTop: 15,
    border: 1,
    borderColor: "#000",
    padding: 8,
    minHeight: 60,
  },
  observationsTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  paymentTerms: {
    marginTop: 15,
    fontSize: 9,
    lineHeight: 1.5,
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "45%",
    borderTop: 1,
    borderTopColor: "#000",
    paddingTop: 8,
    marginTop: 40,
  },
  signatureLabel: {
    fontSize: 9,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 8,
    textAlign: "center",
    color: "#666",
  },
})

interface QuotePDFProps {
  quote: {
    id: string
    client: { name: string; email?: string; phone?: string; address?: string }
    eventDate: string
    endDate?: string
    currency: string
    totalAmount: number
    subtotal?: number
    discountType?: string
    discountValue?: number
    notes?: string
    eventTitle?: string
    parkingSpot?: string
    guestCount?: number
    spaces?: Array<{
      locationName: string
      startTime: string
      endTime: string
      unitPrice: number
      totalPrice: number
      adjustmentType?: string
    }>
    items?: Array<{
      name: string
      dailyQuantities?: Array<{ date: string; quantity: number }>
      unitPrice: number
      category: string
      menuNumber?: number
      guestType?: string
      discountType?: string
      discountValue?: number
      adjustmentType?: string
    }>
  }
}

// ─── helpers de fechas ──────────────────────────────────────────────────────

function dateKey(iso: string): string {
  return iso.split("T")[0]
}

function getEventDateRange(eventDate: string, endDate?: string): string[] {
  const startKey = dateKey(eventDate)
  const endKey = endDate ? dateKey(endDate) : startKey
  const dates: string[] = []
  const current = new Date(startKey + "T12:00:00")
  const last = new Date(endKey + "T12:00:00")
  while (current <= last) {
    dates.push(current.toISOString().split("T")[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function dayLabel(key: string): string {
  const date = new Date(key + "T12:00:00")
  const label = date.toLocaleDateString("es-GT", { weekday: "long" })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function QuotePDF({ quote }: QuotePDFProps) {
  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === "USD" ? "$" : "Q"
    return `${symbol} ${amount.toFixed(2)}`
  }

  const formatPriceOrFree = (amount: number, currency: string) => {
    return amount === 0 ? "GRATIS" : formatCurrency(amount, currency)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-GT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const quoteNumber = `VM-${quote.id.slice(-6).toUpperCase()}`
  const validityDate = new Date(quote.eventDate)
  validityDate.setDate(validityDate.getDate() + 15)

  const eventDates = getEventDateRange(quote.eventDate, quote.endDate)
  const daysFlexTotal = DAY_FLEX * eventDates.length

  // Agrupar habitaciones por nombre base y horario
  const groupedSpaces: Array<{ name: string; startTime: string; endTime: string; unitPrice: number; totalPrice: number; count: number }> = []
  const getBaseName = (locName: string) => {
    const name = locName.trim()
    const numMatch = name.match(/(\d+)$/)
    return numMatch ? name.substring(0, name.length - numMatch[0].length).trim() || "Hab" : name
  }
  let cg: typeof groupedSpaces[0] | null = null
  for (const space of (quote.spaces || [])) {
    const base = getBaseName(space.locationName)
    if (cg && cg.name === base && space.startTime === cg.startTime && space.endTime === cg.endTime) {
      cg.totalPrice += space.totalPrice
      cg.count++
    } else {
      if (cg) groupedSpaces.push(cg)
      cg = { name: base, startTime: space.startTime, endTime: space.endTime, unitPrice: space.unitPrice, totalPrice: space.totalPrice, count: 1 }
    }
  }
  if (cg) groupedSpaces.push(cg)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image src="/logo.png" style={{ width: 60, height: 60, marginBottom: 8 }} />
            <Text style={styles.companyName}>CASA VILLAS MAYEN</Text>
            <Text style={styles.companyInfo}>10 Calle 28-00 Zona 4, El Naranjo</Text>
            <Text style={styles.companyInfo}>Mixco, Guatemala</Text>
            <Text style={styles.companyInfo}>Tel. (502) 2434-3375, 5580-0340</Text>
            <Text style={styles.companyInfo}>villas.mayen@gmail.com</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.quoteInfoRow}>
              <Text style={styles.label}>FECHA:</Text>
              <Text>{formatDate(quote.eventDate)}</Text>
            </View>
            <View style={styles.quoteInfoRow}>
              <Text style={styles.label}>Cotización No.</Text>
              <Text style={{ color: "#FF6F00" }}>{quoteNumber}</Text>
            </View>
            <View style={styles.quoteInfoRow}>
              <Text style={styles.label}>Forma de Pago:</Text>
              <Text>***</Text>
            </View>
            <View style={styles.quoteInfoRow}>
              <Text style={styles.label}>VALIDEZ:</Text>
              <Text>{formatDate(validityDate.toISOString())}</Text>
            </View>
          </View>
        </View>

        {/* Client Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATOS DE CLIENTE</Text>
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 2 }}>
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Cliente:</Text>
                <Text style={styles.clientValue}>{quote.client.name}</Text>
              </View>
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>NIT:</Text>
                <Text style={styles.clientValue}></Text>
              </View>
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Atención a:</Text>
                <Text style={styles.clientValue}></Text>
              </View>
              <View style={styles.clientRow}>
                <Text style={styles.clientLabel}>Dirección:</Text>
                <Text style={styles.clientValue}>{quote.client.address || ""}</Text>
              </View>
            </View>
            <View style={styles.serviceBox}>
              <Text style={styles.serviceLabel}>Servicio:</Text>
              <Text style={styles.serviceValue}>{(quote.eventTitle || "SERVICIOS").toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Con el fin de poder servirle, a continuación detallo la cotización solicitada:</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.cellCenter, { flex: CODE_FLEX }]}>Código</Text>
            <Text style={[styles.cell, styles.cellCenter, { flex: QTY_FLEX }]}>Cantidad</Text>
            <Text style={[styles.cell, { flex: DESC_FLEX }]}>Descripción</Text>
            <View style={[styles.daysGroup, { flex: daysFlexTotal }]}>
              <Text style={styles.daysGroupHeader}>DÍAS / CANTIDAD DE PERSONAS</Text>
              <View style={styles.daysGroupRow}>
                {eventDates.map((d, i) => (
                  <Text key={d} style={i === eventDates.length - 1 ? styles.dayHeaderCellLast : styles.dayHeaderCell}>
                    {dayLabel(d)}
                  </Text>
                ))}
              </View>
            </View>
            <Text style={[styles.cell, styles.cellCenter, { flex: PRICE_FLEX }]}>Precio Unitario</Text>
            <Text style={[styles.cellLast, styles.cellRight, { flex: TOTAL_FLEX }]}>Total</Text>
          </View>

          {/* Espacios (salones, habitaciones) reservados durante todo el evento */}
          {groupedSpaces.map((g, idx) => (
            <View key={`space-${idx}`} style={styles.tableRow}>
              <Text style={[styles.cell, styles.cellCenter, { flex: CODE_FLEX }]}></Text>
              <Text style={[styles.cell, styles.cellCenter, { flex: QTY_FLEX }]}>{g.count > 1 ? g.count : ""}</Text>
              <Text style={[styles.cell, { flex: DESC_FLEX }]}>
                {g.name}{g.count > 1 ? ` (${g.count} habitaciones)` : ''} ({g.startTime} - {g.endTime})
              </Text>
              <View style={[styles.daysGroup, { flex: daysFlexTotal, flexDirection: "row" }]}>
                {eventDates.map((d, i) => (
                  <Text key={d} style={i === eventDates.length - 1 ? styles.dayCellLast : styles.dayCell}>
                    X
                  </Text>
                ))}
              </View>
              <Text style={[styles.cell, styles.cellCenter, { flex: PRICE_FLEX }]}>{formatCurrency(g.unitPrice, quote.currency)}</Text>
              <Text style={[styles.cellLast, styles.cellRight, { flex: TOTAL_FLEX }]}>{formatCurrency(g.totalPrice, quote.currency)}</Text>
            </View>
          ))}

          {/* Items con cantidades por día */}
          {(quote.items || []).map((item, idx) => {
            const totalQty = item.dailyQuantities?.reduce((sum, dq) => sum + dq.quantity, 0) || 0
            const itemTotal = totalQty * item.unitPrice
            const discount = item.discountType === "PERCENT"
              ? itemTotal * ((item.discountValue || 0) / 100)
              : (item.discountValue || 0)
            const finalTotal = item.adjustmentType === "SURCHARGE"
              ? itemTotal + discount
              : itemTotal - discount

            return (
              <View key={`item-${idx}`} style={styles.tableRow}>
                <Text style={[styles.cell, styles.cellCenter, { flex: CODE_FLEX }]}></Text>
                <Text style={[styles.cell, styles.cellCenter, { flex: QTY_FLEX }]}>{totalQty || ""}</Text>
                <Text style={[styles.cell, { flex: DESC_FLEX }]}>
                  {item.name}
                  {item.menuNumber ? ` (Menú ${item.menuNumber})` : ''}
                  {item.guestType ? ` - ${item.guestType}` : ''}
                </Text>
                <View style={[styles.daysGroup, { flex: daysFlexTotal, flexDirection: "row" }]}>
                  {eventDates.map((d, i) => {
                    const dq = item.dailyQuantities?.find(x => dateKey(x.date) === d)
                    return (
                      <Text key={d} style={i === eventDates.length - 1 ? styles.dayCellLast : styles.dayCell}>
                        {dq && dq.quantity > 0 ? dq.quantity : ""}
                      </Text>
                    )
                  })}
                </View>
                <Text style={[styles.cell, styles.cellCenter, { flex: PRICE_FLEX }]}>{formatPriceOrFree(item.unitPrice, quote.currency)}</Text>
                <Text style={[styles.cellLast, styles.cellRight, { flex: TOTAL_FLEX }]}>{formatPriceOrFree(finalTotal, quote.currency)}</Text>
              </View>
            )
          })}

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabelCell, { flex: CODE_FLEX + QTY_FLEX + DESC_FLEX + daysFlexTotal + PRICE_FLEX }]}>TOTAL</Text>
            <Text style={[styles.totalValueCell, { flex: TOTAL_FLEX }]}>{formatCurrency(quote.totalAmount, quote.currency)}</Text>
          </View>
        </View>

        {/* Observations */}
        <View style={styles.observations}>
          <Text style={styles.observationsTitle}>Observaciones:</Text>
          <Text>{quote.notes || ""}</Text>
        </View>

        {/* Payment Terms */}
        <View style={styles.paymentTerms}>
          <Text>Forma de Pago: Tarjeta de Crédito, Cheque o Transferencia.</Text>
          <Text>Plazo de Crédito: 15 días</Text>
          <Text style={{ color: "#D32F2F", marginTop: 5, fontWeight: "bold" }}>
            **PRECIOS CON IVA INCLUIDO**
          </Text>
          <Text style={{ color: "#1976D2", marginTop: 5 }}>
            Emitir cheque a Nombre de: Casa Villas Mayen, S.A. o Transferencia a Banco Industrial, Cuenta Monetaria No. 105-011028-5
          </Text>
        </View>

        {/* Signature */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Vendedor:</Text>
            <Text style={styles.signatureLabel}>Olga Argentina Herrera Campos</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Nombre:</Text>
            <Text style={styles.signatureLabel}>Firma</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Casa Villas Mayen - Cotización {quoteNumber}</Text>
        </View>
      </Page>
    </Document>
  )
}
