import { describe, it, expect, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/rooms/route"
import { PUT } from "@/app/api/rooms/[id]/route"
import { mockSession, jsonRequest, getRequest, truncateAll, prisma } from "./helpers"

async function createFloor() {
  const building = await prisma.building.create({ data: { name: "Edificio Test" } })
  return prisma.floor.create({ data: { buildingId: building.id, level: 1 } })
}

beforeEach(async () => {
  await truncateAll()
})

describe("api/rooms", () => {
  it("RECEPCIONISTA crea una habitacion", async () => {
    const floor = await createFloor()
    await mockSession("RECEPCIONISTA")
    const res = await POST(
      jsonRequest("POST", "/api/rooms", {
        floorId: floor.id,
        number: "101",
        capacity: 2,
        bedType: "MATRIMONIAL",
        pricePerNight: 350,
      })
    )
    expect(res.status).toBe(201)
    const room = await prisma.room.findFirst()
    expect(room?.status).toBe("DISPONIBLE")
  })

  it("FINANZAS no puede crear habitaciones (403)", async () => {
    const floor = await createFloor()
    await mockSession("FINANZAS")
    const res = await POST(
      jsonRequest("POST", "/api/rooms", { floorId: floor.id, number: "102" })
    )
    expect(res.status).toBe(403)
  })

  it("editar cambia el estado", async () => {
    const floor = await createFloor()
    const room = await prisma.room.create({
      data: { floorId: floor.id, number: "103", status: "DISPONIBLE" },
    })
    await mockSession("ADMIN")
    const res = await PUT(
      jsonRequest("PUT", `/api/rooms/${room.id}`, {
        floorId: floor.id,
        number: "103",
        status: "OCUPADA",
      }),
      { params: { id: room.id } }
    )
    expect(res.status).toBe(200)
    const actualizado = await prisma.room.findUnique({ where: { id: room.id } })
    expect(actualizado?.status).toBe("OCUPADA")
  })

  it("GET lista con sesion", async () => {
    const floor = await createFloor()
    await prisma.room.create({ data: { floorId: floor.id, number: "104" } })
    await mockSession("VISUAL")
    const res = await GET(getRequest("/api/rooms"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})
