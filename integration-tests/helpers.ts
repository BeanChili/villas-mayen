import { NextRequest } from "next/server"
import prisma from "@/lib/db"
import { sessionHolder } from "./setup"

// ---------- Sesiones ----------

// Los tests viejos usaban el string legacy ADMIN; hoy el rol equivalente es SUPERADMIN
const LEGACY_KEY_MAP: Record<string, string> = {
  ADMIN: "SUPERADMIN",
}

/**
 * Activa una sesion para el proximo handler invocado. Los guards resuelven
 * permisos por userId contra la base, asi que aca se crea un usuario REAL
 * ligado al rol (por key). Los roles los crea la migracion en el reset
 * inicial y truncateAll no los toca.
 */
export async function mockSession(
  roleKey: string | null,
  extra: Record<string, unknown> = {}
) {
  if (roleKey === null) {
    sessionHolder.current = null
    return null
  }
  const key = LEGACY_KEY_MAP[roleKey] ?? roleKey
  const role = await prisma.role.findUnique({ where: { key } })
  if (!role) {
    throw new Error(`El rol ${key} no existe en la base de prueba`)
  }
  const user = await prisma.user.create({
    data: {
      name: `Usuario ${key}`,
      username: unique("user").toLowerCase(),
      password: "hash-de-prueba",
      roleId: role.id,
    },
  })
  sessionHolder.current = {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      roleId: role.id,
      roleName: role.name,
      ...extra,
    },
  }
  return user
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

/**
 * Trunca todas las tablas de datos. No toca _prisma_migrations ni los roles:
 * Role y RolePermission los crea la migracion y mockSession los necesita.
 */
export async function truncateAll() {
  const tables: Array<{ tablename: string }> = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('_prisma_migrations', 'Role', 'RolePermission')
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
