import { describe, it, expect, beforeEach } from "vitest"
import { POST as postProduct } from "@/app/api/products/route"
import { PUT as putProduct } from "@/app/api/products/[id]/route"
import { POST as postLocation } from "@/app/api/locations/route"
import { PUT as putLocation, DELETE as deleteLocation } from "@/app/api/locations/[id]/route"
import { GET as getCategories, POST as postCategory } from "@/app/api/categories/route"
import { mockSession, jsonRequest, getRequest, truncateAll, prisma } from "./helpers"

beforeEach(async () => {
  await truncateAll()
})

describe("api/products", () => {
  it("ALMACEN crea y edita productos", async () => {
    mockSession("ALMACEN")
    const res = await postProduct(
      jsonRequest("POST", "/api/products", {
        name: "Menu 1",
        category: "COMIDA_MENU",
        unitPrice: 150,
        unitMeasure: "PERSONA",
      })
    )
    expect(res.status).toBe(201)
    const producto = await prisma.product.findFirst()

    const put = await putProduct(
      jsonRequest("PUT", `/api/products/${producto!.id}`, {
        name: "Menu 1 premium",
        unitPrice: 175,
      }),
      { params: { id: producto!.id } }
    )
    expect(put.status).toBe(200)
    const actualizado = await prisma.product.findUnique({ where: { id: producto!.id } })
    expect(actualizado?.unitPrice).toBe(175)
  })

  it("RECEPCIONISTA no puede crear productos (403)", async () => {
    mockSession("RECEPCIONISTA")
    const res = await postProduct(
      jsonRequest("POST", "/api/products", {
        name: "X",
        category: "COMIDA_MENU",
        unitPrice: 1,
        unitMeasure: "PIEZA",
      })
    )
    expect(res.status).toBe(403)
  })
})

describe("api/locations", () => {
  it("ADMIN crea, edita y elimina ubicaciones", async () => {
    mockSession("ADMIN")
    const res = await postLocation(
      jsonRequest("POST", "/api/locations", { name: "Salon Jade", type: "HALL", unitPrice: 5000 })
    )
    expect(res.status).toBe(201)
    const ubicacion = await prisma.location.findFirst()

    const put = await putLocation(
      jsonRequest("PUT", `/api/locations/${ubicacion!.id}`, { unitPrice: 5500 }),
      { params: { id: ubicacion!.id } }
    )
    expect(put.status).toBe(200)

    const del = await deleteLocation(getRequest(`/api/locations/${ubicacion!.id}`), {
      params: { id: ubicacion!.id },
    })
    expect(del.status).toBe(200)
  })

  it("FINANZAS no puede crear ubicaciones (403)", async () => {
    mockSession("FINANZAS")
    const res = await postLocation(
      jsonRequest("POST", "/api/locations", { name: "X", type: "HALL", unitPrice: 1 })
    )
    expect(res.status).toBe(403)
  })
})

describe("api/categories", () => {
  it("crea y lista categorias, duplicado da 409", async () => {
    mockSession("ADMIN")
    const res = await postCategory(
      jsonRequest("POST", "/api/categories", { name: "Manteleria", type: "PRODUCT" })
    )
    expect(res.status === 200 || res.status === 201).toBe(true)

    const dup = await postCategory(
      jsonRequest("POST", "/api/categories", { name: "Manteleria", type: "PRODUCT" })
    )
    expect(dup.status).toBe(409)

    const list = await getCategories(getRequest("/api/categories?type=PRODUCT"))
    const body = await list.json()
    expect(body.data.some((c: any) => c.name === "Manteleria")).toBe(true)
  })
})
