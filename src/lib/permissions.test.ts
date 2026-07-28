import { describe, it, expect } from "vitest"
import { MODULES, MODULE_KEYS } from "./modules"
import { buildModuleMap, sanitizePermissions, resolveAction } from "./permissions"

describe("MODULES", () => {
  it("tiene 18 modulos con keys unicas", () => {
    expect(MODULES).toHaveLength(18)
    expect(new Set(MODULE_KEYS).size).toBe(MODULES.length)
  })

  it("no tiene keys con espacios (el typo historico de calendar)", () => {
    for (const key of MODULE_KEYS) {
      expect(key).toBe(key.trim())
    }
  })
})

describe("buildModuleMap", () => {
  it("convierte filas de la base al mapa por modulo", () => {
    const map = buildModuleMap([
      { module: "quotes", canView: true, canCreate: true, canEdit: false, canDelete: false },
      { module: "expenses", canView: true, canCreate: false, canEdit: false, canDelete: false },
    ])
    expect(map.quotes).toEqual({ view: true, create: true, edit: false, delete: false })
    expect(map.expenses.view).toBe(true)
    expect(map.dashboard).toBeUndefined()
  })
})

describe("sanitizePermissions", () => {
  it("descarta modulos desconocidos y fuerza booleanos estrictos", () => {
    const rows = sanitizePermissions([
      { module: "quotes", canView: true, canCreate: "si", canEdit: 1, canDelete: null },
      { module: "inventado", canView: true, canCreate: true, canEdit: true, canDelete: true },
      { module: 42, canView: true },
      null,
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      module: "quotes",
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
    })
  })

  it("con entrada no-array devuelve vacio", () => {
    expect(sanitizePermissions(undefined)).toEqual([])
    expect(sanitizePermissions("x")).toEqual([])
    expect(sanitizePermissions({})).toEqual([])
  })
})

describe("resolveAction", () => {
  const perms = {
    modules: {
      quotes: { view: true, create: true, edit: false, delete: false },
    },
  }

  it("permite solo las acciones marcadas", () => {
    expect(resolveAction(perms, "quotes", "view")).toBe(true)
    expect(resolveAction(perms, "quotes", "create")).toBe(true)
    expect(resolveAction(perms, "quotes", "edit")).toBe(false)
    expect(resolveAction(perms, "quotes", "delete")).toBe(false)
  })

  it("modulo sin fila = sin acceso", () => {
    expect(resolveAction(perms, "expenses", "view")).toBe(false)
  })

  it("sin permisos resueltos = sin acceso", () => {
    expect(resolveAction(null, "quotes", "view")).toBe(false)
    expect(resolveAction(undefined, "quotes", "view")).toBe(false)
  })
})
