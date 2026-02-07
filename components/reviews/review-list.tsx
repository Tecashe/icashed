"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StarRating } from "./star-rating"
import { Loader2, MessageSquare } from "lucide-react"
import { fetcher } from "@/lib/api-client"
import { formatDistanceToNow } from "date-fns"

interface Review {
    id: string
    rating: number
    comment: string | null
    createdAt: string
    user: {
        id: string
        name: string | null
        avatarUrl: string | null
    }
    vehicle: {
        id: string
        plateNumber: string
        nickname: string | null
    }
}

interface ReviewsResponse {
    reviews: Review[]
    pagination: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

interface ReviewListProps {
    vehicleId?: string
    limit?: number
    showVehicle?: boolean
}

export function ReviewList({
    vehicleId,
    limit = 10,
    showVehicle = false,
}: ReviewListProps) {
    const url = vehicleId
        ? `/api/reviews?vehicleId=${vehicleId}&limit=${limit}`
        : `/api/reviews?limit=${limit}`

    const { data, isLoading } = useSWR<ReviewsResponse>(url, fetcher)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!data?.reviews || data.reviews.length === 0) {
        return (
            <div className="flex flex-col items-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-muted-foreground">No reviews yet</p>
                <p className="text-sm text-muted-foreground/70">
                    Be the first to leave a review!
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {data.reviews.map((review) => (
                <ReviewCard
                    key={review.id}
                    review={review}
                    showVehicle={showVehicle}
                />
            ))}

            {data.pagination.total > limit && (
                <p className="text-center text-sm text-muted-foreground">
                    Showing {data.reviews.length} of {data.pagination.total} reviews
                </p>
            )}
        </div>
    )
}

interface ReviewCardProps {
    review: Review
    showVehicle?: boolean
}

function ReviewCard({ review, showVehicle = false }: ReviewCardProps) {
    const initials = review.user.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?"

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={review.user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <p className="font-medium text-sm text-foreground">
                                    {review.user.name || "Anonymous"}
                                </p>
                                {showVehicle && (
                                    <p className="text-xs text-muted-foreground">
                                        {review.vehicle.plateNumber}
                                    </p>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                            </span>
                        </div>

                        <div className="mt-1">
                            <StarRating rating={review.rating} size="sm" readOnly />
                        </div>

                        {review.comment && (
                            <p className="mt-2 text-sm text-foreground/80 leading-relaxed">
                                {review.comment}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

// Summary card for vehicle rating
interface RatingSummaryProps {
    vehicleId: string
}

export function RatingSummary({ vehicleId }: RatingSummaryProps) {
    const { data, isLoading } = useSWR<ReviewsResponse>(
        `/api/reviews?vehicleId=${vehicleId}&limit=100`,
        fetcher
    )

    if (isLoading || !data?.reviews.length) {
        return null
    }

    const avgRating =
        data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length
    const ratingCounts = [5, 4, 3, 2, 1].map(
        (r) => data.reviews.filter((review) => review.rating === r).length
    )

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Rating Summary</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <p className="text-4xl font-bold text-foreground">
                            {avgRating.toFixed(1)}
                        </p>
                        <StarRating rating={Math.round(avgRating)} size="sm" readOnly />
                        <p className="mt-1 text-xs text-muted-foreground">
                            {data.reviews.length} review{data.reviews.length !== 1 ? "s" : ""}
                        </p>
                    </div>

                    <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map((stars, i) => (
                            <div key={stars} className="flex items-center gap-2 text-xs">
                                <span className="w-3 text-muted-foreground">{stars}</span>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 rounded-full"
                                        style={{
                                            width: `${(ratingCounts[i] / data.reviews.length) * 100}%`,
                                        }}
                                    />
                                </div>
                                <span className="w-6 text-muted-foreground text-right">
                                    {ratingCounts[i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
