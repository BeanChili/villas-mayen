import { describe, it, expect, beforeEach } from "vitest"
import { GET as getSellers, POST as postSeller } from "@/app/api/sellers/route"
import { PUT as putSeller, DELETE as deleteSeller } from "@/app/api/sellers/[id]/route"
import { POST as postQuote } from "@/app/api/quotes/route"
import { PATCH as patchStatus } from "@/app/api/quotes/[id]/status/route"
import {
  mockSession,
  jsonRequest,
  getRequest,
  truncateAll,
  createTestClient,
  createTestLocation,
  unique,
  prisma,
} from "./helpers"

beforeEach(async () => {
  await truncateAll()
})

async function crearVendedor(name: string) {
  const res = await postSeller(jsonRequest("POST", "/api/sellers", { name }))
  const body = await res.json()
  return body.data
}

function bodyCotizacion(clientId: string, locationId: string, extra: Record<string, unknown> = {}) {
  return {
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
    ...extra,
  }
}

describe("api/sellers", () => {
  it("ABM completo con baja logica", async () => {
    await mockSession("ADMIN")

    const nombre = unique("Vendedora")
    const creado = await crearVendedor(nombre)
    expect(creado.name).toBe(nombre)
    expect(creado.active).toBe(true)

    // Nombre duplicado da 409
    const dup = await postSeller(jsonRequest("POST", "/api/sellers", { name: nombre }))
    expect(dup.status).toBe(409)

    // Editar telefono
    const edit = await putSeller(
      jsonRequest("PUT", `/api/sellers/${creado.id}`, { phone: "5555-1234" }),
      { params: { id: creado.id } }
    )
    expect(edit.status).toBe(200)

    // Baja logica: sigue existiendo pero inactivo
    const del = await deleteSeller(
      jsonRequest("DELETE", `/api/sellers/${creado.id}`),
      { params: { id: creado.id } }
    )
    expect(del.status).toBe(200)
    const enDb = await prisma.seller.findUnique({ where: { id: creado.id } })
    expect(enDb?.active).toBe(false)

    // El filtro de activos lo excluye
    const activos = await getSellers(getRequest("/api/sellers?active=1"))
    const lista = (await activos.json()).data
    expect(lista.find((s: any) => s.id === creado.id)).toBeUndefined()
  })

  it("un rol sin permiso de vendedores no puede crear (403)", async () => {
    await mockSession("VISUAL")
    const res = await postSeller(jsonRequest("POST", "/api/sellers", { name: unique("Intruso") }))
    expect(res.status).toBe(403)
  })
})

describe("cotizacion con vendedor y codigo VM", () => {
  it("dos creates consecutivos reciben codigos VM correlativos", async () => {
    const cliente = await createTestClient()
    const salon = await createTestLocation()
    await mockSession("ADMIN")

    const r1 = await postQuote(jsonRequest("POST", "/api/quotes", bodyCotizacion(cliente.id, salon.id)))
    const r2 = await postQuote(jsonRequest("POST", "/api/quotes", bodyCotizacion(cliente.id, salon.id)))
    expect(r1.status).toBe(201)
    expect(r2.status).toBe(201)
    const c1 = (await r1.json()).data.code
    const c2 = (await r2.json()).data.code
    expect(c1).toMatch(/^VM-\d{2,}$/)
    const n1 = parseInt(c1.replace("VM-", ""), 10)
    const n2 = parseInt(c2.replace("VM-", ""), 10)
    expect(n2).toBe(n1 + 1)
  })

  it("resuelve sellerName del catalogo y lo conserva tras borrar el vendedor", async () => {
    const cliente = await createTestClient()
    const salon = await createTestLocation()
    await mockSession("ADMIN")

    const vendedor = await crearVendedor(unique("Vendedor"))
    const res = await postQuote(
      jsonRequest("POST", "/api/quotes", bodyCotizacion(cliente.id, salon.id, { sellerId: vendedor.id }))
    )
    expect(res.status).toBe(201)
    const quote = (await res.json()).data
    expect(quote.sellerName).toBe(vendedor.name)

    // Baja del vendedor: la cotizacion conserva el nombre impreso
    await deleteSeller(
      jsonRequest("DELETE", `/api/sellers/${vendedor.id}`),
      { params: { id: vendedor.id } }
    )
    const enDb = await prisma.quote.findUnique({ where: { id: quote.id } })
    expect(enDb?.sellerName).toBe(vendedor.name)
  })

  it("sellerId inexistente devuelve 400", async () => {
    const cliente = await createTestClient()
    const salon = await createTestLocation()
    await mockSession("ADMIN")
    const res = await postQuote(
      jsonRequest("POST", "/api/quotes", bodyCotizacion(cliente.id, salon.id, { sellerId: "no-existe" }))
    )
    expect(res.status).toBe(400)
  })
})

