"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
    rating: number
    onChange?: (rating: number) => void
    size?: "sm" | "md" | "lg"
    readOnly?: boolean
    className?: string
}

const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
}

const gapClasses = {
    sm: "gap-0.5",
    md: "gap-1",
    lg: "gap-1.5",
}

export function StarRating({
    rating,
    onChange,
    size = "md",
    readOnly = false,
    className = "",
}: StarRatingProps) {
    const handleClick = (star: number) => {
        if (!readOnly && onChange) {
            onChange(star)
        }
    }

    return (
        <div
            className={cn(
                "flex items-center",
                gapClasses[size],
                !readOnly && "cursor-pointer",
                className
            )}
            role={readOnly ? "img" : "radiogroup"}
            aria-label={`Rating: ${rating} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= rating
                return (
                    <button
                        key={star}
                        type="button"
                        onClick={() => handleClick(star)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                handleClick(star)
                            }
                        }}
                        disabled={readOnly}
                        className={cn(
                            "transition-all duration-100",
                            !readOnly && "hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm",
                            readOnly && "cursor-default"
                        )}
                        aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                        aria-pressed={isFilled}
                    >
                        <Star
                            className={cn(
                                sizeClasses[size],
                                "transition-colors",
                                isFilled
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "fill-transparent text-muted-foreground/40"
                            )}
                        />
                    </button>
                )
            })}
        </div>
    )
}

// Compact display version
interface StarDisplayProps {
    rating: number
    className?: string
}

export function StarDisplay({ rating, className = "" }: StarDisplayProps) {
    return (
        <div className={cn("flex items-center gap-1", className)}>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{rating.toFixed(1)}</span>
        </div>
    )
}
