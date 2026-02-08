"use client"

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Search, X, Map, Navigation, MapPin, ChevronRight, Circle } from "lucide-react"

export interface Route {
    id: string
    name: string
    color: string
    vehicleCount: number
    activeVehicles: number
    stages: { name: string; isTerminal: boolean }[]
    isActive?: boolean
}

interface RoutesSidebarProps {
    routes: Route[]
    selectedRouteId?: string | null
    onRouteSelect?: (routeId: string) => void
    onClose?: () => void
    className?: string
}

export function RoutesSidebar({
    routes,
    selectedRouteId,
    onRouteSelect,
    onClose,
    className,
}: RoutesSidebarProps) {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredRoutes = routes.filter((route) =>
        route.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div
            className={cn(
                "flex h-full w-full flex-col bg-card border-r border-border shadow-xl",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4 lg:p-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Map className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Routes</h2>
                        <p className="text-xs text-muted-foreground">
                            {routes.length} active {routes.length === 1 ? "route" : "routes"}
                        </p>
                    </div>
                </div>
                {onClose && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="lg:hidden"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="border-b border-border p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search routes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-10"
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                            onClick={() => setSearchQuery("")}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Routes List */}
            <ScrollArea className="flex-1">
                <div className="space-y-2 p-4">
                    {filteredRoutes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <Map className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No routes found</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Try adjusting your search
                            </p>
                        </div>
                    ) : (
                        filteredRoutes.map((route) => (
                            <RouteCard
                                key={route.id}
                                route={route}
                                isSelected={selectedRouteId === route.id}
                                onSelect={() => onRouteSelect?.(route.id)}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

interface RouteCardProps {
    route: Route
    isSelected: boolean
    onSelect: () => void
}

function RouteCard({ route, isSelected, onSelect }: RouteCardProps) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                "group relative w-full rounded-xl border p-4 text-left transition-all",
                "hover:shadow-md",
                isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/50"
            )}
        >
            {/* Route Color Indicator */}
            <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
                style={{ backgroundColor: route.color }}
            />

            {/* Content */}
            <div className="ml-3">
                {/* Route Name & Status */}
                <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <h3 className="font-semibold text-foreground leading-tight">
                            {route.name}
                        </h3>
                        <div className="mt-1.5 flex items-center gap-2">
                            <Badge
                                variant={route.activeVehicles > 0 ? "default" : "secondary"}
                                className="h-5 text-xs"
                            >
                                <Circle
                                    className={cn(
                                        "mr-1 h-2 w-2 fill-current",
                                        route.activeVehicles > 0 && "animate-pulse"
                                    )}
                                />
                                {route.activeVehicles} / {route.vehicleCount} live
                            </Badge>
                        </div>
                    </div>
                    <ChevronRight
                        className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform",
                            "group-hover:translate-x-1",
                            isSelected && "text-primary"
                        )}
                    />
                </div>

                {/* Stages Preview */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Navigation className="h-3 w-3 flex-shrink-0" />
                        <span className="line-clamp-1">{route.stages[0]?.name}</span>
                    </div>
                    {route.stages.length > 1 && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="line-clamp-1">
                                {route.stages[route.stages.length - 1]?.name}
                            </span>
                        </div>
                    )}
                    {route.stages.length > 2 && (
                        <p className="pl-5 text-[10px]">
                            +{route.stages.length - 2} more {route.stages.length - 2 === 1 ? "stop" : "stops"}
                        </p>
                    )}
                </div>
            </div>
        </button>
    )
}
