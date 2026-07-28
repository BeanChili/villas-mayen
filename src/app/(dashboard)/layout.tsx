"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Package,
  Wallet,
  Archive,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  MapPin,
  ShoppingBag,
  Home,
  Tag,
  Monitor,
  Coins,
  CalendarRange,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useEffect, useState } from "react"
import { PermissionsProvider, usePermissions } from "@/components/permissions-provider"

// Cada item declara su modulo: el menu solo muestra lo que el rol puede VER
const mainNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, module: "dashboard" },
  { name: "Calendario", href: "/calendar", icon: Calendar, module: "calendar" },
  { name: "Clientes", href: "/clients", icon: Users, module: "clients" },
  { name: "Cotizaciones", href: "/quotes", icon: FileText, module: "quotes" },
  { name: "Inventario", href: "/inventory", icon: Package, module: "inventory" },
  { name: "Categorías", href: "/settings/categories", icon: Tag, module: "categories" },
]

const catalogNavigation = [
  { name: "Ubicaciones", href: "/catalog/locations", icon: MapPin, module: "locations" },
  { name: "Productos", href: "/catalog/products", icon: ShoppingBag, module: "products" },
  { name: "Habitaciones", href: "/rooms", icon: Home, module: "rooms" },
]

const bottomNavigation = [
  { name: "Gastos", href: "/expenses", icon: Wallet, module: "expenses" },
  { name: "Cobranza", href: "/reports/cobranza", icon: Coins, module: "reports_cobranza" },
  { name: "Ocupación", href: "/reports/ocupacion", icon: CalendarRange, module: "reports_ocupacion" },
  { name: "Eventos", href: "/events", icon: Archive, module: "events" },
  { name: "Cierres", href: "/reports/closings", icon: BookOpen, module: "closings" },
  { name: "Pantalla TV", href: "/screen", icon: Monitor, module: "screen" },
  { name: "Configuración", href: "/settings", icon: Settings, module: "users" },
]

const allNavigation = [...mainNavigation, ...catalogNavigation, ...bottomNavigation]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PermissionsProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </PermissionsProvider>
  )
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { can, roleName } = usePermissions()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const visibleMain = mainNavigation.filter((item) => can(item.module))
  const visibleCatalog = catalogNavigation.filter((item) => can(item.module))
  const visibleBottom = bottomNavigation.filter((item) => can(item.module))

  // Recordar el estado colapsado entre sesiones
  useEffect(() => {
    setCollapsed(localStorage.getItem("vm-sidebar-collapsed") === "1")
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem("vm-sidebar-collapsed", next ? "1" : "0")
      return next
    })
  }

  // className compartido para los links — en desktop colapsado quedan centrados sin texto
  const linkClass = (isActive: boolean, indent = false) =>
    cn(
      "vm-sidebar-link",
      indent && !collapsed && "pl-9",
      collapsed && "lg:justify-center lg:px-0",
      isActive ? "vm-sidebar-link--active" : "vm-sidebar-link--idle"
    )

  const renderLink = (item: { name: string; href: string; icon: any }, isActive: boolean, indent = false) => (
    <Link
      key={item.name}
      href={item.href}
      title={collapsed ? item.name : undefined}
      className={linkClass(isActive, indent)}
      onClick={() => setSidebarOpen(false)}
    >
      <item.icon className="w-[18px] h-[18px] shrink-0" />
      <span className={cn(collapsed && "lg:hidden")}>{item.name}</span>
    </Link>
  )

  // La Pantalla TV se muestra a pantalla completa, sin barra lateral ni topbar
  if (pathname === "/screen") {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 vm-sidebar transform transition-all duration-200 lg:translate-x-0 flex flex-col",
          collapsed && "lg:w-16",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center h-16 border-b border-border shrink-0", collapsed ? "lg:justify-center lg:px-0 px-6 justify-between" : "px-6 justify-between")}>
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Casa Villas Magen" width={32} height={32} className="rounded-md object-contain shrink-0" />
            <span className={cn("font-display text-lg text-foreground tracking-tight truncate", collapsed && "lg:hidden")}>
              Casa Villas Magen
            </span>
          </Link>
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-0.5 flex-1 overflow-y-auto">
          {visibleMain.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/")) ||
              (item.href === "/" && pathname === "/")
            return renderLink(item, isActive)
          })}

          {visibleCatalog.length > 0 && (
            <div className="pt-2">
              <div className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2", collapsed && "lg:justify-center lg:px-0")}>
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className={cn(collapsed && "lg:hidden")}>Catálogo</span>
              </div>
              <div className="space-y-0.5">
                {visibleCatalog.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return renderLink(item, isActive, true)
                })}
              </div>
            </div>
          )}

          {visibleBottom.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/")) ||
              (item.href === "/" && pathname === "/")
            return renderLink(item, isActive)
          })}
        </nav>

        {/* User section */}
        <div className="shrink-0 px-3 py-4 border-t border-border">
          <div className={cn("flex items-center gap-3 px-3 mb-3", collapsed && "lg:justify-center lg:px-0")}>
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div className={cn("flex-1 min-w-0", collapsed && "lg:hidden")}>
              <p className="text-sm font-medium text-foreground truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {roleName || "usuario"}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={collapsed ? "Cerrar Sesión" : undefined}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground rounded-lg hover:bg-secondary hover:text-foreground transition-all duration-150",
              collapsed && "lg:justify-center lg:px-0"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn("transition-all duration-200", collapsed ? "lg:pl-16" : "lg:pl-64")}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-sm border-b border-border flex items-center px-4 lg:px-8">
          {/* Toggle: abre overlay en mobile, colapsa el rail en desktop */}
          <button
            className="lg:hidden mr-4 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            className="hidden lg:flex mr-4 text-muted-foreground hover:text-foreground transition-colors"
            onClick={toggleCollapsed}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          <div className="flex-1">
            <h1 className="text-[15px] font-semibold text-foreground">
              {allNavigation.find(n =>
                n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)
              )?.name || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground font-medium tracking-wide">
              {new Date().toLocaleDateString("es-GT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
