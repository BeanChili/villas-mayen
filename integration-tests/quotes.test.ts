import { describe, it, expect, beforeEach } from "vitest"
import { POST } from "@/app/api/quotes/route"
import { PATCH as patchStatus } from "@/app/api/quotes/[id]/status/route"
import { POST as postPayment } from "@/app/api/quotes/[id]/payments/route"
import {
  mockSession,
  jsonRequest,
  truncateAll,
  createTestClient,
  createTestLocation,
  createTestQuote,
  prisma,
} from "./helpers"

beforeEach(async () => {
  await truncateAll()
})

async function crearCotizacionPorApi(clientId: string, locationId: string) {
  const res = await POST(
    jsonRequest("POST", "/api/quotes", {
      clientId,
      eventDate: "2026-12-20",
      spaces: [
        {
          locationType: "HALL",
          locationId,
          locationName: "Salon Jade",
          startTime: "10:00",
          endTime: "18:00",
          pricingMode: "PER_SPACE",
          unitPrice: 5000,
        },
      ],
      items: [
        {
          name: "Menu 1",
          category: "COMIDA_MENU",
          unitPrice: 100,
          dailyQuantities: [{ date: "2026-12-20", quantity: 10 }],
        },
      ],
    })
  )
  return res
}

describe("api/quotes", () => {
  it("RECEPCIONISTA crea una cotizacion con totales calculados en el server", async () => {
    const cliente = await createTestClient()
    const ubicacion = await createTestLocation()
    mockSession("RECEPCIONISTA")

    const res = await crearCotizacionPorApi(cliente.id, ubicacion.id)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.status).toBe("BORRADOR")
    // 5000 del salon + 10 x 100 del menu
    expect(body.data.subtotal).toBe(6000)
    expect(body.data.totalAmount).toBe(6000)
    expect(body.data.spaces).toHaveLength(1)
  })

  it("VISUAL no puede crear cotizaciones (403)", async () => {
    const cliente = await createTestClient()
    mockSession("VISUAL")
    const res = await POST(
      jsonRequest("POST", "/api/quotes", {
        clientId: cliente.id,
        eventDate: "2026-12-20",
        spaces: [{ locationType: "HALL", locationName: "X", unitPrice: 1 }],
      })
    )
    expect(res.status).toBe(403)
  })

  it("crear sin spaces devuelve 400", async () => {
    const cliente = await createTestClient()
    mockSession("ADMIN")
    const res = await POST(
      jsonRequest("POST", "/api/quotes", {
        clientId: cliente.id,
        eventDate: "2026-12-20",
        spaces: [],
      })
    )
    expect(res.status).toBe(400)
  })

  it("USD sin tipo de cambio devuelve 400", async () => {
    const cliente = await createTestClient()
    mockSession("ADMIN")
    const res = await POST(
      jsonRequest("POST", "/api/quotes", {
        clientId: cliente.id,
        eventDate: "2026-12-20",
        currency: "USD",
        spaces: [{ locationType: "HALL", locationName: "X", unitPrice: 1 }],
      })
    )
    expect(res.status).toBe(400)
  })
})

describe("api/quotes/[id]/status", () => {
  it("BORRADOR pasa a ENVIADA y registra sentAt", async () => {
    const cliente = await createTestClient()
    const quote = await createTestQuote(cliente.id)
    mockSession("RECEPCIONISTA")

    const res = await patchStatus(
      jsonRequest("PATCH", `/api/quotes/${quote.id}/status`, { status: "ENVIADA" }),
      { params: { id: quote.id } }
    )
    expect(res.status).toBe(200)
    const actualizada = await prisma.quote.findUnique({ where: { id: quote.id } })
    expect(actualizada?.status).toBe("ENVIADA")
    expect(actualizada?.sentAt).not.toBeNull()
  })

  it("una transicion invalida devuelve 400", async () => {
    const cliente = await createTestClient()
    const quote = await createTestQuote(cliente.id, { status: "BORRADOR" })
    mockSession("ADMIN")

    const res = await patchStatus(
      jsonRequest("PATCH", `/api/quotes/${quote.id}/status`, { status: "FINALIZADA" }),
      { params: { id: quote.id } }
    )
    expect(res.status).toBe(400)
    const sinCambios = await prisma.quote.findUnique({ where: { id: quote.id } })
    expect(sinCambios?.status).toBe("BORRADOR")
  })

  it("cotizacion inexistente devuelve 404", async () => {
    mockSession("ADMIN")
    const res = await patchStatus(
      jsonRequest("PATCH", "/api/quotes/nope/status", { status: "ENVIADA" }),
      { params: { id: "nope" } }
    )
    expect(res.status).toBe(404)
  })
})

describe("api/quotes/[id]/payments", () => {
  it("registra un pago parcial y actualiza los acumulados", async () => {
    const cliente = await createTestClient()
    const quote = await createTestQuote(cliente.id, {
      status: "CONFIRMADA",
      totalAmount: 1000,
      pendingAmount: 1000,
    })
    mockSession("RECEPCIONISTA")

    const res = await postPayment(
      jsonRequest("POST", `/api/quotes/${quote.id}/payments`, { amount: 400 }),
      { params: { id: quote.id } }
    )
    expect(res.status).toBe(200)
    const actualizada = await prisma.quote.findUnique({
      where: { id: quote.id },
      include: { payments: true },
    })
    expect(actualizada?.paidAmount).toBe(400)
    expect(actualizada?.pendingAmount).toBe(600)
    expect(actualizada?.paymentStatus).toBe("PARCIAL")
    expect(actualizada?.payments).toHaveLength(1)
  })

  it("no permite pagar mas que el pendiente", async () => {
    const cliente = await createTestClient()
    const quote = await createTestQuote(cliente.id, {
      status: "CONFIRMADA",
      totalAmount: 1000,
      pendingAmount: 100,
      paidAmount: 900,
    })
    mockSession("ADMIN")

    const res = await postPayment(
      jsonRequest("POST", `/api/quotes/${quote.id}/payments`, { amount: 500 }),
      { params: { id: quote.id } }
    )
    expect(res.status).toBe(400)
  })
})
