import { describe, it, expect, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/clients/route"
import { PUT, DELETE } from "@/app/api/clients/[id]/route"
import {
  mockSession,
  jsonRequest,
  getRequest,
  truncateAll,
  createTestClient,
  prisma,
} from "./helpers"

beforeEach(async () => {
  await truncateAll()
})

describe("api/clients", () => {
  it("sin sesion devuelve 401", async () => {
    await mockSession(null)
    const res = await GET(getRequest("/api/clients"))
    expect(res.status).toBe(401)
  })

  it("RECEPCIONISTA puede crear un cliente", async () => {
    await mockSession("RECEPCIONISTA")
    const res = await POST(
      jsonRequest("POST", "/api/clients", {
        name: "Claudia Perez",
        clientType: "PARTICULAR",
        phone: "5555-1111",
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.name).toBe("Claudia Perez")
    expect(await prisma.client.count()).toBe(1)
  })

  it("VISUAL no puede crear (403) pero si listar", async () => {
    await mockSession("VISUAL")
    const post = await POST(jsonRequest("POST", "/api/clients", { name: "X" }))
    expect(post.status).toBe(403)

    const get = await GET(getRequest("/api/clients"))
    expect(get.status).toBe(200)
  })

  it("ADMIN edita y elimina", async () => {
    const cliente = await createTestClient({ name: "Original" })
    await mockSession("ADMIN")

    const put = await PUT(
      jsonRequest("PUT", `/api/clients/${cliente.id}`, { name: "Editado" }),
      { params: { id: cliente.id } }
    )
    expect(put.status).toBe(200)
    const actualizado = await prisma.client.findUnique({ where: { id: cliente.id } })
    expect(actualizado?.name).toBe("Editado")

    const del = await DELETE(getRequest(`/api/clients/${cliente.id}`), {
      params: { id: cliente.id },
    })
    expect(del.status).toBe(200)
  })

  it("FINANZAS no puede editar clientes (403)", async () => {
    const cliente = await createTestClient()
    await mockSession("FINANZAS")
    const put = await PUT(
      jsonRequest("PUT", `/api/clients/${cliente.id}`, { name: "Hackeado" }),
      { params: { id: cliente.id } }
    )
    expect(put.status).toBe(403)
  })

  it("crear sin nombre devuelve 400", async () => {
    await mockSession("ADMIN")
    const res = await POST(jsonRequest("POST", "/api/clients", { phone: "123" }))
    expect(res.status).toBe(400)
  })
})
