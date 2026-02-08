"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    X,
    Search,
    Layers,
    Route,
    ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { RouteData } from "@/hooks/use-data"

interface RouteBottomSheetProps {
    isOpen: boolean
    onClose: () => void
    routes: RouteData[]
    selectedRouteId: string | null
    onSelectRoute: (routeId: string | null) => void
    vehiclesPerRoute: Map<string, number>
}

export function RouteBottomSheet({
    isOpen,
    onClose,
    routes,
    selectedRouteId,
    onSelectRoute,
    vehiclesPerRoute,
}: RouteBottomSheetProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const sheetRef = useRef<HTMLDivElement>(null)
    const startYRef = useRef(0)
    const currentYRef = useRef(0)

    // Filter routes by search
    const filteredRoutes = routes.filter((route) =>
        route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.destination.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Gesture handling
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startYRef.current = e.touches[0].clientY
        currentYRef.current = e.touches[0].clientY
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        currentYRef.current = e.touches[0].clientY
    }, [])

    const handleTouchEnd = useCallback(() => {
        const deltaY = currentYRef.current - startYRef.current
        if (deltaY > 100) {
            onClose()
        }
    }, [onClose])

    const handleSelectRoute = (routeId: string | null) => {
        onSelectRoute(routeId)
        onClose()
    }

    const totalVehicles = Array.from(vehiclesPerRoute.values()).reduce((a, b) => a + b, 0)

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[10000] bg-background/60 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sheet */}
            <div
                ref={sheetRef}
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-[10001] rounded-t-3xl border-t border-border bg-card shadow-2xl transition-transform duration-300 ease-out md:hidden",
                    isOpen ? "translate-y-0" : "translate-y-full"
                )}
                style={{ maxHeight: "85vh" }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="flex items-center justify-center py-3">
                    <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-4 pb-3">
                    <div className="flex items-center gap-2">
                        <Route className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-lg font-semibold text-foreground">
                            Select Route
                        </h2>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Search */}
                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search routes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-muted border-0 h-12 text-base"
                        />
                    </div>
                </div>

                {/* Routes List */}
                <ScrollArea className="max-h-[60vh] px-4 pb-8">
                    {/* All Routes Option */}
                    <button
                        type="button"
                        onClick={() => handleSelectRoute(null)}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left transition-colors mb-2",
                            !selectedRouteId
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-foreground">All Routes</p>
                            <p className="text-sm text-muted-foreground">
                                Show all vehicles
                            </p>
                        </div>
                        <span className="text-sm font-semibold">{totalVehicles}</span>
                    </button>

                    {/* Route Items */}
                    {filteredRoutes.map((route) => {
                        const count = vehiclesPerRoute.get(route.id) || 0
                        return (
                            <button
                                type="button"
                                key={route.id}
                                onClick={() => handleSelectRoute(route.id)}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left transition-colors mb-2",
                                    selectedRouteId === route.id
                                        ? "bg-primary/10"
                                        : "hover:bg-muted"
                                )}
                            >
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                                    style={{ backgroundColor: `${route.color}20` }}
                                >
                                    <div
                                        className="h-4 w-4 rounded-full"
                                        style={{ backgroundColor: route.color }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">{route.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {route.origin} → {route.destination}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-sm font-semibold text-foreground">{count}</span>
                                    <span className="text-[10px] text-muted-foreground">vehicles</span>
                                </div>
                            </button>
                        )
                    })}

                    {filteredRoutes.length === 0 && searchQuery && (
                        <div className="flex flex-col items-center py-8 text-center">
                            <Search className="h-10 w-10 text-muted-foreground/30" />
                            <p className="mt-3 text-sm text-muted-foreground">
                                No routes found for "{searchQuery}"
                            </p>
                        </div>
                    )}
                </ScrollArea>

                {/* Collapse hint */}
                <button
                    onClick={onClose}
                    className="flex w-full items-center justify-center gap-1 py-3 text-xs text-muted-foreground border-t border-border"
                >
                    <ChevronDown className="h-4 w-4" />
                    <span>Swipe down to close</span>
                </button>
            </div>
        </>
    )
}
