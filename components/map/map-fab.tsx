"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Locate,
    Loader2,
    Compass,
    Maximize2,
    Minimize2,
    Search
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUserLocation } from "@/hooks/use-user-location"

interface MapFABProps {
    onCenterUser?: (lat: number, lng: number) => void
    onToggleFullScreen?: () => void
    onSearchRoutes?: () => void
    isFullScreen?: boolean
    className?: string
}

export function MapFAB({
    onCenterUser,
    onToggleFullScreen,
    onSearchRoutes,
    isFullScreen = false,
    className,
}: MapFABProps) {
    const { location, isLoading, requestLocation } = useUserLocation({ watch: false })
    const [isLocating, setIsLocating] = useState(false)

    const handleLocate = async () => {
        setIsLocating(true)
        try {
            await requestLocation()
        } finally {
            setIsLocating(false)
        }
    }

    // When location updates, center the map
    useEffect(() => {
        if (location && onCenterUser && isLocating) {
            onCenterUser(location.latitude, location.longitude)
            setIsLocating(false)
        }
    }, [location, onCenterUser, isLocating])

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            {/* Search Routes */}
            <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full bg-card/95 shadow-lg backdrop-blur-sm hover:bg-card border border-border"
                onClick={onSearchRoutes}
                title="Search routes"
            >
                <Search className="h-5 w-5" />
            </Button>

            {/* Full Screen Toggle */}
            <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full bg-card/95 shadow-lg backdrop-blur-sm hover:bg-card border border-border"
                onClick={onToggleFullScreen}
                title={isFullScreen ? "Exit full screen" : "Full screen"}
            >
                {isFullScreen ? (
                    <Minimize2 className="h-5 w-5" />
                ) : (
                    <Maximize2 className="h-5 w-5" />
                )}
            </Button>

            {/* My Location - Primary FAB */}
            <Button
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg",
                    isLocating && "animate-pulse"
                )}
                onClick={handleLocate}
                disabled={isLoading}
                title="My location"
            >
                {isLoading || isLocating ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <Locate className="h-6 w-6" />
                )}
            </Button>
        </div>
    )
}
