"use client"

import React from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { LayoutDashboard, Route, Map, AlertTriangle, Bookmark } from "lucide-react"
import type { NavItem } from "@/components/dashboard/dashboard-shell"

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard/passenger", icon: LayoutDashboard },
  { label: "Browse Routes", href: "/dashboard/passenger/routes", icon: Route },
  { label: "Saved Routes", href: "/dashboard/passenger/saved", icon: Bookmark },
  { label: "Live Map", href: "/dashboard/passenger/map", icon: Map },
  { label: "Report Issue", href: "/dashboard/passenger/reports", icon: AlertTriangle },
]

export default function PassengerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell navItems={NAV_ITEMS} portalLabel="Passenger">
      {children}
    </DashboardShell>
  )
}
