"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    X,
    Bus,
    Navigation,
    Timer,
    MapPin,
    Star,
    MessageSquare,
    ChevronUp,
    ChevronDown,
    Target,
    Route,
    Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LivePosition } from "@/hooks/use-data"
import type { useVehicleProgress } from "@/hooks/use-vehicle-progress"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { ReviewForm } from "@/components/reviews/review-form"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"

// Sheet states
type SheetState = "hidden" | "peek" | "half" | "full"

interface VehicleSheetProps {
    vehicle: LivePosition | null
    progress: ReturnType<typeof useVehicleProgress>
    onClose: () => void
    className?: string
}

const SHEET_HEIGHTS: Record<SheetState, string> = {
    hidden: "translate-y-full",
    peek: "translate-y-[calc(100%-90px)]",  // Just plate + ETA visible
    half: "translate-y-[50%]",               // Plus speed, next stop
    full: "translate-y-[10%]",               // Full details
}

export function VehicleSheet({ vehicle, progress, onClose, className }: VehicleSheetProps) {
    const [sheetState, setSheetState] = useState<SheetState>("hidden")
    const [showReviewForm, setShowReviewForm] = useState(false)
    const sheetRef = useRef<HTMLDivElement>(null)
    const startYRef = useRef(0)
    const currentYRef = useRef(0)

    // Fetch vehicle rating
    const { data: reviewsData } = useSWR(
        vehicle ? `/api/reviews?vehicleId=${vehicle.vehicleId}&limit=5` : null,
        fetcher
    )
    const recentReviews = reviewsData?.reviews || []
    const avgRating = recentReviews.length > 0
        ? recentReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / recentReviews.length
        : null

    // Update sheet state when vehicle changes
    useEffect(() => {
        if (vehicle) {
            setSheetState("peek")
        } else {
            setSheetState("hidden")
        }
    }, [vehicle])

    // Gesture handling for swipe
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startYRef.current = e.touches[0].clientY
        currentYRef.current = e.touches[0].clientY
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        currentYRef.current = e.touches[0].clientY
    }, [])

    const handleTouchEnd = useCallback(() => {
        const deltaY = currentYRef.current - startYRef.current
        const threshold = 50

        if (Math.abs(deltaY) < threshold) return

        if (deltaY < 0) {
            // Swipe up - expand
            setSheetState((prev) => {
                if (prev === "peek") return "half"
                if (prev === "half") return "full"
                return prev
            })
        } else {
            // Swipe down - collapse
            setSheetState((prev) => {
                if (prev === "full") return "half"
                if (prev === "half") return "peek"
                if (prev === "peek") {
                    onClose()
                    return "hidden"
                }
                return prev
            })
        }
    }, [onClose])

    const handleExpandClick = () => {
        setSheetState((prev) => {
            if (prev === "peek") return "half"
            if (prev === "half") return "full"
            return prev
        })
    }

    const handleCollapseClick = () => {
        setSheetState((prev) => {
            if (prev === "full") return "half"
            if (prev === "half") return "peek"
            return prev
        })
    }

    if (!vehicle) return null

    const routeColor = vehicle.routes[0]?.color || "#10B981"

    return (
        <>
            {/* Backdrop for full state */}
            {sheetState === "full" && (
                <div
                    className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
                    onClick={() => setSheetState("half")}
                />
            )}

            <div
                ref={sheetRef}
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-card shadow-2xl transition-transform duration-300 ease-out md:hidden",
                    SHEET_HEIGHTS[sheetState],
                    className
                )}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                <div className="flex items-center justify-center py-3">
                    <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
                </div>

                <div className="px-4 pb-8">
                    {/* ─── PEEK STATE: Basic Info ─────────────────────────────── */}
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: routeColor }}
                        >
                            <Bus className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="font-display text-lg font-bold text-foreground">
                                    {vehicle.plateNumber}
                                </p>
                                {avgRating && (
                                    <div className="flex items-center gap-1 text-amber-500">
                                        <Star className="h-4 w-4 fill-current" />
                                        <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                                {vehicle.routes.map((r) => r.name).join(", ")}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {progress && (
                                <Badge className="gap-1 bg-primary/10 text-primary border-0">
                                    <Timer className="h-3.5 w-3.5" />
                                    {progress.formattedETA}
                                </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                                {Math.round(vehicle.position.speed)} km/h
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Expand/Collapse hint */}
                    {sheetState === "peek" && (
                        <button
                            onClick={handleExpandClick}
                            className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground"
                        >
                            <ChevronUp className="h-4 w-4" />
                            <span>Swipe up for details</span>
                        </button>
                    )}

                    {/* ─── HALF STATE: Progress + Stats ───────────────────────── */}
                    {(sheetState === "half" || sheetState === "full") && (
                        <div className="mt-4 space-y-4">
                            {/* Progress Bar */}
                            {progress && (
                                <div className="rounded-xl border border-border bg-muted/30 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Target className="h-4 w-4" style={{ color: routeColor }} />
                                            <span className="text-sm font-medium text-foreground">
                                                {progress.nextStage?.name || "En route"}
                                            </span>
                                        </div>
                                        <span className="text-lg font-bold" style={{ color: routeColor }}>
                                            {Math.round(progress.progress)}%
                                        </span>
                                    </div>
                                    <Progress value={progress.progress} className="h-2" />
                                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{progress.formattedDistance} remaining</span>
                                        <span>{progress.stagesRemaining} stops left</span>
                                    </div>
                                </div>
                            )}

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center rounded-xl bg-muted p-3">
                                    <Navigation className="h-5 w-5 text-primary" />
                                    <p className="mt-1 text-lg font-bold text-foreground">
                                        {Math.round(vehicle.position.speed)}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">km/h</p>
                                </div>
                                <div className="flex flex-col items-center rounded-xl bg-muted p-3">
                                    <Timer className="h-5 w-5 text-accent" />
                                    <p className="mt-1 text-lg font-bold text-foreground">
                                        {progress?.formattedETA || "—"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">ETA</p>
                                </div>
                                <div className="flex flex-col items-center rounded-xl bg-muted p-3">
                                    <Clock className="h-5 w-5 text-muted-foreground" />
                                    <p className="mt-1 text-lg font-bold text-foreground">
                                        {new Date(vehicle.position.timestamp).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">updated</p>
                                </div>
                            </div>

                            {sheetState === "half" && (
                                <button
                                    onClick={handleExpandClick}
                                    className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                    <span>Show more</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* ─── FULL STATE: All Details ────────────────────────────── */}
                    {sheetState === "full" && (
                        <div className="mt-4 space-y-4 max-h-[40vh] overflow-y-auto">
                            {/* Vehicle Info */}
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">
                                    {VEHICLE_TYPE_LABELS[vehicle.type as keyof typeof VEHICLE_TYPE_LABELS] || vehicle.type}
                                </Badge>
                                {vehicle.isPremium && (
                                    <Badge className="bg-accent text-accent-foreground">Premium</Badge>
                                )}
                                {progress?.isOnRoute && (
                                    <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                                        <Target className="h-3 w-3" />
                                        On Route
                                    </Badge>
                                )}
                            </div>

                            {/* Routes */}
                            <div>
                                <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                                    <Route className="h-3 w-3" />
                                    Assigned Routes
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {vehicle.routes.map((route) => (
                                        <span
                                            key={route.id}
                                            className="rounded-lg px-2.5 py-1 text-xs font-medium"
                                            style={{ backgroundColor: `${route.color}20`, color: route.color }}
                                        >
                                            {route.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Rate Button */}
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => setShowReviewForm(true)}
                            >
                                <MessageSquare className="h-4 w-4" />
                                Rate This Vehicle
                            </Button>

                            {/* Collapse hint */}
                            <button
                                onClick={handleCollapseClick}
                                className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground"
                            >
                                <ChevronDown className="h-4 w-4" />
                                <span>Show less</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Review Form */}
            {vehicle && (
                <ReviewForm
                    vehicleId={vehicle.vehicleId}
                    plateNumber={vehicle.plateNumber}
                    isOpen={showReviewForm}
                    onClose={() => setShowReviewForm(false)}
                />
            )}
        </>
    )
}
