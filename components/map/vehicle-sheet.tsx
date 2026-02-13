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
    ChevronLeft,
    ChevronRight,
    Target,
    Route,
    Clock,
    ImageIcon,
    User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LivePosition } from "@/hooks/use-data"
import type { useVehicleProgress } from "@/hooks/use-vehicle-progress"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { ReviewForm } from "@/components/reviews/review-form"
import { StarRating } from "@/components/reviews/star-rating"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import { formatDistanceToNow } from "date-fns"
import { ShareJourney } from "@/components/passenger/share-journey"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReviewData = { id: string; rating: number; comment: string | null; createdAt: string; tags?: string[]; user: { id: string; name: string | null; avatarUrl: string | null } }

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

// ─── Image Carousel ──────────────────────────────────────────────
function VehicleImageCarousel({ vehicleId }: { vehicleId: string }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const { data } = useSWR<{ images: { id: string; url: string; caption: string | null; isPrimary: boolean }[] }>(
        `/api/vehicles/${vehicleId}/images`,
        fetcher
    )
    const images = data?.images || []

    useEffect(() => setCurrentIndex(0), [vehicleId])

    if (images.length === 0) {
        return (
            <div className="flex items-center justify-center h-36 rounded-xl bg-muted/50 border border-dashed border-border">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">No photos yet</span>
                </div>
            </div>
        )
    }

    return (
        <div className="relative rounded-xl overflow-hidden">
            <div className="relative h-44 bg-black">
                <img
                    src={images[currentIndex].url}
                    alt={images[currentIndex].caption || "Vehicle photo"}
                    className="w-full h-full object-cover"
                />
                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Caption */}
                {images[currentIndex].caption && (
                    <p className="absolute bottom-2 left-3 text-xs text-white/90 font-medium">
                        {images[currentIndex].caption}
                    </p>
                )}

                {/* Navigation arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => i === 0 ? images.length - 1 : i - 1) }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i => i === images.length - 1 ? 0 : i + 1) }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </>
                )}

                {/* Dot indicators */}
                {images.length > 1 && (
                    <div className="absolute bottom-2 right-3 flex gap-1">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i) }}
                                className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    i === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Inline Rating Summary ──────────────────────────────────────
function InlineRatingSummary({ reviews, avgRating }: { reviews: ReviewData[]; avgRating: number | null }) {
    if (!avgRating || reviews.length === 0) return null

    const ratingCounts = [5, 4, 3, 2, 1].map(
        (r) => reviews.filter((review) => review.rating === r).length
    )

    return (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                <Star className="h-3 w-3" /> Rating Overview
            </p>
            <div className="flex items-center gap-4">
                <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">{avgRating.toFixed(1)}</p>
                    <StarRating rating={Math.round(avgRating)} size="sm" readOnly />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                        {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((stars, i) => (
                        <div key={stars} className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-2 text-muted-foreground">{stars}</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full transition-all"
                                    style={{ width: `${reviews.length > 0 ? (ratingCounts[i] / reviews.length) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="w-3 text-muted-foreground text-right">{ratingCounts[i]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Inline Reviews ─────────────────────────────────────────────
function InlineReviews({ reviews }: { reviews: ReviewData[] }) {
    if (reviews.length === 0) {
        return (
            <div className="flex flex-col items-center py-4 text-center rounded-xl border border-dashed border-border">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">No reviews yet</p>
                <p className="text-xs text-muted-foreground/70">Be the first to share your experience!</p>
            </div>
        )
    }

    return (
        <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Recent Reviews
            </p>
            <div className="space-y-2">
                {reviews.slice(0, 3).map((review) => {
                    const initials = review.user.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2) || "?"

                    return (
                        <div key={review.id} className="rounded-xl border border-border bg-muted/20 p-3">
                            <div className="flex items-start gap-2.5">
                                {/* Avatar */}
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden">
                                    {review.user.avatarUrl ? (
                                        <img src={review.user.avatarUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] font-bold text-foreground/70">{initials}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                        <p className="text-xs font-medium text-foreground truncate">
                                            {review.user.name || "Anonymous"}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <StarRating rating={review.rating} size="sm" readOnly className="mt-0.5" />
                                    {review.comment && (
                                        <p className="mt-1 text-xs text-foreground/80 leading-relaxed line-clamp-2">
                                            {review.comment}
                                        </p>
                                    )}
                                    {review.tags && review.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {review.tags.slice(0, 3).map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1.5">
                                                    {tag.replace(/_/g, " ")}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─── Main Vehicle Sheet ─────────────────────────────────────────
export function VehicleSheet({ vehicle, progress, onClose, className }: VehicleSheetProps) {
    const [sheetState, setSheetState] = useState<SheetState>("hidden")
    const [showReviewForm, setShowReviewForm] = useState(false)
    const sheetRef = useRef<HTMLDivElement>(null)
    const startYRef = useRef(0)
    const currentYRef = useRef(0)

    // Fetch vehicle reviews
    const { data: reviewsData, mutate: mutateReviews } = useSWR(
        vehicle ? `/api/reviews?vehicleId=${vehicle.vehicleId}&limit=5` : null,
        fetcher
    )
    const recentReviews: ReviewData[] = reviewsData?.reviews || []
    const avgRating = recentReviews.length > 0
        ? recentReviews.reduce((sum: number, r: ReviewData) => sum + r.rating, 0) / recentReviews.length
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
                            {/* Vehicle Images Carousel */}
                            <VehicleImageCarousel vehicleId={vehicle.vehicleId} />

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

                            {/* Inline Rating Summary */}
                            <InlineRatingSummary reviews={recentReviews} avgRating={avgRating} />

                            {/* Recent Reviews */}
                            <InlineReviews reviews={recentReviews} />

                            {/* Rate Button */}
                            <Button
                                className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
                                onClick={() => setShowReviewForm(true)}
                            >
                                <Star className="h-4 w-4 fill-current" />
                                Rate This Vehicle
                            </Button>

                            {/* Journey Sharing */}
                            <ShareJourney
                                vehicleId={vehicle.vehicleId}
                                vehiclePlate={vehicle.plateNumber}
                                routeId={vehicle.routes[0]?.id}
                                routeName={vehicle.routes[0]?.name}
                            />

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
                    onSuccess={() => mutateReviews()}
                />
            )}
        </>
    )
}
