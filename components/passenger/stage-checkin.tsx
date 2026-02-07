"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Clock, Loader2, X, Navigation } from "lucide-react"
import { fetcher } from "@/lib/api-client"

interface Stage {
    id: string
    name: string
    latitude: number
    longitude: number
    distance: number
    waitingCount: number
    route: {
        id: string
        name: string
        code: string
        color: string
    }
}

interface Presence {
    id: string
    stageId: string
    expiresAt: string
    stage: {
        id: string
        name: string
        latitude: number
        longitude: number
    }
    route: {
        id: string
        name: string
        code: string
        color: string
    }
}

export function StageCheckin() {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [locationError, setLocationError] = useState<string | null>(null)

    // Get current presence status
    const { data: presenceData, isLoading: presenceLoading } = useSWR<{ presence: Presence | null }>(
        "/api/passenger/presence",
        fetcher,
        { refreshInterval: 30000 }
    )

    // Get nearby stages when location available
    const { data: stagesData, isLoading: stagesLoading } = useSWR<{ stages: Stage[] }>(
        location ? `/api/passenger/stages/nearby?lat=${location.lat}&lng=${location.lng}` : null,
        fetcher
    )

    const presence = presenceData?.presence
    const isCheckedIn = !!presence

    // Get location when sheet opens
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open)
        if (open && !location) {
            getLocation()
        }
    }

    const getLocation = () => {
        if (!navigator.geolocation) {
            setLocationError("Location not supported")
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                })
                setLocationError(null)
            },
            () => {
                setLocationError("Unable to get location")
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    // Check in at a stage
    const handleCheckin = async (stageId: string) => {
        setIsLoading(true)
        try {
            await fetch("/api/passenger/presence", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stageId, durationMinutes: 30 }),
            })
            await mutate("/api/passenger/presence")
            setIsOpen(false)
        } catch (error) {
            console.error("Check-in failed:", error)
        } finally {
            setIsLoading(false)
        }
    }

    // Check out
    const handleCheckout = async () => {
        setIsLoading(true)
        try {
            await fetch("/api/passenger/presence", { method: "DELETE" })
            await mutate("/api/passenger/presence")
        } catch (error) {
            console.error("Check-out failed:", error)
        } finally {
            setIsLoading(false)
        }
    }

    // Calculate remaining time
    const getRemainingTime = () => {
        if (!presence?.expiresAt) return null
        const remaining = new Date(presence.expiresAt).getTime() - Date.now()
        if (remaining <= 0) return null
        return Math.ceil(remaining / 60000)
    }

    const remainingMinutes = getRemainingTime()

    // If checked in, show current status
    if (isCheckedIn && presence) {
        return (
            <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <MapPin className="h-8 w-8 text-primary" />
                                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                                </span>
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">
                                    Waiting at {presence.stage.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge
                                        variant="secondary"
                                        style={{ backgroundColor: `${presence.route.color}20`, color: presence.route.color }}
                                    >
                                        {presence.route.code}
                                    </Badge>
                                    {remainingMinutes && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {remainingMinutes} min left
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCheckout}
                            disabled={isLoading}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <X className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Not checked in - show check-in button
    return (
        <Sheet open={isOpen} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button
                    size="lg"
                    className="w-full h-14 gap-3 text-base font-medium"
                >
                    <MapPin className="h-5 w-5" />
                    I&apos;m at a Stage
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                <SheetHeader className="text-left pb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <Navigation className="h-5 w-5 text-primary" />
                        Select Your Stage
                    </SheetTitle>
                </SheetHeader>

                {locationError ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <MapPin className="h-12 w-12 text-muted-foreground/30" />
                        <p className="mt-4 text-muted-foreground">{locationError}</p>
                        <Button variant="outline" onClick={getLocation} className="mt-4">
                            Try Again
                        </Button>
                    </div>
                ) : stagesLoading || !stagesData ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : stagesData.stages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <MapPin className="h-12 w-12 text-muted-foreground/30" />
                        <p className="mt-4 text-muted-foreground">No stages nearby</p>
                        <p className="text-sm text-muted-foreground/70">
                            Move closer to a bus stop or stage
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[50vh]">
                        {stagesData.stages.map((stage) => (
                            <button
                                key={stage.id}
                                onClick={() => handleCheckin(stage.id)}
                                disabled={isLoading}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                            >
                                <div
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                                    style={{ backgroundColor: `${stage.route.color}20` }}
                                >
                                    <MapPin className="h-6 w-6" style={{ color: stage.route.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">
                                        {stage.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="secondary" className="text-xs">
                                            {stage.route.code}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {stage.distance.toFixed(1)} km away
                                        </span>
                                    </div>
                                </div>
                                {stage.waitingCount > 0 && (
                                    <Badge variant="outline" className="shrink-0">
                                        <Users className="h-3 w-3 mr-1" />
                                        {stage.waitingCount}
                                    </Badge>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
