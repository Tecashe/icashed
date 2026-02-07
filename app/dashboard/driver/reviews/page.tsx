"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Loader2, MessageSquare, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface Review {
    id: string
    rating: number
    comment: string | null
    createdAt: string
    user: {
        name: string | null
    }
    vehicle: {
        plateNumber: string
        nickname: string | null
    }
}

interface ReviewsResponse {
    reviews: Review[]
    stats: {
        totalReviews: number
        averageRating: number
        ratingDistribution: Record<number, number>
    }
}

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
    const sizeClasses = {
        sm: "h-3 w-3",
        md: "h-4 w-4",
        lg: "h-5 w-5",
    }

    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={cn(
                        sizeClasses[size],
                        star <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-muted text-muted"
                    )}
                />
            ))}
        </div>
    )
}

function RatingBar({ label, count, total }: { label: number; count: number; total: number }) {
    const percentage = total > 0 ? (count / total) * 100 : 0

    return (
        <div className="flex items-center gap-3">
            <span className="w-3 text-sm font-medium text-muted-foreground">{label}</span>
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="w-8 text-right text-sm text-muted-foreground">{count}</span>
        </div>
    )
}

export default function DriverReviewsPage() {
    const { data, isLoading } = useSWR<ReviewsResponse>("/api/driver/reviews", fetcher)

    const reviews = data?.reviews || []
    const stats = data?.stats || {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                    My Reviews
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    See what passengers say about your service
                </p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {/* Stats Summary */}
                    <Card className="overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
                                {/* Average Rating - Big Display */}
                                <div className="flex flex-col items-center text-center sm:pr-8 sm:border-r sm:border-border">
                                    <p className="text-5xl font-bold text-foreground">
                                        {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "-"}
                                    </p>
                                    <StarRating rating={Math.round(stats.averageRating)} size="lg" />
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {stats.totalReviews} {stats.totalReviews === 1 ? "review" : "reviews"}
                                    </p>
                                </div>

                                {/* Rating Distribution */}
                                <div className="flex-1 flex flex-col gap-2">
                                    {[5, 4, 3, 2, 1].map((rating) => (
                                        <RatingBar
                                            key={rating}
                                            label={rating}
                                            count={stats.ratingDistribution[rating] || 0}
                                            total={stats.totalReviews}
                                        />
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reviews List */}
                    {reviews.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {reviews.map((review) => (
                                <Card key={review.id}>
                                    <CardContent className="p-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                                                    <User className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {review.user.name || "Anonymous"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(review.createdAt).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <StarRating rating={review.rating} size="sm" />
                                        </div>

                                        {/* Comment */}
                                        {review.comment && (
                                            <p className="mt-3 text-sm text-foreground leading-relaxed">
                                                "{review.comment}"
                                            </p>
                                        )}

                                        {/* Vehicle Badge */}
                                        <div className="mt-3 flex items-center gap-2">
                                            <Badge variant="secondary" className="text-xs">
                                                {review.vehicle.plateNumber}
                                            </Badge>
                                            {review.vehicle.nickname && (
                                                <span className="text-xs text-muted-foreground">
                                                    {review.vehicle.nickname}
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-16 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="mt-4 text-base font-medium text-muted-foreground">
                                No reviews yet
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground/70">
                                Reviews from passengers will appear here
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
