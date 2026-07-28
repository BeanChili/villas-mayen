import { describe, it, expect, beforeEach } from "vitest"
import { POST } from "@/app/api/furniture/route"
import { PUT, DELETE } from "@/app/api/furniture/[id]/route"
import { mockSession, jsonRequest, getRequest, truncateAll, prisma } from "./helpers"

beforeEach(async () => {
  await truncateAll()
})

const muebleBase = {
  inventoryNumber: "MESA-100",
  name: "Mesa redonda",
  category: "MESAS",
  purchaseValue: 800,
  depreciationRate: 10,
  rentalPrice: 120,
}

describe("api/furniture", () => {
  it("ALMACEN crea mobiliario", async () => {
    await mockSession("ALMACEN")
    const res = await POST(jsonRequest("POST", "/api/furniture", muebleBase))
    expect(res.status).toBe(201)
  })

  it("numero de inventario duplicado devuelve 409", async () => {
    await mockSession("ALMACEN")
    await POST(jsonRequest("POST", "/api/furniture", muebleBase))
    const dup = await POST(jsonRequest("POST", "/api/furniture", muebleBase))
    expect(dup.status).toBe(409)
  })

  it("editar mobiliario funciona (ruta [id] nueva, antes 404)", async () => {
    await mockSession("ALMACEN")
    await POST(jsonRequest("POST", "/api/furniture", muebleBase))
    const mueble = await prisma.furniture.findFirst()

    const res = await PUT(
      jsonRequest("PUT", `/api/furniture/${mueble!.id}`, {
        name: "Mesa imperial",
        rentalPrice: 200,
      }),
      { params: { id: mueble!.id } }
    )
    expect(res.status).toBe(200)
    const actualizado = await prisma.furniture.findUnique({ where: { id: mueble!.id } })
    expect(actualizado?.name).toBe("Mesa imperial")
    expect(actualizado?.rentalPrice).toBe(200)
    // Lo no enviado queda intacto
    expect(actualizado?.inventoryNumber).toBe("MESA-100")
  })

  it("editar hacia un numero de inventario ya usado devuelve 409", async () => {
    await mockSession("ALMACEN")
    await POST(jsonRequest("POST", "/api/furniture", muebleBase))
    await POST(
      jsonRequest("POST", "/api/furniture", { ...muebleBase, inventoryNumber: "MESA-101" })
    )
    const segundo = await prisma.furniture.findFirst({
      where: { inventoryNumber: "MESA-101" },
    })

    const res = await PUT(
      jsonRequest("PUT", `/api/furniture/${segundo!.id}`, { inventoryNumber: "MESA-100" }),
      { params: { id: segundo!.id } }
    )
    expect(res.status).toBe(409)
  })

  it("VISUAL no puede eliminar (403); ALMACEN si", async () => {
    await mockSession("ALMACEN")
    await POST(jsonRequest("POST", "/api/furniture", muebleBase))
    const mueble = await prisma.furniture.findFirst()

    await mockSession("VISUAL")
    const denegado = await DELETE(getRequest(`/api/furniture/${mueble!.id}`), {
      params: { id: mueble!.id },
    })
    expect(denegado.status).toBe(403)

    await mockSession("ALMACEN")
    const ok = await DELETE(getRequest(`/api/furniture/${mueble!.id}`), {
      params: { id: mueble!.id },
    })
    expect(ok.status).toBe(200)
    expect(await prisma.furniture.count()).toBe(0)
  })
})
