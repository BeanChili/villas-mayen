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

describe("mantenimiento de habitaciones", () => {
  it("pasar a MANTENIMIENTO sin trabajo o fecha da 400", async () => {
    const floor = await createFloor()
    const room = await prisma.room.create({
      data: { floorId: floor.id, number: "201", status: "DISPONIBLE" },
    })
    await mockSession("ADMIN")

    const sinCampos = await PUT(
      jsonRequest("PUT", `/api/rooms/${room.id}`, { status: "MANTENIMIENTO" }),
      { params: { id: room.id } }
    )
    expect(sinCampos.status).toBe(400)

    const soloTrabajo = await PUT(
      jsonRequest("PUT", `/api/rooms/${room.id}`, {
        status: "MANTENIMIENTO",
        maintenanceWork: "Pintura",
      }),
      { params: { id: room.id } }
    )
    expect(soloTrabajo.status).toBe(400)
  })

  it("guarda trabajo y fecha al entrar en mantenimiento y los limpia al salir", async () => {
    const floor = await createFloor()
    const room = await prisma.room.create({
      data: { floorId: floor.id, number: "202", status: "DISPONIBLE" },
    })
    await mockSession("ADMIN")

    const entrar = await PUT(
      jsonRequest("PUT", `/api/rooms/${room.id}`, {
        status: "MANTENIMIENTO",
        maintenanceWork: "Cambio de griferia",
        maintenanceEndDate: "2030-01-15",
      }),
      { params: { id: room.id } }
    )
    expect(entrar.status).toBe(200)
    let enDb = await prisma.room.findUnique({ where: { id: room.id } })
    expect(enDb?.maintenanceWork).toBe("Cambio de griferia")
    expect(enDb?.maintenanceEndDate).not.toBeNull()

    const salir = await PUT(
      jsonRequest("PUT", `/api/rooms/${room.id}`, { status: "DISPONIBLE" }),
      { params: { id: room.id } }
    )
    expect(salir.status).toBe(200)
    enDb = await prisma.room.findUnique({ where: { id: room.id } })
    expect(enDb?.maintenanceWork).toBeNull()
    expect(enDb?.maintenanceEndDate).toBeNull()
  })

  it("el barrido del GET reactiva mantenimientos vencidos y no toca vigentes", async () => {
    const floor = await createFloor()
    const vencida = await prisma.room.create({
      data: {
        floorId: floor.id,
        number: "203",
        status: "MANTENIMIENTO",
        maintenanceWork: "Pintura",
        maintenanceEndDate: new Date("2020-01-01T12:00:00"),
      },
    })
    const vigente = await prisma.room.create({
      data: {
        floorId: floor.id,
        number: "204",
        status: "MANTENIMIENTO",
        maintenanceWork: "Plomeria",
        maintenanceEndDate: new Date("2030-01-01T12:00:00"),
      },
    })
    await mockSession("ADMIN")

    const res = await GET(getRequest("/api/rooms"))
    expect(res.status).toBe(200)

    const vencidaDb = await prisma.room.findUnique({ where: { id: vencida.id } })
    expect(vencidaDb?.status).toBe("DISPONIBLE")
    expect(vencidaDb?.maintenanceWork).toBeNull()
    expect(vencidaDb?.maintenanceEndDate).toBeNull()

    const vigenteDb = await prisma.room.findUnique({ where: { id: vigente.id } })
    expect(vigenteDb?.status).toBe("MANTENIMIENTO")
    expect(vigenteDb?.maintenanceWork).toBe("Plomeria")
  })

  it("la descripcion se guarda y se puede editar", async () => {
    const floor = await createFloor()
    await mockSession("ADMIN")

    const res = await POST(
      jsonRequest("POST", "/api/rooms", {
        floorId: floor.id,
        number: "205",
        description: "Vista al jardin, cama king",
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.description).toBe("Vista al jardin, cama king")
  })
})