describe("registro de mail al enviar", () => {
  it("ENVIADA con mail guarda clientEmail, crea EmailLog y copia al cliente sin mail", async () => {
    const cliente = await createTestClient({ email: null })
    const salon = await createTestLocation()
    await mockSession("ADMIN")

    const creada = (await (await postQuote(
      jsonRequest("POST", "/api/quotes", bodyCotizacion(cliente.id, salon.id))
    )).json()).data

    const res = await patchStatus(
      jsonRequest("PATCH", `/api/quotes/${creada.id}/status`, {
        status: "ENVIADA",
        clientEmail: "rene@correo.com",
      }),
      { params: { id: creada.id } }
    )
    expect(res.status).toBe(200)

    const quote = await prisma.quote.findUnique({ where: { id: creada.id } })
    expect(quote?.status).toBe("ENVIADA")
    expect(quote?.clientEmail).toBe("rene@correo.com")

    const log = await prisma.emailLog.findFirst({ where: { quoteId: creada.id } })
    expect(log?.type).toBe("SENT_TO_CLIENT")
    expect(log?.sentTo).toBe("rene@correo.com")
    expect(log?.status).toBe("SENT")

    // El cliente no tenia mail: se le copia
    const clienteDb = await prisma.client.findUnique({ where: { id: cliente.id } })
    expect(clienteDb?.email).toBe("rene@correo.com")
  })

  it("no pisa el mail que el cliente ya tenia", async () => {
    const cliente = await createTestClient({ email: "original@correo.com" })
    const salon = await createTestLocation()
    await mockSession("ADMIN")

    const creada = (await (await postQuote(
      jsonRequest("POST", "/api/quotes", bodyCotizacion(cliente.id, salon.id))
    )).json()).data

    await patchStatus(
      jsonRequest("PATCH", `/api/quotes/${creada.id}/status`, {
        status: "ENVIADA",
        clientEmail: "otro@correo.com",
      }),
      { params: { id: creada.id } }
    )

    const clienteDb = await prisma.client.findUnique({ where: { id: cliente.id } })
    expect(clienteDb?.email).toBe("original@correo.com")
  })

  it("mail con formato invalido devuelve 400 y no cambia el estado", async () => {
    const cliente = await createTestClient()
    const salon = await createTestLocation()
    await mockSession("ADMIN")

    const creada = (await (await postQuote(
      jsonRequest("POST", "/api/quotes", bodyCotizacion(cliente.id, salon.id))
    )).json()).data

    const res = await patchStatus(
      jsonRequest("PATCH", `/api/quotes/${creada.id}/status`, {
        status: "ENVIADA",
        clientEmail: "esto-no-es-un-mail",
      }),
      { params: { id: creada.id } }
    )
    expect(res.status).toBe(400)
    const quote = await prisma.quote.findUnique({ where: { id: creada.id } })
    expect(quote?.status).toBe("BORRADOR")
  })

  it("ENVIADA sin mail solo cambia el estado, sin EmailLog", async () => {
    const cliente = await createTestClient()
    const salon = await createTestLocation()
    await mockSession("ADMIN")

    const creada = (await (await postQuote(
      jsonRequest("POST", "/api/quotes", bodyCotizacion(cliente.id, salon.id))
    )).json()).data

    const res = await patchStatus(
      jsonRequest("PATCH", `/api/quotes/${creada.id}/status`, { status: "ENVIADA" }),
      { params: { id: creada.id } }
    )
    expect(res.status).toBe(200)
    const logs = await prisma.emailLog.count({ where: { quoteId: creada.id } })
    expect(logs).toBe(0)
  })
})
