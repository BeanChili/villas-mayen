import { describe, it, expect, beforeEach } from "vitest"
import { POST } from "@/app/api/quotes/route"
import { PUT } from "@/app/api/quotes/[id]/route"
import {
  mockSession,
  jsonRequest,
  truncateAll,
  createTestClient,
  createTestLocation,
  createTestQuote,
  unique,
  prisma,
} from "./helpers"
import { sessionHolder } from "./setup"

beforeEach(async () => {
  await truncateAll()
})

/** Rol que puede cotizar pero NO modificar precios (como el contador). */
async function mockSesionSinPrecios() {
  const role = await prisma.role.create({
    data: {
      key: unique("SIN_PRECIOS").toUpperCase(),
      name: unique("Cotiza sin precios"),
      canEditPrices: false,
      permissions: {
        create: [
          { module: "quotes", canView: true, canCreate: true, canEdit: true, canDelete: false },
        ],
      },
    },
  })
  const user = await prisma.user.create({
    data: {
      name: "Contador de Prueba",
      username: unique("contador").toLowerCase(),
      password: "x",
      roleId: role.id,
    },
  })
  sessionHolder.current = { user: { id: user.id, name: user.name } }
  return user
}

function bodyCotizacion(clientId: string, locationId: string, productId: string) {
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
        // El cliente intenta cobrar 1 en vez del precio de catalogo
        unitPrice: 1,
      },
    ],
    items: [
      {
        productId,
        name: "Menu 1",
        category: "COMIDA_MENU",
        unitPrice: 1,
        discountType: "PERCENT",
        discountValue: 90,
        dailyQuantities: [{ date: "2026-12-20", quantity: 10 }],
      },
    ],
  }
}

describe("bloqueo de precios en cotizaciones", () => {
  it("un rol sin canEditPrices recibe los precios del catalogo, no los que mando", async () => {
    const cliente = await createTestClient()
    const salon = await createTestLocation({ unitPrice: 5000 })
    const producto = await prisma.product.create({
      data: {
        name: unique("Menu"),
        category: "COMIDA_MENU",
        unitPrice: 100,
        unitMeasure: "PERSONA",
      },
    })
    await mockSesionSinPrecios()

    const res = await POST(
      jsonRequest("POST", "/api/quotes", bodyCotizacion(cliente.id, salon.id, producto.id))
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    // 5000 del salon (catalogo) + 10 x 100 del menu (catalogo), sin descuento
    expect(body.data.subtotal).toBe(6000)
    expect(body.data.totalAmount).toBe(6000)
    expect(body.data.spaces[0].unitPrice).toBe(5000)
    const item = body.data.items[0]
    expect(item.unitPrice).toBe(100)
    expect(item.discountValue).toBe(0)
  })

  it("un rol con canEditPrices conserva los precios que mando", async () => {
    const cliente = await createTestClient()
    const salon = await createTestLocation({ unitPrice: 5000 })
    const producto = await prisma.product.create({
      data: {
        name: unique("Menu"),
        category: "COMIDA_MENU",
        unitPrice: 100,
        unitMeasure: "PERSONA",
      },
    })
    await mockSession("RECEPCIONISTA")

    const res = await POST(
      jsonRequest("POST", "/api/quotes", bodyCotizacion(cliente.id, salon.id, producto.id))
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    // 1 del salon + 10 x 1 del menu - 90% de descuento del item
    expect(body.data.spaces[0].unitPrice).toBe(1)
    expect(body.data.subtotal).toBe(2)
  })

  it("sin canEditPrices el PUT recalcula el total e ignora el totalAmount del cliente", async () => {
    const cliente = await createTestClient()
    const salon = await createTestLocation({ unitPrice: 3000 })
    const quote = await createTestQuote(cliente.id)
    await mockSesionSinPrecios()

    const res = await PUT(
      jsonRequest("PUT", `/api/quotes/${quote.id}`, {
        totalAmount: 1,
        spaces: [
          {
            locationType: "HALL",
            locationId: salon.id,
            locationName: "Salon",
            startTime: "10:00",
            endTime: "18:00",
            unitPrice: 1,
          },
        ],
        items: [],
      }),
      { params: { id: quote.id } }
    )
    expect(res.status).toBe(200)
    const actualizada = await prisma.quote.findUnique({ where: { id: quote.id } })
    expect(actualizada?.totalAmount).toBe(3000)
  })

  it("sin canEditPrices y sin detalle, el PUT no permite tocar el total", async () => {
    const cliente = await createTestClient()
    const quote = await createTestQuote(cliente.id, { totalAmount: 1000 })
    await mockSesionSinPrecios()

    const res = await PUT(
      jsonRequest("PUT", `/api/quotes/${quote.id}`, { totalAmount: 1, notes: "hola" }),
      { params: { id: quote.id } }
    )
    expect(res.status).toBe(200)
    const actualizada = await prisma.quote.findUnique({ where: { id: quote.id } })
    expect(actualizada?.totalAmount).toBe(1000)
    expect(actualizada?.notes).toBe("hola")
  })
})
