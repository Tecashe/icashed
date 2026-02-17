"use client"

import React from "react"

import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import {
    LayoutDashboard,
    Users,
    Bus,
    Route,
    Wallet,
    Settings,
} from "lucide-react"
import type { NavItem } from "@/components/dashboard/dashboard-shell"

const NAV_ITEMS: NavItem[] = [
    { label: "Overview", href: "/dashboard/sacco", icon: LayoutDashboard },
    { label: "Members", href: "/dashboard/sacco/members", icon: Users },
    { label: "Vehicles", href: "/dashboard/sacco/vehicles", icon: Bus },
    { label: "Routes", href: "/dashboard/sacco/routes", icon: Route },
    { label: "Collections", href: "/dashboard/sacco/collections", icon: Wallet },
    { label: "Settings", href: "/dashboard/sacco/settings", icon: Settings },
]

export default function SaccoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <DashboardShell navItems={NAV_ITEMS} portalLabel="SACCO">
            {children}
        </DashboardShell>
    )
}
