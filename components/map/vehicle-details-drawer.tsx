"use client"

import { useState } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import { formatDistanceToNow } from "date-fns"
import {
    MapPin,
    Navigation,
    Clock,
    Star,
    ImageIcon,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    Share2,
    Bookmark,
    Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer"
import { ReviewForm } from "@/components/reviews/review-form"
import { ShareJourney } from "@/components/passenger/share-journey"
import { cn } from "@/lib/utils"
import type { MapVehicle } from "@/components/map/google-map"

interface VehicleDetailsDrawerProps {
    selectedVehicle: MapVehicle | null
    showVehicleDetails: boolean
    setShowVehicleDetails: (v: boolean) => void
    showReviewForm: boolean
    setShowReviewForm: (v: boolean) => void
    currentImageIndex: number
    setCurrentImageIndex: (v: number) => void
    calculateReliabilityScore: (id: string) => number
    setFlyToLocation: (v: { lat: number; lng: number; zoom?: number } | null) => void
}

interface VehicleImage {
    id: string
    url: string
    isPrimary: boolean
}

interface ReviewData {
    id: string
    rating: number
    comment: string | null
    tags: string[]
    createdAt: string
    user: { id: string; name: string | null; avatarUrl: string | null }
}

interface ReviewsResponse {
    reviews: ReviewData[]
    total: number
    averageRating: number
    distribution: Record<string, number>
}

export function VehicleDetailsDrawer({
    selectedVehicle,
    showVehicleDetails,
    setShowVehicleDetails,
    showReviewForm,
    setShowReviewForm,
    currentImageIndex,
    setCurrentImageIndex,
    calculateReliabilityScore,
    setFlyToLocation,
}: VehicleDetailsDrawerProps) {
    const vehicleId = selectedVehicle?.id

    // Fetch vehicle images
    const { data: imagesData } = useSWR<VehicleImage[]>(
        vehicleId && showVehicleDetails ? `/api/vehicles/${vehicleId}/images` : null,
        fetcher,
    )

    // Fetch reviews
    const { data: reviewsData, mutate: mutateReviews } = useSWR<ReviewsResponse>(
        vehicleId && showVehicleDetails ? `/api/reviews?vehicleId=${vehicleId}&limit=3` : null,
        fetcher,
    )

    const images = imagesData || []
    const reviews = reviewsData?.reviews || []
    const avgRating = reviewsData?.averageRating || 0
    const totalReviews = reviewsData?.total || 0
    const distribution = reviewsData?.distribution || {}

    return (
        <>
            <Drawer open={showVehicleDetails} onOpenChange={setShowVehicleDetails}>
                <DrawerContent className="max-h-[85vh]">
                    <DrawerHeader className="border-b pb-3">
                        <DrawerTitle className="flex items-center gap-3">
                            {/* Vehicle thumbnail or color dot */}
                            {(() => {
                                const thumbUrl = selectedVehicle?.imageUrl || images?.[0]?.url
                                if (thumbUrl) {
                                    return (
                                        <div className="relative flex-shrink-0">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={thumbUrl}
                                                alt={selectedVehicle?.plateNumber || "Vehicle"}
                                                className="h-12 w-12 rounded-xl object-cover border-2 shadow-sm"
                                                style={{ borderColor: selectedVehicle?.color || '#10B981' }}
                                            />
                                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                                        </div>
                                    )
                                }
                                return (
                                    <div className="h-4 w-4 rounded-full animate-pulse shadow-sm" style={{
                                        backgroundColor: selectedVehicle?.color
                                    }} />
                                )
                            })()}
                            <div>
                                <div className="flex items-center gap-1.5">
                                    {selectedVehicle?.plateNumber}
                                    {selectedVehicle?.nickname && (
                                        <span className="text-sm text-muted-foreground font-normal">
                                            ({selectedVehicle.nickname})
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground font-normal">{selectedVehicle?.routeName}</p>
                            </div>
                        </DrawerTitle>
                    </DrawerHeader>

                    {selectedVehicle && (
                        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
                            {/* Live Status */}
                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-500/15 to-green-600/10 border border-green-500/30 rounded-xl">
                                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                                    Live • {Math.round(selectedVehicle.speed)} km/h
                                </span>
                                {selectedVehicle.speed > 5 && <Zap className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                            </div>

                            {/* Images Carousel */}
                            {images.length > 0 && (
                                <div className="relative rounded-xl overflow-hidden bg-muted/30">
                                    <div className="aspect-[16/9] relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={images[currentImageIndex]?.url}
                                            alt={`${selectedVehicle.plateNumber}`}
                                            className="w-full h-full object-cover"
                                        />
                                        {images.length > 1 && (
                                            <>
                                                <button
                                                    onClick={() => setCurrentImageIndex(
                                                        (currentImageIndex - 1 + images.length) % images.length
                                                    )}
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setCurrentImageIndex(
                                                        (currentImageIndex + 1) % images.length
                                                    )}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                    {images.map((_, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setCurrentImageIndex(i)}
                                                            className={cn(
                                                                "h-1.5 rounded-full transition-all",
                                                                i === currentImageIndex
                                                                    ? "w-4 bg-white"
                                                                    : "w-1.5 bg-white/50"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Distance + ETA */}
                            {selectedVehicle.distanceFromUser !== undefined && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-card border rounded-xl">
                                        <p className="text-xs text-muted-foreground mb-1">Distance</p>
                                        <p className="text-lg font-bold">
                                            {selectedVehicle.distanceFromUser < 1000
                                                ? `${Math.round(selectedVehicle.distanceFromUser)}m`
                                                : `${(selectedVehicle.distanceFromUser / 1000).toFixed(1)}km`}
                                        </p>
                                    </div>
                                    {selectedVehicle.etaMinutes !== undefined && (
                                        <div className="p-3 bg-card border rounded-xl">
                                            <p className="text-xs text-muted-foreground mb-1">ETA</p>
                                            <p className="text-lg font-bold flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                {selectedVehicle.etaMinutes} min
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Route info */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Route</p>
                                <div className="p-3 bg-card border rounded-xl space-y-2">
                                    {selectedVehicle.originStageName && selectedVehicle.destinationStageName && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                                            <span className="truncate">{selectedVehicle.originStageName}</span>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <Navigation className="h-4 w-4 text-accent flex-shrink-0" />
                                            <span className="truncate">{selectedVehicle.destinationStageName}</span>
                                        </div>
                                    )}
                                    {selectedVehicle.nextStageName && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>Next stop:</span>
                                            <span className="font-semibold text-foreground">{selectedVehicle.nextStageName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Rating Summary */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Passenger Rating
                                </p>
                                <div className="p-3 bg-card border rounded-xl">
                                    {totalReviews > 0 ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="text-center">
                                                    <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
                                                    <div className="flex gap-0.5 mt-1">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={cn(
                                                                    "h-3.5 w-3.5",
                                                                    i < Math.round(avgRating)
                                                                        ? "fill-yellow-400 text-yellow-400"
                                                                        : "text-muted"
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {totalReviews} review{totalReviews !== 1 ? "s" : ""}
                                                    </p>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    {[5, 4, 3, 2, 1].map((star) => {
                                                        const count = distribution[star] || 0
                                                        const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0
                                                        return (
                                                            <div key={star} className="flex items-center gap-2 text-xs">
                                                                <span className="w-3 text-right text-muted-foreground">{star}</span>
                                                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-yellow-400 rounded-full transition-all"
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center py-2 text-muted-foreground">
                                            <Star className="h-8 w-8 mb-2 text-muted" />
                                            <p className="text-sm">No reviews yet</p>
                                            <p className="text-xs">Be the first to rate!</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Reviews */}
                            {reviews.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Recent Reviews
                                        </p>
                                        <span className="text-xs text-muted-foreground">{totalReviews} total</span>
                                    </div>
                                    <div className="space-y-2">
                                        {reviews.map((review) => (
                                            <div key={review.id} className="p-3 bg-card border rounded-xl space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold">
                                                        {review.user.name?.[0]?.toUpperCase() || "?"}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {review.user.name || "Anonymous"}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">
                                                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-0.5">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={cn(
                                                                    "h-3 w-3",
                                                                    i < review.rating
                                                                        ? "fill-yellow-400 text-yellow-400"
                                                                        : "text-muted"
                                                                )}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {review.comment && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {review.comment}
                                                    </p>
                                                )}
                                                {review.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {review.tags.slice(0, 3).map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                                                            >
                                                                {tag.replace(/_/g, " ")}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Rate Button */}
                            <Button
                                onClick={() => setShowReviewForm(true)}
                                className="w-full h-12 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg"
                            >
                                <Star className="h-5 w-5 fill-white" />
                                Rate This Vehicle
                                <MessageSquare className="h-4 w-4 ml-1 opacity-70" />
                            </Button>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2">
                                <ShareJourney
                                    vehicleId={selectedVehicle.id}
                                    vehiclePlate={selectedVehicle.plateNumber}
                                    routeId={selectedVehicle.routeId}
                                    routeName={selectedVehicle.routeName}
                                />
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    size="sm"
                                    onClick={() => {
                                        setFlyToLocation({ lat: selectedVehicle.lat, lng: selectedVehicle.lng, zoom: 16 })
                                        setShowVehicleDetails(false)
                                    }}
                                >
                                    <MapPin className="h-4 w-4" /> Center
                                </Button>
                            </div>
                        </div>
                    )}
                </DrawerContent>
            </Drawer>

            {/* Review Form */}
            {selectedVehicle && (
                <ReviewForm
                    vehicleId={selectedVehicle.id}
                    plateNumber={selectedVehicle.plateNumber}
                    isOpen={showReviewForm}
                    onClose={() => setShowReviewForm(false)}
                    onSuccess={() => {
                        mutateReviews()
                    }}
                />
            )}
        </>
    )
}
