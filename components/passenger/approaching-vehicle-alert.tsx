"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bus, X, Navigation, Clock, Bell } from "lucide-react"
import { useRouteNotifications } from "@/hooks/use-route-notifications"
import type { VehicleApproachingPayload } from "@/lib/pusher"
import { cn } from "@/lib/utils"

interface ApproachingVehicleAlertProps {
    routeId?: string
    stageId?: string
    stageName?: string
    onVehicleClick?: (vehicleId: string) => void
    className?: string
}

export function ApproachingVehicleAlert({
    routeId,
    stageId,
    stageName,
    onVehicleClick,
    className,
}: ApproachingVehicleAlertProps) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set())
    const [showAll, setShowAll] = useState(false)

    const { approaching, nearestApproaching } = useRouteNotifications({
        routeId,
        stageId,
    })

    // Filter out dismissed vehicles
    const activeAlerts = approaching.filter((v) => !dismissed.has(v.vehicleId))

    // Show toast-like notification for new approaching vehicles
    useEffect(() => {
        if (nearestApproaching && !dismissed.has(nearestApproaching.vehicleId)) {
            // Could trigger browser notification here if permission granted
            if ("vibrate" in navigator) {
                navigator.vibrate([100, 50, 100])
            }
        }
    }, [nearestApproaching, dismissed])

    const handleDismiss = (vehicleId: string) => {
        setDismissed((prev) => new Set([...prev, vehicleId]))
    }

    if (activeAlerts.length === 0) {
        return null
    }

    const displayedAlerts = showAll ? activeAlerts : activeAlerts.slice(0, 2)

    return (
        <div className={cn("space-y-2", className)}>
            {displayedAlerts.map((vehicle) => (
                <Card
                    key={vehicle.vehicleId}
                    className="overflow-hidden border-primary/30 bg-primary/5 animate-in fade-in slide-in-from-top-2"
                >
                    <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                            {/* Bus Icon */}
                            <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                style={{ backgroundColor: vehicle.routeColor }}
                            >
                                <Bus className="h-5 w-5 text-white" />
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-foreground truncate">
                                        {vehicle.plateNumber}
                                    </p>
                                    {vehicle.nickname && (
                                        <span className="text-xs text-muted-foreground truncate">
                                            {vehicle.nickname}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge
                                        variant="secondary"
                                        className="text-xs gap-1 bg-primary/10 text-primary"
                                    >
                                        <Clock className="h-3 w-3" />
                                        {vehicle.etaMinutes <= 1 ? "< 1" : vehicle.etaMinutes} min
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        {Math.round(vehicle.distanceMeters)}m away
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => onVehicleClick?.(vehicle.vehicleId)}
                                >
                                    <Navigation className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleDismiss(vehicle.vehicleId)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Stage info */}
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Bell className="h-3 w-3 text-primary" />
                            <span>
                                Approaching <span className="font-medium">{stageName || vehicle.stageName}</span>
                            </span>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {activeAlerts.length > 2 && !showAll && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowAll(true)}
                >
                    Show {activeAlerts.length - 2} more approaching vehicles
                </Button>
            )}
        </div>
    )
}

// Compact version for map overlay
export function ApproachingVehicleBadge({
    routeId,
    stageId,
    onVehicleClick,
}: {
    routeId?: string
    stageId?: string
    onVehicleClick?: (vehicleId: string) => void
}) {
    const { nearestApproaching, approaching } = useRouteNotifications({
        routeId,
        stageId,
    })

    if (!nearestApproaching) return null

    return (
        <button
            type="button"
            onClick={() => onVehicleClick?.(nearestApproaching.vehicleId)}
            className="flex items-center gap-2 rounded-full bg-primary/90 px-3 py-2 text-primary-foreground shadow-lg backdrop-blur-sm animate-in fade-in"
        >
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
            </span>
            <Bus className="h-4 w-4" />
            <span className="text-sm font-medium">
                {nearestApproaching.plateNumber}
            </span>
            <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                {nearestApproaching.etaMinutes <= 1 ? "< 1" : nearestApproaching.etaMinutes} min
            </Badge>
            {approaching.length > 1 && (
                <span className="text-xs opacity-80">+{approaching.length - 1}</span>
            )}
        </button>
    )
}
