"use client"

import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer"

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
    marginBottom: 20,
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
    borderColor: "#000",
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
    marginBottom: 15,
    border: 1,
    borderColor: "#000",
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
    width: 120,
    fontWeight: "bold",
  },
  clientValue: {
    flex: 1,
  },
  table: {
    width: "100%",
    border: 1,
    borderColor: "#000",
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#90CAF9",
    borderBottom: 1,
    borderBottomColor: "#000",
    padding: 6,
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: 1,
    borderBottomColor: "#ccc",
    padding: 6,
    fontSize: 9,
  },
  tableCell: {
    flex: 1,
    paddingRight: 4,
  },
  tableCellRight: {
    flex: 1,
    textAlign: "right",
    paddingRight: 4,
  },
  tableCellCenter: {
    flex: 1,
    textAlign: "center",
    paddingRight: 4,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    borderTop: 2,
    borderTopColor: "#000",
    paddingTop: 8,
  },
  totalLabel: {
    fontWeight: "bold",
    fontSize: 12,
    marginRight: 20,
  },
  totalValue: {
    fontWeight: "bold",
    fontSize: 12,
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
    spaces?: Array<{
      locationName: string
      startTime: string
      endTime: string
      unitPrice: number
      totalPrice: number
    }>
    items?: Array<{
      name: string
      quantity: number
      unitPrice: number
      totalPrice: number
      category: string
    }>
  }
}

export default function QuotePDF({ quote }: QuotePDFProps) {
  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === "USD" ? "$" : "Q"
    return `${symbol} ${amount.toFixed(2)}`
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
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

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Descripción</Text>
            <Text style={styles.tableCellCenter}>Cant.</Text>
            <Text style={styles.tableCellRight}>Precio Unit.</Text>
            <Text style={styles.tableCellRight}>Total</Text>
          </View>

          {/* Spaces */}
          {(quote.spaces || []).map((space, idx) => (
            <View key={`space-${idx}`} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {space.locationName} ({space.startTime} - {space.endTime})
              </Text>
              <Text style={styles.tableCellCenter}>1</Text>
              <Text style={styles.tableCellRight}>{formatCurrency(space.unitPrice, quote.currency)}</Text>
              <Text style={styles.tableCellRight}>{formatCurrency(space.totalPrice, quote.currency)}</Text>
            </View>
          ))}

          {/* Items */}
          {(quote.items || []).map((item, idx) => (
            <View key={`item-${idx}`} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{item.name}</Text>
              <Text style={styles.tableCellCenter}>{item.quantity}</Text>
              <Text style={styles.tableCellRight}>{formatCurrency(item.unitPrice, quote.currency)}</Text>
              <Text style={styles.tableCellRight}>{formatCurrency(item.totalPrice, quote.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>TOTAL:</Text>
          <Text style={styles.totalValue}>{formatCurrency(quote.totalAmount, quote.currency)}</Text>
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
            Emitir cheque a Nombre de: Casa Villas Mayen, S.A. o Transferencia a Cta. Monetaria No. 105-011028-5
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
