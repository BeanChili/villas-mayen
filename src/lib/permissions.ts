import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "./auth"
import prisma from "./db"

import { MODULES, MODULE_KEYS } from "./modules"

export { MODULES, MODULE_KEYS }

export type PermissionAction = "view" | "create" | "edit" | "delete"

export interface ModulePermissions {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

export interface UserPermissions {
  userId: string
  roleId: string
  roleKey: string
  roleName: string
  canEditPrices: boolean
  modules: Record<string, ModulePermissions>
}

// Modulos que leen cotizaciones para renderizarse (GETs compartidos):
// cualquiera de estos con VER habilita el GET de quotes/calendar.
export const QUOTE_READ_MODULES = [
  "quotes",
  "calendar",
  "dashboard",
  "screen",
  "events",
  "closings",
  "reports_cobranza",
]

// ============================================================================
// Parte pura (unit-testeable)
// ============================================================================

type PermissionRow = {
  module: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export function buildModuleMap(rows: PermissionRow[]): Record<string, ModulePermissions> {
  const map: Record<string, ModulePermissions> = {}
  for (const row of rows) {
    map[row.module] = {
      view: row.canView,
      create: row.canCreate,
      edit: row.canEdit,
      delete: row.canDelete,
    }
  }
  return map
}

/** Normaliza la matriz que llega del ABM de roles: solo modulos conocidos y booleanos estrictos. */
export function sanitizePermissions(permissions: unknown): PermissionRow[] {
  if (!Array.isArray(permissions)) return []
  return permissions
    .filter((p: any) => p && typeof p.module === "string" && MODULE_KEYS.includes(p.module))
    .map((p: any) => ({
      module: p.module,
      canView: p.canView === true,
      canCreate: p.canCreate === true,
      canEdit: p.canEdit === true,
      canDelete: p.canDelete === true,
    }))
}

export function resolveAction(
  perms: Pick<UserPermissions, "modules"> | null | undefined,
  module: string,
  action: PermissionAction
): boolean {
  if (!perms) return false
  const modulePerms = perms.modules[module]
  if (!modulePerms) return false
  return modulePerms[action] === true
}

// ============================================================================
// Resolucion server-side por usuario, con cache corto en memoria.
// El rol NO viaja en el JWT: se lee de la base por request, asi los cambios
// de matriz impactan sin re-login (a lo sumo CACHE_TTL_MS despues).
// ============================================================================

const CACHE_TTL_MS = 30_000
const cache = new Map<string, { data: UserPermissions; expiresAt: number }>()

export function invalidatePermissionCache(userId?: string) {
  if (userId) cache.delete(userId)
  else cache.clear()
}

export async function getUserPermissions(userId: string): Promise<UserPermissions | null> {
  const cached = cache.get(userId)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: true } } },
  })

  if (!user || !user.active || !user.role) {
    cache.delete(userId)
    return null
  }

  const data: UserPermissions = {
    userId: user.id,
    roleId: user.role.id,
    roleKey: user.role.key,
    roleName: user.role.name,
    canEditPrices: user.role.canEditPrices,
    modules: buildModuleMap(user.role.permissions),
  }

  cache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}

// ============================================================================
// Guards para route handlers
// ============================================================================

type GuardResult =
  | { ok: true; session: any; perms: UserPermissions }
  | { ok: false; error: NextResponse }

function unauthorized(): NextResponse {
  return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 })
}

function forbidden(detalle?: string): NextResponse {
  return NextResponse.json(
    { success: false, error: detalle || "No tienes permiso para esta acción" },
    { status: 403 }
  )
}

async function resolveSession(): Promise<{ session: any; perms: UserPermissions } | null> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!session || !userId) return null
  const perms = await getUserPermissions(userId)
  if (!perms) return null
  return { session, perms }
}

/** Exige un permiso puntual (modulo + accion). */
export async function requirePermission(
  module: string,
  action: PermissionAction
): Promise<GuardResult> {
  const resolved = await resolveSession()
  if (!resolved) return { ok: false, error: unauthorized() }
  if (!resolveAction(resolved.perms, module, action)) {
    return { ok: false, error: forbidden() }
  }
  return { ok: true, ...resolved }
}

/** Exige AL MENOS UNO de los pares (modulo, accion). Para GETs compartidos. */
export async function requireAnyPermission(
  pairs: Array<[string, PermissionAction]>
): Promise<GuardResult> {
  const resolved = await resolveSession()
  if (!resolved) return { ok: false, error: unauthorized() }
  const allowed = pairs.some(([module, action]) =>
    resolveAction(resolved.perms, module, action)
  )
  if (!allowed) return { ok: false, error: forbidden() }
  return { ok: true, ...resolved }
}

/** Exige sesion valida, sin permiso puntual (datos operativos comunes). */
export async function requireSession(): Promise<GuardResult> {
  const resolved = await resolveSession()
  if (!resolved) return { ok: false, error: unauthorized() }
  return { ok: true, ...resolved }
}

/** Exige el permiso transversal de modificar precios. */
export async function requirePriceEdit(): Promise<GuardResult> {
  const resolved = await resolveSession()
  if (!resolved) return { ok: false, error: unauthorized() }
  if (!resolved.perms.canEditPrices) {
    return { ok: false, error: forbidden("No tienes permiso para modificar precios") }
  }
  return { ok: true, ...resolved }
}
