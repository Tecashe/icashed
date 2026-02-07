"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MapPin,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

// ─── Sidebar Context ──────────────────────────────────────────
interface SidebarContextType {
  isCollapsed: boolean
  isMobileOpen: boolean
  toggleCollapse: () => void
  openMobile: () => void
  closeMobile: () => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider")
  return ctx
}

// ─── Types ────────────────────────────────────────────────────
export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface DashboardShellProps {
  children: React.ReactNode
  navItems: NavItem[]
  portalLabel: string
}

// ─── Main Component ───────────────────────────────────────────
export function DashboardShell({
  children,
  navItems,
  portalLabel,
}: DashboardShellProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  // Sidebar state
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved === "true") setIsCollapsed(true)
  }, [])

  // Persist collapsed state
  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("sidebar-collapsed", String(next))
      return next
    })
  }

  const openMobile = () => setIsMobileOpen(true)
  const closeMobile = () => setIsMobileOpen(false)

  // Close mobile when route changes
  useEffect(() => {
    closeMobile()
  }, [pathname])

  const contextValue: SidebarContextType = {
    isCollapsed,
    isMobileOpen,
    toggleCollapse,
    openMobile,
    closeMobile,
  }

  return (
    <SidebarContext.Provider value={contextValue}>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* ─── Desktop Sidebar ─────────────────────────────────── */}
        <aside
          className={cn(
            "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
            isCollapsed ? "w-[72px]" : "w-64"
          )}
        >
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Link href="/" className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <span className="font-display text-lg font-bold text-foreground">
                    Radaa
                  </span>
                  <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {portalLabel}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== navItems[0]?.href &&
                    pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isCollapsed && "justify-center px-0"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <span className="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-card px-2 py-1 text-xs font-medium text-foreground shadow-lg ring-1 ring-border group-hover:block">
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Collapse toggle */}
          <div className="border-t border-border p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>

          {/* User section */}
          <div className="border-t border-border p-3">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                {!isCollapsed && (
                  <>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate text-sm font-medium text-foreground">
                        {user?.name || "User"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
              </button>
              {userMenuOpen && (
                <div className={cn(
                  "absolute bottom-full mb-1 w-full rounded-xl border border-border bg-card p-1 shadow-lg",
                  isCollapsed && "left-full ml-2 bottom-0 w-auto"
                )}>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      signOut()
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ─── Mobile Sidebar ──────────────────────────────────── */}
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity lg:hidden",
            isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={closeMobile}
          aria-hidden="true"
        />

        {/* Drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out lg:hidden",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <MapPin className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display text-lg font-bold text-foreground">
                  Radaa
                </span>
                <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {portalLabel}
                </span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={closeMobile}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== navItems[0]?.href &&
                    pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                closeMobile()
                signOut()
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* ─── Main Content ────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
            {/* Mobile menu button - large touch target */}
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 lg:hidden"
              onClick={openMobile}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
