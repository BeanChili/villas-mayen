import { describe, it, expect, beforeEach } from "vitest"
import { POST as postDailyClosing } from "@/app/api/closings/route"
import { POST as postEventClosing } from "@/app/api/event-closings/route"
import { GET as getExchangeRate, POST as postExchangeRate } from "@/app/api/exchange-rate/route"
import {
  mockSession,
  jsonRequest,
  getRequest,
  truncateAll,
  createTestClient,
  createTestQuote,
  prisma,
} from "./helpers"

beforeEach(async () => {
  await truncateAll()
})

describe("api/closings (cierres diarios)", () => {
  it("ENCARGADO_EVENTO crea el cierre del dia y el duplicado da 409", async () => {
    await mockSession("ENCARGADO_EVENTO", { name: "Encargado" })
    const res = await postDailyClosing(
      jsonRequest("POST", "/api/closings", { date: "2026-07-01" })
    )
    expect(res.status).toBe(201)

    const dup = await postDailyClosing(
      jsonRequest("POST", "/api/closings", { date: "2026-07-01" })
    )
    expect(dup.status).toBe(409)
  })

  it("VISUAL no puede crear cierres (403)", async () => {
    await mockSession("VISUAL")
    const res = await postDailyClosing(
      jsonRequest("POST", "/api/closings", { date: "2026-07-02" })
    )
    expect(res.status).toBe(403)
  })
})

describe("api/event-closings (liquidacion)", () => {
  it("solo se liquida una cotizacion EN_EJECUCION o FINALIZADA", async () => {
    const cliente = await createTestClient()
    await mockSession("ENCARGADO_EVENTO", { name: "Encargado" })

    // Ni BORRADOR ni CONFIRMADA se pueden liquidar
    for (const status of ["BORRADOR", "CONFIRMADA"]) {
      const quote = await createTestQuote(cliente.id, { status })
      const rechazado = await postEventClosing(
        jsonRequest("POST", "/api/event-closings", {
          quoteId: quote.id,
          returnStatus: "COMPLETO",
        })
      )
      expect(rechazado.status).toBe(400)
    }

    const enEjecucion = await createTestQuote(cliente.id, { status: "EN_EJECUCION" })
    const ok = await postEventClosing(
      jsonRequest("POST", "/api/event-closings", {
        quoteId: enEjecucion.id,
        returnStatus: "COMPLETO",
        observations: "Sin novedades",
      })
    )
    expect(ok.status).toBe(201)
    expect(await prisma.eventClosing.count()).toBe(1)
  })

  it("no se puede liquidar dos veces la misma cotizacion (409)", async () => {
    const cliente = await createTestClient()
    const quote = await createTestQuote(cliente.id, { status: "EN_EJECUCION" })
    await mockSession("ADMIN", { name: "Admin" })

    const primero = await postEventClosing(
      jsonRequest("POST", "/api/event-closings", { quoteId: quote.id, returnStatus: "COMPLETO" })
    )
    expect(primero.status).toBe(201)

    const segundo = await postEventClosing(
      jsonRequest("POST", "/api/event-closings", { quoteId: quote.id, returnStatus: "COMPLETO" })
    )
    expect(segundo.status).toBe(409)
  })

  it("FINANZAS no puede liquidar (403)", async () => {
    const cliente = await createTestClient()
    const quote = await createTestQuote(cliente.id, { status: "CONFIRMADA" })
    await mockSession("FINANZAS")
    const res = await postEventClosing(
      jsonRequest("POST", "/api/event-closings", { quoteId: quote.id, returnStatus: "COMPLETO" })
    )
    expect(res.status).toBe(403)
  })
})

describe("api/exchange-rate", () => {
  it("GET devuelve la tasa mas reciente", async () => {
    await prisma.exchangeRate.create({
      data: { fromCurrency: "USD", toCurrency: "GTQ", rate: 7.85, updatedBy: "seed" },
    })
    await mockSession("VISUAL")
    const res = await getExchangeRate(getRequest("/api/exchange-rate"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.rate).toBe(7.85)
  })

  it("POST valida la tasa", async () => {
    await mockSession("ADMIN", { name: "Admin" })
    const invalida = await postExchangeRate(
      jsonRequest("POST", "/api/exchange-rate", { rate: -1 })
    )
    expect(invalida.status).toBe(400)

    const ok = await postExchangeRate(
      jsonRequest("POST", "/api/exchange-rate", { rate: 8.1 })
    )
    expect(ok.status).toBe(201)
  })
})
