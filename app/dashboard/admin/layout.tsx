"use client"

import React from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import {
  LayoutDashboard,
  Users,
  Route,
  Bus,
  AlertTriangle,
  Map,
} from "lucide-react"
import type { NavItem } from "@/components/dashboard/dashboard-shell"

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
  { label: "Users", href: "/dashboard/admin/users", icon: Users },
  { label: "Routes", href: "/dashboard/admin/routes", icon: Route },
  { label: "Vehicles", href: "/dashboard/admin/vehicles", icon: Bus },
  { label: "Reports", href: "/dashboard/admin/reports", icon: AlertTriangle },
  { label: "Live Map", href: "/dashboard/admin/map", icon: Map },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell navItems={NAV_ITEMS} portalLabel="Admin">
      {children}
    </DashboardShell>
  )
}
