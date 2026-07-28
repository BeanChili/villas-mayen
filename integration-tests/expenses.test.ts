import { describe, it, expect, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/expenses/route"
import { PUT, DELETE } from "@/app/api/expenses/[id]/route"
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

const gastoBase = {
  date: "2026-07-01",
  category: "SERVICIOS",
  description: "Pago de luz",
  amount: 350,
}

describe("api/expenses", () => {
  it("FINANZAS crea un gasto", async () => {
    await mockSession("FINANZAS")
    const res = await POST(jsonRequest("POST", "/api/expenses", gastoBase))
    expect(res.status).toBe(201)
    expect(await prisma.expense.count()).toBe(1)
  })

  it("RECEPCIONISTA no puede crear gastos (403)", async () => {
    await mockSession("RECEPCIONISTA")
    const res = await POST(jsonRequest("POST", "/api/expenses", gastoBase))
    expect(res.status).toBe(403)
  })

  it("crear sin campos requeridos devuelve 400", async () => {
    await mockSession("FINANZAS")
    const res = await POST(jsonRequest("POST", "/api/expenses", { amount: 10 }))
    expect(res.status).toBe(400)
  })

  it("editar un gasto funciona (ruta [id] nueva, antes 404)", async () => {
    const gasto = await prisma.expense.create({
      data: { date: new Date(), category: "OTROS", description: "Original", amount: 10 },
    })
    await mockSession("FINANZAS")
    const res = await PUT(
      jsonRequest("PUT", `/api/expenses/${gasto.id}`, {
        ...gastoBase,
        description: "Editado",
        amount: 99,
      }),
      { params: { id: gasto.id } }
    )
    expect(res.status).toBe(200)
    const actualizado = await prisma.expense.findUnique({ where: { id: gasto.id } })
    expect(actualizado?.description).toBe("Editado")
    expect(actualizado?.amount).toBe(99)
  })

  it("eliminar un gasto funciona y valida permisos", async () => {
    const gasto = await prisma.expense.create({
      data: { date: new Date(), category: "OTROS", description: "Borrar", amount: 10 },
    })

    await mockSession("VISUAL")
    const denegado = await DELETE(getRequest(`/api/expenses/${gasto.id}`), {
      params: { id: gasto.id },
    })
    expect(denegado.status).toBe(403)

    await mockSession("FINANZAS")
    const ok = await DELETE(getRequest(`/api/expenses/${gasto.id}`), {
      params: { id: gasto.id },
    })
    expect(ok.status).toBe(200)
    expect(await prisma.expense.count()).toBe(0)
  })

  it("editar un gasto inexistente devuelve 404", async () => {
    await mockSession("FINANZAS")
    const res = await PUT(
      jsonRequest("PUT", "/api/expenses/no-existe", gastoBase),
      { params: { id: "no-existe" } }
    )
    expect(res.status).toBe(404)
  })

  it("un gasto ligado a un evento sobrevive si se borra la cotizacion (SetNull)", async () => {
    const cliente = await createTestClient()
    const quote = await createTestQuote(cliente.id)
    await mockSession("FINANZAS")
    await POST(jsonRequest("POST", "/api/expenses", { ...gastoBase, quoteId: quote.id }))

    await prisma.quote.delete({ where: { id: quote.id } })

    const gasto = await prisma.expense.findFirst()
    expect(gasto).not.toBeNull()
    expect(gasto?.quoteId).toBeNull()
  })

  it("GET filtra por categoria", async () => {
    await prisma.expense.createMany({
      data: [
        { date: new Date(), category: "SERVICIOS", description: "Luz", amount: 1 },
        { date: new Date(), category: "SUELDOS", description: "Nomina", amount: 2 },
      ],
    })
    await mockSession("FINANZAS")
    const res = await GET(getRequest("/api/expenses?category=SUELDOS"))
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].category).toBe("SUELDOS")
  })

  it("GET filtra por evento (quoteId) e incluye los datos del evento", async () => {
    const cliente = await createTestClient()
    const evento = await createTestQuote(cliente.id)
    const otro = await createTestQuote(cliente.id)
    await prisma.expense.createMany({
      data: [
        { date: new Date(), category: "DECORACION", description: "Flores", amount: 100, quoteId: evento.id },
        { date: new Date(), category: "DECORACION", description: "Globos", amount: 50, quoteId: otro.id },
        { date: new Date(), category: "SERVICIOS", description: "Luz", amount: 1 },
      ],
    })
    await mockSession("FINANZAS")

    const res = await GET(getRequest(`/api/expenses?quoteId=${evento.id}`))
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].description).toBe("Flores")
    expect(body.data[0].quote.client.name).toBe(cliente.name)
  })

  it("el listado minimal de quotes es accesible para quien solo ve gastos", async () => {
    const cliente = await createTestClient()
    await createTestQuote(cliente.id)
    // FINANZAS_RESTRINGIDO no existe en la base de test (viene del seed);
    // FINANZAS cumple el mismo caso: tiene gastos pero el minimal no expone montos
    await mockSession("FINANZAS")

    const { GET: getQuotes } = await import("@/app/api/quotes/route")
    const res = await getQuotes(getRequest("/api/quotes?minimal=1"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].client.name).toBe(cliente.name)
    expect(body.data[0].totalAmount).toBeUndefined()
    expect(body.data[0].paidAmount).toBeUndefined()
  })
})
