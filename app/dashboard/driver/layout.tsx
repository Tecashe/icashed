"use client"

import React from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { LayoutDashboard, Bus, Navigation, Plus } from "lucide-react"
import type { NavItem } from "@/components/dashboard/dashboard-shell"

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard/driver", icon: LayoutDashboard },
  { label: "My Vehicles", href: "/dashboard/driver/vehicles", icon: Bus },
  { label: "Live Tracking", href: "/dashboard/driver/tracking", icon: Navigation },
  { label: "Register Vehicle", href: "/dashboard/driver/register", icon: Plus },
]

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardShell navItems={NAV_ITEMS} portalLabel="Driver">
      {children}
    </DashboardShell>
  )
}
