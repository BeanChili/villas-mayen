"use client"

import { type ReactNode } from "react"
import { ShieldAlert } from "lucide-react"
import { usePermissions } from "./permissions-provider"

/**
 * Protege una pagina del dashboard: muestra el contenido solo si el rol del
 * usuario tiene VER en el modulo. El enforcement real esta en la API; esto
 * evita mostrar pantallas vacias o botones que van a dar 403.
 */
export function RequireModule({
  module,
  children,
}: {
  module: string
  children: ReactNode
}) {
  const { loading, can } = usePermissions()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-vm-green border-t-transparent" />
      </div>
    )
  }

  if (!can(module, "view")) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Sin acceso</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tu rol no tiene permiso para ver esta sección. Si creés que es un
          error, pedile al administrador que revise tus permisos.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
