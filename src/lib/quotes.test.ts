import { describe, it, expect } from "vitest"
import { toQuoteCurrency, recomputeQuotePrices, computeQuoteTotals } from "./quotes"

describe("toQuoteCurrency", () => {
  it("GTQ devuelve el precio base sin tocar", () => {
    expect(toQuoteCurrency(750, "GTQ", 7.85)).toBe(750)
  })

  it("USD divide por el tipo de cambio con redondeo a 2 decimales", () => {
    // Mismo redondeo que el wizard: toFixed(2)
    expect(toQuoteCurrency(1000, "USD", 7.85)).toBe(127.39)
  })

  it("USD con tipo de cambio invalido no divide", () => {
    expect(toQuoteCurrency(1000, "USD", 0)).toBe(1000)
  })
})

describe("recomputeQuotePrices", () => {
  const catalog = {
    locations: { loc1: 5000 },
    products: { prod1: 100 },
    furniture: { furn1: 25 },
  }

  it("reemplaza los precios del cliente por los del catalogo", () => {
    const { spaces, items } = recomputeQuotePrices(
      [{ locationId: "loc1", unitPrice: 1 }],
      [
        { productId: "prod1", unitPrice: 1 },
        { furnitureId: "furn1", unitPrice: 999 },
      ],
      catalog
    )
    expect(spaces[0].unitPrice).toBe(5000)
    expect(items[0].unitPrice).toBe(100)
    expect(items[1].unitPrice).toBe(25)
  })

  it("sin referencia de catalogo el precio queda en 0", () => {
    const { spaces, items } = recomputeQuotePrices(
      [{ locationName: "Espacio custom", unitPrice: 8000 }],
      [{ name: "Item inventado", unitPrice: 500 }],
      catalog
    )
    expect(spaces[0].unitPrice).toBe(0)
    expect(items[0].unitPrice).toBe(0)
  })

  it("anula los descuentos del cliente", () => {
    const { items } = recomputeQuotePrices(
      [],
      [{ productId: "prod1", unitPrice: 100, discountType: "PERCENT", discountValue: 90 }],
      catalog
    )
    expect(items[0].discountType).toBeNull()
    expect(items[0].discountValue).toBe(0)
  })

  it("convierte los precios de catalogo a USD", () => {
    const { spaces } = recomputeQuotePrices(
      [{ locationId: "loc1", unitPrice: 1 }],
      [],
      catalog,
      "USD",
      7.85
    )
    expect(spaces[0].unitPrice).toBe(636.94)
  })
})

describe("computeQuoteTotals", () => {
  it("suma espacios e items", () => {
    const total = computeQuoteTotals(
      [{ unitPrice: 5000 }],
      [{ unitPrice: 100, dailyQuantities: [{ quantity: 10 }] }]
    )
    expect(total).toBe(6000)
  })

  it("expande rangos de habitaciones", () => {
    const total = computeQuoteTotals(
      [{ unitPrice: 200, roomFrom: "1", roomTo: "4" }],
      []
    )
    expect(total).toBe(800)
  })

  it("modo por persona multiplica por invitados", () => {
    const total = computeQuoteTotals(
      [{ unitPrice: 50, pricingMode: "PER_PERSON" }],
      [],
      30
    )
    expect(total).toBe(1500)
  })

  it("aplica descuentos por porcentaje y por monto", () => {
    const total = computeQuoteTotals(
      [],
      [
        { unitPrice: 100, dailyQuantities: [{ quantity: 10 }], discountType: "PERCENT", discountValue: 10 },
        { unitPrice: 100, dailyQuantities: [{ quantity: 10 }], discountType: "AMOUNT", discountValue: 250 },
      ]
    )
    // 1000 - 100 + 1000 - 250
    expect(total).toBe(1650)
  })
})
