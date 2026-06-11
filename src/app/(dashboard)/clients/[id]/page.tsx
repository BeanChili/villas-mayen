import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/db"
import Link from "next/link"
import { formatCurrencyByCode, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      quotes: {
        orderBy: { eventDate: "desc" },
        take: 20,
        include: {
          spaces: true,
          items: true,
          payments: true,
        },
      },
      _count: { select: { quotes: true } },
    },
  })

  if (!client) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Cliente no encontrado</h1>
        <Link href="/clients" className="text-primary underline mt-4 block">Volver a clientes</Link>
      </div>
    )
  }

  const totalQuotes = client._count.quotes
  const totalSpent = client.quotes.reduce((sum, q) => sum + q.totalAmount, 0)
  const lastQuote = client.quotes[0]

  return (
    <main className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/clients" className="text-sm text-muted-foreground hover:text-foreground">&larr; Clientes</Link>
        <h1 className="font-display text-2xl sm:text-3xl text-foreground tracking-tight">{client.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</p>
            <p className="text-xl font-bold mt-1">{client.clientType}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Cotizaciones</p>
            <p className="text-xl font-bold mt-1">{totalQuotes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold mt-1">{formatCurrencyByCode(totalSpent, "GTQ")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-lg">Información de Contacto</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {client.phone && <p><span className="text-muted-foreground">Teléfono:</span> {client.phone}</p>}
            {client.email && <p><span className="text-muted-foreground">Email:</span> {client.email}</p>}
            {client.address && <p><span className="text-muted-foreground">Dirección:</span> {client.address}</p>}
            {client.rfc && <p><span className="text-muted-foreground">RFC/NIT:</span> {client.rfc}</p>}
            {client.observations && <p><span className="text-muted-foreground">Observaciones:</span> {client.observations}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Última Cotización</CardTitle></CardHeader>
          <CardContent>
            {lastQuote ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Fecha:</span> {formatDate(lastQuote.eventDate)}</p>
                <p><span className="text-muted-foreground">Estado:</span> <Badge variant={lastQuote.status === "CONFIRMADA" ? "default" : "secondary"}>{lastQuote.status}</Badge></p>
                <p><span className="text-muted-foreground">Total:</span> <span className="font-mono font-semibold">{formatCurrencyByCode(lastQuote.totalAmount, lastQuote.currency)}</span></p>
                {lastQuote.eventTitle && <p><span className="text-muted-foreground">Evento:</span> {lastQuote.eventTitle}</p>}
                <Link href={`/quotes?client=${client.id}`} className="text-primary text-xs hover:underline block mt-2">Ver todas las cotizaciones &rarr;</Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin cotizaciones registradas</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Historial de Cotizaciones</CardTitle></CardHeader>
        <CardContent>
          {client.quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay cotizaciones para este cliente</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-muted-foreground font-medium">Fecha</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Evento</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Estado</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {client.quotes.map(quote => (
                  <tr key={quote.id} className="border-b hover:bg-muted/50">
                    <td className="p-3"><Link href={`/quotes?id=${quote.id}&client=${client.id}`} className="text-primary hover:underline">{formatDate(quote.eventDate)}</Link></td>
                    <td className="p-3">{quote.eventTitle || quote.spaces?.[0]?.locationName || "-"}</td>
                    <td className="p-3"><Badge variant="secondary">{quote.status}</Badge></td>
                    <td className="p-3 text-right font-mono">{formatCurrencyByCode(quote.totalAmount, quote.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
