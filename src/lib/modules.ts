// Modulos del sistema. Fuente unica de verdad: el ABM de roles, el seed y los
// guards usan esta lista. Un modulo sin fila en RolePermission = sin acceso.
// Vive separado de permissions.ts para poder importarse desde componentes
// cliente (permissions.ts arrastra prisma y next-auth, server-only).

export const MODULES: Array<{ key: string; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "calendar", label: "Calendario" },
  { key: "clients", label: "Clientes" },
  { key: "quotes", label: "Cotizaciones" },
  { key: "sellers", label: "Vendedores" },
  { key: "inventory", label: "Inventario (mobiliario)" },
  { key: "products", label: "Productos" },
  { key: "locations", label: "Ubicaciones" },
  { key: "rooms", label: "Habitaciones" },
  { key: "categories", label: "Categorías" },
  { key: "expenses", label: "Gastos" },
  { key: "events", label: "Eventos (liquidación)" },
  { key: "closings", label: "Cierres diarios" },
  { key: "reports_cobranza", label: "Reporte de cobranza" },
  { key: "reports_ocupacion", label: "Reporte de ocupación" },
  { key: "screen", label: "Pantalla TV" },
  { key: "users", label: "Usuarios" },
  { key: "roles", label: "Roles y permisos" },
]

export const MODULE_KEYS = MODULES.map((m) => m.key)
