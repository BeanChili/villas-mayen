import { describe, it, expect } from "vitest"
import { shouldReactivate } from "./rooms"

describe("shouldReactivate", () => {
  const ahora = new Date("2026-07-28T12:00:00")

  it("reactiva un mantenimiento con fecha vencida", () => {
    expect(shouldReactivate("MANTENIMIENTO", new Date("2026-07-27T12:00:00"), ahora)).toBe(true)
  })

  it("reactiva cuando la fecha es exactamente ahora", () => {
    expect(shouldReactivate("MANTENIMIENTO", new Date("2026-07-28T12:00:00"), ahora)).toBe(true)
  })

  it("no reactiva un mantenimiento vigente", () => {
    expect(shouldReactivate("MANTENIMIENTO", new Date("2026-08-01T12:00:00"), ahora)).toBe(false)
  })

  it("no reactiva sin fecha de fin", () => {
    expect(shouldReactivate("MANTENIMIENTO", null, ahora)).toBe(false)
    expect(shouldReactivate("MANTENIMIENTO", undefined, ahora)).toBe(false)
  })

  it("no toca habitaciones en otros estados", () => {
    expect(shouldReactivate("DISPONIBLE", new Date("2026-07-01T12:00:00"), ahora)).toBe(false)
    expect(shouldReactivate("OCUPADA", new Date("2026-07-01T12:00:00"), ahora)).toBe(false)
  })
})
