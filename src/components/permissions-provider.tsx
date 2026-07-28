"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

interface ModulePermissions {
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
}

interface PermissionsData {
  roleId: string
  roleKey: string
  roleName: string
  canEditPrices: boolean
  modules: Record<string, ModulePermissions>
}

interface PermissionsContextValue {
  loading: boolean
  roleName: string
  roleKey: string
  canEditPrices: boolean
  can: (module: string, action?: "view" | "create" | "edit" | "delete") => boolean
  refresh: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextValue>({
  loading: true,
  roleName: "",
  roleKey: "",
  canEditPrices: false,
  can: () => false,
  refresh: async () => {},
})

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PermissionsData | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me/permissions")
      if (res.ok) {
        const body = await res.json()
        setData(body.data)
      }
    } catch {
      // sin red o sesion vencida: se mantiene lo ultimo conocido
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    // Al volver el foco a la pestana se refrescan los permisos: un cambio de
    // rol hecho por el admin impacta sin re-login
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refresh])

  const can = useCallback(
    (module: string, action: "view" | "create" | "edit" | "delete" = "view") => {
      if (!data) return false
      const perms = data.modules[module]
      if (!perms) return false
      return perms[action] === true
    },
    [data]
  )

  return (
    <PermissionsContext.Provider
      value={{
        loading,
        roleName: data?.roleName || "",
        roleKey: data?.roleKey || "",
        canEditPrices: data?.canEditPrices || false,
        can,
        refresh,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
