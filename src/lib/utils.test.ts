import { describe, it, expect } from "vitest"
import {
  formatCurrency,
  formatCurrencyByCode,
  isValidTransition,
  VALID_QUOTE_TRANSITIONS,
  getScheduleFromTime,
  calculateExpiryDate,
  formatParkingSpots,
  getQuoteStatusLabel,
  getRoomStatusLabel,
  formatQuoteCode,
  isValidEmail,
} from "./utils"

describe("formatQuoteCode", () => {
  it("rellena con cero hasta dos digitos", () => {
    expect(formatQuoteCode(1)).toBe("VM-01")
    expect(formatQuoteCode(9)).toBe("VM-09")
    expect(formatQuoteCode(10)).toBe("VM-10")
    expect(formatQuoteCode(99)).toBe("VM-99")
  })

  it("crece solo pasando los dos digitos", () => {
    expect(formatQuoteCode(100)).toBe("VM-100")
    expect(formatQuoteCode(1234)).toBe("VM-1234")
  })
})

describe("isValidEmail", () => {
  it("acepta formato usuario@dominio.tld", () => {
    expect(isValidEmail("rene@correo.com")).toBe(true)
    expect(isValidEmail("  rene@correo.com  ")).toBe(true)
    expect(isValidEmail("a.b+c@sub.dominio.gt")).toBe(true)
  })

  it("rechaza formatos invalidos", () => {
    expect(isValidEmail("")).toBe(false)
    expect(isValidEmail("rene")).toBe(false)
    expect(isValidEmail("rene@")).toBe(false)
    expect(isValidEmail("rene@dominio")).toBe(false)
    expect(isValidEmail("rene dominio@x.com")).toBe(false)
    expect(isValidEmail("@dominio.com")).toBe(false)
  })
})

describe("formatCurrency", () => {
  it("usa el simbolo Q literal, sin depender del ICU del runtime", () => {
    expect(formatCurrency(1234.56)).toBe("Q 1,234.56")
  })

  it("siempre muestra dos decimales", () => {
    expect(formatCurrency(0)).toBe("Q 0.00")
    expect(formatCurrency(10)).toBe("Q 10.00")
    expect(formatCurrency(10.5)).toBe("Q 10.50")
  })

  it("acepta strings numericos", () => {
    expect(formatCurrency("2500")).toBe("Q 2,500.00")
  })

  it("no explota con entradas invalidas", () => {
    expect(formatCurrency("no-numero")).toBe("Q 0.00")
  })

  it("formatea negativos", () => {
    expect(formatCurrency(-18)).toBe("Q -18.00")
  })
})

describe("formatCurrencyByCode", () => {
  it("GTQ va al formato con Q", () => {
    expect(formatCurrencyByCode(100, "GTQ")).toBe("Q 100.00")
  })

  it("USD usa el formato dolar", () => {
    expect(formatCurrencyByCode(100, "USD")).toBe("$100.00")
  })
})

describe("maquina de estados de cotizacion", () => {
  it("permite exactamente las transiciones definidas", () => {
    const esperadas: Record<string, string[]> = {
      BORRADOR: ["ENVIADA"],
      ENVIADA: ["CONFIRMADA", "NO_CONFIRMADA"],
      NO_CONFIRMADA: ["ENVIADA"],
      CONFIRMADA: ["EN_EJECUCION", "CANCELADO"],
      EN_EJECUCION: ["FINALIZADA", "CANCELADO"],
      CANCELADO: [],
      FINALIZADA: [],
    }
    expect(VALID_QUOTE_TRANSITIONS).toEqual(esperadas)

    for (const [desde, destinos] of Object.entries(esperadas)) {
      for (const hasta of Object.keys(esperadas)) {
        expect(isValidTransition(desde, hasta)).toBe(destinos.includes(hasta))
      }
    }
  })

  it("rechaza estados desconocidos", () => {
    expect(isValidTransition("INEXISTENTE", "ENVIADA")).toBe(false)
    expect(isValidTransition("BORRADOR", "INEXISTENTE")).toBe(false)
  })
})

describe("getScheduleFromTime", () => {
  it("clasifica manana, tarde y noche", () => {
    expect(getScheduleFromTime("08:00")).toBe("MANANA")
    expect(getScheduleFromTime("13:00")).toBe("MANANA")
    expect(getScheduleFromTime("15:30")).toBe("TARDE")
    expect(getScheduleFromTime("21:00")).toBe("NOCHE")
    expect(getScheduleFromTime("00:30")).toBe("NOCHE")
  })

  it("devuelve null fuera de las franjas", () => {
    expect(getScheduleFromTime("13:30")).toBeNull()
    expect(getScheduleFromTime("02:00")).toBeNull()
  })
})

describe("calculateExpiryDate", () => {
  it("suma dias habiles salteando fines de semana", () => {
    // Lunes 2026-01-05 + 5 dias habiles = lunes 2026-01-12
    const resultado = calculateExpiryDate(new Date("2026-01-05T12:00:00"), 5)
    expect(resultado.getDay()).not.toBe(0)
    expect(resultado.getDay()).not.toBe(6)
    expect(resultado.toISOString().slice(0, 10)).toBe("2026-01-12")
  })
})

describe("formatParkingSpots", () => {
  it("mapea numeros a etiquetas", () => {
    expect(formatParkingSpots("1,3")).toBe("Parqueo 1, Parqueo 3")
    expect(formatParkingSpots("Predio")).toBe("Predio")
  })

  it("tolera vacios", () => {
    expect(formatParkingSpots(undefined)).toBe("")
    expect(formatParkingSpots("")).toBe("")
  })
})

describe("labels", () => {
  it("estados de cotizacion", () => {
    expect(getQuoteStatusLabel("BORRADOR")).toBe("Borrador")
    expect(getQuoteStatusLabel("DESCONOCIDO")).toBe("DESCONOCIDO")
  })

  it("estados de habitacion", () => {
    expect(getRoomStatusLabel("MANTENIMIENTO")).toBe("Mantenimiento")
  })
})
