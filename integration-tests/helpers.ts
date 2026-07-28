import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { sessionHolder } from "./setup"

// ---------- Sesiones ----------

/**
 * Activa una sesion falsa para el proximo handler invocado.
 * En fase 0 el rol es el string legacy (ADMIN, RECEPCIONISTA, ...).
 */
export function mockSession(role: string | null, extra: Record<string, unknown> = {}) {
  if (role === null) {
    sessionHolder.current = null
    return
  }
  sessionHolder.current = {
    user: {
      id: "test-user-id",
      name: "Usuario de Prueba",
      username: "testuser",
      role,
      ...extra,
    },
  }
}

// ---------- Requests ----------

export function jsonRequest(
  method: string,
  url: string,
  body?: unknown
): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function getRequest(url: string): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`)
}

// ---------- Limpieza ----------

/** Trunca todas las tablas de datos (no toca _prisma_migrations). */
export async function truncateAll() {
  const tables: Array<{ tablename: string }> = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `
  if (tables.length === 0) return
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ")
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
}

// ---------- Factories minimas ----------

let counter = 0
export function unique(prefix: string) {
  counter += 1
  return `${prefix}-${Date.now()}-${counter}`
}

export async function createTestClient(overrides: Record<string, unknown> = {}) {
  return prisma.client.create({
    data: {
      name: unique("Cliente"),
      clientType: "PARTICULAR",
      phone: "5555-0000",
      ...overrides,
    } as any,
  })
}

export async function createTestLocation(overrides: Record<string, unknown> = {}) {
  return prisma.location.create({
    data: {
      name: unique("Salon"),
      type: "HALL",
      unitPrice: 1000,
      ...overrides,
    } as any,
  })
}

export async function createTestQuote(
  clientId: string,
  overrides: Record<string, unknown> = {}
) {
  return prisma.quote.create({
    data: {
      clientId,
      eventDate: new Date("2026-12-15T12:00:00"),
      endDate: new Date("2026-12-15T12:00:00"),
      status: "BORRADOR",
      subtotal: 1000,
      totalAmount: 1000,
      ...overrides,
    } as any,
  })
}

export { prisma }
