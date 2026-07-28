import prisma from "./db"

// Sin cron en el sistema: la reactivacion de habitaciones en mantenimiento
// es un barrido perezoso que corre al listar habitaciones.

/** Una habitacion en MANTENIMIENTO con fecha de fin vencida debe reactivarse. */
export function shouldReactivate(
  status: string,
  maintenanceEndDate: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (status !== "MANTENIMIENTO") return false
  if (!maintenanceEndDate) return false
  return maintenanceEndDate.getTime() <= now.getTime()
}

/**
 * Reactiva a DISPONIBLE todas las habitaciones cuyo mantenimiento vencio y
 * limpia los campos del trabajo. Devuelve cuantas reactivo.
 */
export async function sweepRoomMaintenance(now: Date = new Date()): Promise<number> {
  const result = await prisma.room.updateMany({
    where: {
      status: "MANTENIMIENTO",
      maintenanceEndDate: { not: null, lte: now },
    },
    data: {
      status: "DISPONIBLE",
      maintenanceWork: null,
      maintenanceEndDate: null,
    },
  })
  return result.count
}
