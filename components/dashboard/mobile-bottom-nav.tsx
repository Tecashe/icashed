"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { NavItem } from "@/components/dashboard/dashboard-shell"

interface MobileBottomNavProps {
    navItems: NavItem[]
    className?: string
}

export function MobileBottomNav({ navItems, className }: MobileBottomNavProps) {
    const pathname = usePathname()

    // Show max 5 items on mobile to prevent overcrowding
    const visibleItems = navItems.slice(0, 5)

    return (
        <nav
            className={cn(
                "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg lg:hidden",
                // Safe area padding for mobile browsers (iPhone notch, etc.)
                "pb-[env(safe-area-inset-bottom)]",
                className
            )}
        >
            <div className="flex items-center justify-around px-2">
                {visibleItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== navItems[0]?.href && pathname.startsWith(item.href))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex min-h-[56px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 px-2 py-2 transition-colors",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground active:text-foreground"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "h-6 w-6 transition-transform",
                                    isActive && "scale-110"
                                )}
                            />
                            <span
                                className={cn(
                                    "text-[10px] font-medium leading-none",
                                    isActive && "font-semibold"
                                )}
                            >
                                {item.label.length > 10
                                    ? item.label.slice(0, 8) + "..."
                                    : item.label}
                            </span>
                            {isActive && (
                                <span className="absolute bottom-1 h-1 w-6 rounded-full bg-primary" />
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
