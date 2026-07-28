import { describe, it, expect, beforeEach } from "vitest"
import { GET as getRoles, POST as postRole } from "@/app/api/roles/route"
import { PUT as putRole, DELETE as deleteRole } from "@/app/api/roles/[id]/route"
import { GET as getMyPermissions } from "@/app/api/me/permissions/route"
import { GET as getUsers, POST as postUser } from "@/app/api/users/route"
import { PUT as putUser } from "@/app/api/users/[id]/route"
import { GET as getExpenses } from "@/app/api/expenses/route"
import {
  mockSession,
  jsonRequest,
  truncateAll,
  unique,
  prisma,
} from "./helpers"
import { sessionHolder } from "./setup"

beforeEach(async () => {
  await truncateAll()
})

const soloGastos = [
  { module: "expenses", canView: true, canCreate: true, canEdit: false, canDelete: false },
]

async function crearRolPorApi(name: string, permissions: unknown = soloGastos, extra: Record<string, unknown> = {}) {
  const res = await postRole(
    jsonRequest("POST", "/api/roles", { name, permissions, ...extra })
  )
  return res
}

describe("api/roles", () => {
  it("SUPERADMIN lista los roles con matriz y conteo de usuarios", async () => {
    await mockSession("ADMIN")
    const res = await getRoles()
    expect(res.status).toBe(200)
    const body = await res.json()
    const keys = body.data.map((r: any) => r.key)
    expect(keys).toContain("SUPERADMIN")
    const superadmin = body.data.find((r: any) => r.key === "SUPERADMIN")
    expect(superadmin.isSystem).toBe(true)
    expect(superadmin.permissions.length).toBeGreaterThan(0)
    expect(superadmin._count.users).toBeGreaterThanOrEqual(1)
  })

  it("un rol sin permiso de roles ni users no puede listar (403)", async () => {
    await mockSession("VISUAL")
    const res = await getRoles()
    expect(res.status).toBe(403)
  })

  it("crea un rol nuevo con su matriz y key slugificada", async () => {
    await mockSession("ADMIN")
    const nombre = unique("Rol Ventas")
    const res = await crearRolPorApi(nombre)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.name).toBe(nombre)
    expect(body.data.key).toMatch(/^ROL_VENTAS/)
    expect(body.data.permissions).toHaveLength(1)
    expect(body.data.permissions[0].module).toBe("expenses")
    expect(body.data.canEditPrices).toBe(false)
  })

  it("nombre duplicado devuelve 409", async () => {
    await mockSession("ADMIN")
    const nombre = unique("Duplicado")
    expect((await crearRolPorApi(nombre)).status).toBe(201)
    expect((await crearRolPorApi(nombre)).status).toBe(409)
  })

  it("la matriz se sanitiza: modulos desconocidos no entran", async () => {
    await mockSession("ADMIN")
    const res = await crearRolPorApi(unique("Sanitizado"), [
      { module: "expenses", canView: true },
      { module: "modulo_falso", canView: true, canCreate: true },
    ])
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data.permissions).toHaveLength(1)
    expect(body.data.permissions[0].module).toBe("expenses")
  })

  it("RECEPCIONISTA no puede crear roles (403)", async () => {
    await mockSession("RECEPCIONISTA")
    const res = await crearRolPorApi(unique("Intruso"))
    expect(res.status).toBe(403)
  })
})

