"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Navigation,
    MapPin,
    Loader2,
    AlertCircle,
    X,
    Footprints,
    ArrowUp,
    LocateFixed,
} from "lucide-react"
import { useUserLocation } from "@/hooks/use-user-location"
import {
    calculateDistance,
    formatDistance,
    estimateWalkingTime,
    formatWalkingTime,
    calculateBearing,
    getCardinalDirection,
    findNearest,
} from "@/lib/geo-utils"
import { cn } from "@/lib/utils"

interface Stage {
    id: string
    name: string
    latitude: number
    longitude: number
    isTerminal?: boolean
}

interface StageNavigatorProps {
    stages: Stage[]
    routeName?: string
    routeColor?: string
    onStageSelect?: (stage: Stage) => void
    onClose?: () => void
    className?: string
}

export function StageNavigator({
    stages,
    routeName,
    routeColor = "#10B981",
    onStageSelect,
    onClose,
    className,
}: StageNavigatorProps) {
    const [selectedStage, setSelectedStage] = useState<Stage | null>(null)
    const { location, error, isLoading, isSupported, requestLocation } =
        useUserLocation({ watch: true })

    // Find nearest stage when we have location
    const navigation = useMemo(() => {
        if (!location) return null

        const target = selectedStage || findNearest(
            location.latitude,
            location.longitude,
            stages
        )?.location

        if (!target) return null

        const distance = calculateDistance(
            location.latitude,
            location.longitude,
            target.latitude,
            target.longitude
        )

        const bearing = calculateBearing(
            location.latitude,
            location.longitude,
            target.latitude,
            target.longitude
        )

        const walkingTime = estimateWalkingTime(distance)
        const direction = getCardinalDirection(bearing)

        return {
            stage: target,
            distance,
            walkingTime,
            bearing,
            direction,
        }
    }, [location, selectedStage, stages])

    const handleSelectStage = (stage: Stage) => {
        setSelectedStage(stage)
        onStageSelect?.(stage)
    }

    // Not supported state
    if (!isSupported) {
        return (
            <Card className={cn("", className)}>
                <CardContent className="flex flex-col items-center py-6 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                        Location not supported on this device
                    </p>
                </CardContent>
            </Card>
        )
    }

    // No location yet - prompt to enable
    if (!location && !isLoading && !error) {
        return (
            <Card className={cn("", className)}>
                <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <Navigation className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-foreground">Guide me to stage</p>
                                <p className="text-xs text-muted-foreground">
                                    Get walking directions
                                </p>
                            </div>
                        </div>
                        <Button onClick={requestLocation} size="sm" className="gap-1.5">
                            <LocateFixed className="h-4 w-4" />
                            Enable
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Loading state
    if (isLoading) {
        return (
            <Card className={cn("", className)}>
                <CardContent className="flex items-center justify-center gap-2 py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Getting location...</span>
                </CardContent>
            </Card>
        )
    }

    // Error state
    if (error) {
        return (
            <Card className={cn("border-destructive/30", className)}>
                <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
                        <div className="flex-1">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={requestLocation}>
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Navigation active
    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardContent className="p-0">
                {/* Header */}
                <div
                    className="flex items-center justify-between gap-2 px-4 py-3"
                    style={{ backgroundColor: `${routeColor}15` }}
                >
                    <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4" style={{ color: routeColor }} />
                        <span className="text-sm font-medium text-foreground">
                            Navigate to Stage
                        </span>
                    </div>
                    {onClose && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Navigation Info */}
                {navigation && (
                    <div className="p-4">
                        {/* Target Stage */}
                        <div className="flex items-center gap-3">
                            <div
                                className="relative flex h-12 w-12 items-center justify-center rounded-xl"
                                style={{ backgroundColor: `${routeColor}20` }}
                            >
                                <MapPin className="h-6 w-6" style={{ color: routeColor }} />
                                {/* Direction Arrow Overlay */}
                                <div
                                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-card shadow-md"
                                    style={{ transform: `rotate(${navigation.bearing}deg)` }}
                                >
                                    <ArrowUp className="h-3 w-3 text-primary" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-foreground truncate">
                                    {navigation.stage.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {navigation.direction} direction
                                </p>
                            </div>
                            {navigation.stage.isTerminal && (
                                <Badge variant="secondary" className="text-xs">
                                    Terminal
                                </Badge>
                            )}
                        </div>

                        {/* Distance & Time - BIG */}
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="flex flex-col items-center rounded-xl bg-muted p-4 text-center">
                                <Footprints className="h-6 w-6 text-primary" />
                                <p className="mt-2 text-2xl font-bold text-foreground">
                                    {formatDistance(navigation.distance)}
                                </p>
                                <p className="text-xs text-muted-foreground">Distance</p>
                            </div>
                            <div className="flex flex-col items-center rounded-xl bg-muted p-4 text-center">
                                <Navigation className="h-6 w-6 text-accent" />
                                <p className="mt-2 text-2xl font-bold text-foreground">
                                    {navigation.walkingTime} min
                                </p>
                                <p className="text-xs text-muted-foreground">Walking</p>
                            </div>
                        </div>

                        {/* Visual Direction Indicator */}
                        <div className="mt-4 flex flex-col items-center rounded-xl border border-border bg-muted/30 p-4">
                            <div
                                className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
                                style={{ transform: `rotate(${navigation.bearing}deg)` }}
                            >
                                <ArrowUp className="h-10 w-10 text-primary" />
                            </div>
                            <p className="mt-3 text-sm font-medium text-foreground">
                                Head {navigation.direction}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Keep walking for {formatWalkingTime(navigation.walkingTime)}
                            </p>
                        </div>

                        {/* Other Stages Quick Select */}
                        {stages.length > 1 && (
                            <div className="mt-4">
                                <p className="mb-2 text-xs font-medium text-muted-foreground">
                                    Or choose another stage:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {stages
                                        .filter((s) => s.id !== navigation.stage.id)
                                        .slice(0, 5)
                                        .map((stage) => (
                                            <Button
                                                key={stage.id}
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs"
                                                onClick={() => handleSelectStage(stage)}
                                            >
                                                {stage.name}
                                            </Button>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
