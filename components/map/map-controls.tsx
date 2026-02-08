"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
    MapPin,
    Navigation,
    Locate,
    Menu,
    Layers,
    AlertCircle,
    Wifi,
    WifiOff,
    Circle,
} from "lucide-react"

interface MapControlsProps {
    onMenuClick?: () => void
    onLocateUser?: () => void
    onRecenterMap?: () => void
    onToggleLayers?: () => void
    userLocationEnabled?: boolean
    isConnected?: boolean
    nearbyVehicleCount?: number
    className?: string
}

export function MapControls({
    onMenuClick,
    onLocateUser,
    onRecenterMap,
    onToggleLayers,
    userLocationEnabled = false,
    isConnected = true,
    nearbyVehicleCount,
    className,
}: MapControlsProps) {
    return (
        <div
            className={cn(
                "pointer-events-none absolute inset-0 z-[1000]",
                "flex flex-col",
                className
            )}
        >
            {/* Top Bar */}
            <div className="flex items-start justify-between p-4 lg:p-6">
                {/* Left: Menu Button (mobile only) */}
                <div className="pointer-events-auto lg:hidden">
                    <Button
                        size="icon"
                        variant="default"
                        onClick={onMenuClick}
                        className="h-12 w-12 rounded-xl shadow-lg"
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>

                {/* Right: Status Indicators */}
                <div className="pointer-events-auto ml-auto flex flex-col items-end gap-2">
                    {/* Connection Status */}
                    <Badge
                        variant={isConnected ? "default" : "destructive"}
                        className={cn(
                            "gap-2 shadow-lg backdrop-blur-sm",
                            isConnected ? "bg-card/90 text-foreground border-border" : ""
                        )}
                    >
                        {isConnected ? (
                            <>
                                <Circle className="h-2 w-2 animate-pulse fill-green-500 text-green-500" />
                                <Wifi className="h-3 w-3" />
                                <span className="text-xs font-medium">Connected</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-3 w-3" />
                                <span className="text-xs font-medium">Offline</span>
                            </>
                        )}
                    </Badge>

                    {/* Nearby Vehicles Alert */}
                    {nearbyVehicleCount !== undefined && nearbyVehicleCount > 0 && (
                        <Badge
                            variant="default"
                            className="gap-2 bg-accent text-accent-foreground shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2"
                        >
                            <AlertCircle className="h-3 w-3" />
                            <span className="text-xs font-medium">
                                {nearbyVehicleCount} {nearbyVehicleCount === 1 ? "vehicle" : "vehicles"} nearby
                            </span>
                        </Badge>
                    )}
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Bottom Right: Action Buttons */}
            <div className="flex items-end justify-between p-4 lg:p-6">
                {/* Bottom Left: Layer Toggle (optional) */}
                {onToggleLayers && (
                    <div className="pointer-events-auto">
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={onToggleLayers}
                            className="h-12 w-12 rounded-xl shadow-lg"
                        >
                            <Layers className="h-5 w-5" />
                        </Button>
                    </div>
                )}

                {/* Bottom Right: Location & Recenter */}
                <div className="pointer-events-auto ml-auto flex flex-col gap-3">
                    {/* Locate User */}
                    {onLocateUser && (
                        <Button
                            size="icon"
                            variant={userLocationEnabled ? "default" : "secondary"}
                            onClick={onLocateUser}
                            className={cn(
                                "h-12 w-12 rounded-xl shadow-lg",
                                userLocationEnabled && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            )}
                        >
                            <Locate className={cn("h-5 w-5", userLocationEnabled && "animate-pulse")} />
                        </Button>
                    )}

                    {/* Recenter Map */}
                    {onRecenterMap && (
                        <Button
                            size="icon"
                            variant="secondary"
                            onClick={onRecenterMap}
                            className="h-12 w-12 rounded-xl shadow-lg"
                        >
                            <Navigation className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

interface GuidanceBannerProps {
    message: string
    distance?: string
    direction?: string
    onDismiss?: () => void
    className?: string
}

export function GuidanceBanner({
    message,
    distance,
    direction,
    onDismiss,
    className,
}: GuidanceBannerProps) {
    return (
        <div
            className={cn(
                "pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2",
                "w-[calc(100%-2rem)] max-w-md",
                "rounded-xl border border-border bg-card/95 backdrop-blur-sm shadow-xl",
                "p-4 animate-in fade-in slide-in-from-top-4",
                className
            )}
        >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">
                        {message}
                    </p>
                    {(distance || direction) && (
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                            {distance && <span>{distance}</span>}
                            {direction && (
                                <>
                                    {distance && <span>•</span>}
                                    <span>{direction}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
                {onDismiss && (
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onDismiss}
                        className="h-8 w-8 flex-shrink-0"
                    >
                        <Circle className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