describe("api/roles/[id]", () => {
  it("edita nombre, flag de precios y reemplaza la matriz completa", async () => {
    await mockSession("ADMIN")
    const creado = await (await crearRolPorApi(unique("Editable"))).json()

    const res = await putRole(
      jsonRequest("PUT", `/api/roles/${creado.data.id}`, {
        name: unique("Editado"),
        canEditPrices: true,
        permissions: [
          { module: "clients", canView: true, canCreate: true, canEdit: true, canDelete: false },
          { module: "calendar", canView: true },
        ],
      }),
      { params: { id: creado.data.id } }
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.canEditPrices).toBe(true)
    const modulos = body.data.permissions.map((p: any) => p.module).sort()
    expect(modulos).toEqual(["calendar", "clients"])
  })

  it("el rol SUPERADMIN no se puede editar ni borrar", async () => {
    await mockSession("ADMIN")
    const superadmin = await prisma.role.findUnique({ where: { key: "SUPERADMIN" } })

    const editar = await putRole(
      jsonRequest("PUT", `/api/roles/${superadmin!.id}`, { name: "Hackeado" }),
      { params: { id: superadmin!.id } }
    )
    expect(editar.status).toBe(400)

    const borrar = await deleteRole(
      jsonRequest("DELETE", `/api/roles/${superadmin!.id}`),
      { params: { id: superadmin!.id } }
    )
    expect(borrar.status).toBe(400)
  })

  it("borrar un rol con usuarios asignados devuelve 409", async () => {
    await mockSession("ADMIN")
    const creado = await (await crearRolPorApi(unique("ConGente"))).json()
    await prisma.user.create({
      data: {
        name: "Ocupante",
        username: unique("ocupante").toLowerCase(),
        password: "x",
        roleId: creado.data.id,
      },
    })

    const res = await deleteRole(
      jsonRequest("DELETE", `/api/roles/${creado.data.id}`),
      { params: { id: creado.data.id } }
    )
    expect(res.status).toBe(409)
  })

  it("borrar un rol sin usuarios funciona", async () => {
    await mockSession("ADMIN")
    const creado = await (await crearRolPorApi(unique("Descartable"))).json()
    const res = await deleteRole(
      jsonRequest("DELETE", `/api/roles/${creado.data.id}`),
      { params: { id: creado.data.id } }
    )
    expect(res.status).toBe(200)
    expect(await prisma.role.findUnique({ where: { id: creado.data.id } })).toBeNull()
  })

  it("editar la matriz impacta al usuario del rol sin re-login (cache invalidada)", async () => {
    await mockSession("ADMIN")
    const creado = await (await crearRolPorApi(unique("Mutante"))).json()

    // Usuario del rol nuevo: hoy puede ver gastos
    const usuario = await prisma.user.create({
      data: {
        name: "Mutante",
        username: unique("mutante").toLowerCase(),
        password: "x",
        roleId: creado.data.id,
      },
    })
    const sesionAdmin = sessionHolder.current

    sessionHolder.current = { user: { id: usuario.id, name: usuario.name } }
    expect((await getExpenses(jsonRequest("GET", "/api/expenses") as any)).status).toBe(200)

    // El admin le saca el permiso de gastos
    sessionHolder.current = sesionAdmin
    const res = await putRole(
      jsonRequest("PUT", `/api/roles/${creado.data.id}`, {
        permissions: [{ module: "calendar", canView: true }],
      }),
      { params: { id: creado.data.id } }
    )
    expect(res.status).toBe(200)

    // Sin esperar TTL: la invalidacion hace que el proximo request ya de 403
    sessionHolder.current = { user: { id: usuario.id, name: usuario.name } }
    expect((await getExpenses(jsonRequest("GET", "/api/expenses") as any)).status).toBe(403)
  })
})

describe("api/me/permissions", () => {
  it("devuelve la matriz del rol del usuario logueado", async () => {
    await mockSession("FINANZAS")
    const res = await getMyPermissions()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.roleKey).toBe("FINANZAS")
    expect(body.data.modules.expenses.view).toBe(true)
    expect(body.data.modules.users).toBeUndefined()
  })

  it("sin sesion devuelve 401", async () => {
    await mockSession(null)
    const res = await getMyPermissions()
    expect(res.status).toBe(401)
  })
})

describe("api/users con roleId", () => {
  it("crea un usuario con rol valido y lo devuelve con el rol incluido", async () => {
    await mockSession("ADMIN")
    const rol = await prisma.role.findUnique({ where: { key: "VISUAL" } })
    const res = await postUser(
      jsonRequest("POST", "/api/users", {
        name: "Nuevo",
        username: unique("nuevo").toLowerCase(),
        password: "secreta123",
        roleId: rol!.id,
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.role.key).toBe("VISUAL")
  })

  it("roleId inexistente devuelve 400", async () => {
    await mockSession("ADMIN")
    const res = await postUser(
      jsonRequest("POST", "/api/users", {
        name: "Roto",
        username: unique("roto").toLowerCase(),
        password: "secreta123",
        roleId: "no-existe",
      })
    )
    expect(res.status).toBe(400)
  })

  it("cambiar el rol de un usuario invalida su cache al instante", async () => {
    await mockSession("ADMIN")
    const finanzas = await prisma.role.findUnique({ where: { key: "FINANZAS" } })
    const visual = await prisma.role.findUnique({ where: { key: "VISUAL" } })
    const usuario = await prisma.user.create({
      data: {
        name: "Cambiante",
        username: unique("cambiante").toLowerCase(),
        password: "x",
        roleId: finanzas!.id,
      },
    })

    const sesionAdmin = sessionHolder.current

    sessionHolder.current = { user: { id: usuario.id, name: usuario.name } }
    expect((await getExpenses(jsonRequest("GET", "/api/expenses") as any)).status).toBe(200)

    sessionHolder.current = sesionAdmin
    const res = await putUser(
      jsonRequest("PUT", `/api/users/${usuario.id}`, { name: usuario.name, roleId: visual!.id }),
      { params: { id: usuario.id } }
    )
    expect(res.status).toBe(200)

    sessionHolder.current = { user: { id: usuario.id, name: usuario.name } }
    expect((await getExpenses(jsonRequest("GET", "/api/expenses") as any)).status).toBe(403)
  })

  it("VISUAL no puede listar usuarios (403)", async () => {
    await mockSession("VISUAL")
    const res = await getUsers(jsonRequest("GET", "/api/users") as any)
    expect(res.status).toBe(403)
  })
})
