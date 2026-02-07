"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet"
import { StarRating } from "./star-rating"
import { Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReviewFormProps {
    vehicleId: string
    plateNumber: string
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

// Review tag categories with emojis
const TAG_CATEGORIES = {
    vehicle: {
        label: "Vehicle",
        emoji: "🚗",
        tags: [
            { id: "clean", label: "Clean", positive: true },
            { id: "dirty", label: "Dirty", positive: false },
            { id: "damaged", label: "Damaged", positive: false },
            { id: "comfortable", label: "Comfortable", positive: true },
            { id: "cramped", label: "Cramped", positive: false },
        ],
    },
    tout: {
        label: "Conductor",
        emoji: "👤",
        tags: [
            { id: "polite_tout", label: "Polite", positive: true },
            { id: "rude_tout", label: "Rude", positive: false },
            { id: "helpful_tout", label: "Helpful", positive: true },
            { id: "aggressive_tout", label: "Aggressive", positive: false },
        ],
    },
    driver: {
        label: "Driver",
        emoji: "🚦",
        tags: [
            { id: "safe_driver", label: "Safe", positive: true },
            { id: "speeding", label: "Speeding", positive: false },
            { id: "reckless", label: "Reckless", positive: false },
            { id: "professional", label: "Professional", positive: true },
        ],
    },
    service: {
        label: "Service",
        emoji: "⏱️",
        tags: [
            { id: "on_time", label: "On Time", positive: true },
            { id: "delayed", label: "Delayed", positive: false },
            { id: "fast_service", label: "Fast", positive: true },
            { id: "overcrowded", label: "Overcrowded", positive: false },
        ],
    },
    extras: {
        label: "Extras",
        emoji: "🎵",
        tags: [
            { id: "good_music", label: "Good Music", positive: true },
            { id: "too_loud", label: "Too Loud", positive: false },
            { id: "recommended", label: "Would Recommend", positive: true },
        ],
    },
}

export function ReviewForm({
    vehicleId,
    plateNumber,
    isOpen,
    onClose,
    onSuccess,
}: ReviewFormProps) {
    const [rating, setRating] = useState(0)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [comment, setComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const toggleTag = (tagId: string) => {
        setSelectedTags((prev) =>
            prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
        )
    }

    const handleSubmit = async () => {
        if (rating === 0) {
            setError("Please select a rating")
            return
        }

        setIsSubmitting(true)
        setError(null)

        try {
            const response = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleId,
                    rating,
                    tags: selectedTags,
                    comment: comment.trim() || undefined,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to submit review")
            }

            // Reset form
            setRating(0)
            setSelectedTags([])
            setComment("")

            toast.success("Review submitted!", {
                description: "Thank you for your feedback",
            })
            onSuccess?.()
            onClose()
        } catch {
            setError("Something went wrong. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            setRating(0)
            setSelectedTags([])
            setComment("")
            setError(null)
            onClose()
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={handleClose}>
            <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
                <SheetHeader className="text-left">
                    <SheetTitle>Rate Your Trip</SheetTitle>
                    <SheetDescription>
                        How was your experience with {plateNumber}?
                    </SheetDescription>
                </SheetHeader>

                <div className="py-5 space-y-5">
                    {/* Star Rating */}
                    <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted/50 p-4">
                        <p className="text-sm text-muted-foreground">Tap to rate</p>
                        <StarRating
                            rating={rating}
                            onChange={setRating}
                            size="lg"
                        />
                        {rating > 0 && (
                            <p className="text-sm font-medium text-foreground">
                                {rating === 5 && "Excellent! 🌟"}
                                {rating === 4 && "Great! 👍"}
                                {rating === 3 && "Good 👌"}
                                {rating === 2 && "Fair 😐"}
                                {rating === 1 && "Poor 👎"}
                            </p>
                        )}
                    </div>

                    {/* Quick Tags */}
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-muted-foreground">
                            Quick feedback (optional)
                        </p>
                        {Object.entries(TAG_CATEGORIES).map(([key, category]) => (
                            <div key={key} className="space-y-2">
                                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <span>{category.emoji}</span>
                                    {category.label}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {category.tags.map((tag) => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => toggleTag(tag.id)}
                                            className={cn(
                                                "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                                                selectedTags.includes(tag.id)
                                                    ? tag.positive
                                                        ? "border-primary bg-primary/10 text-primary"
                                                        : "border-destructive bg-destructive/10 text-destructive"
                                                    : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            {tag.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Comment */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Add a comment (optional)
                        </label>
                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Tell others about your experience..."
                            maxLength={500}
                            rows={3}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {comment.length}/500
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive text-center">{error}</p>
                    )}
                </div>

                <SheetFooter className="flex-col gap-2 sm:flex-col">
                    <Button
                        onClick={handleSubmit}
                        disabled={rating === 0 || isSubmitting}
                        className="w-full h-12 gap-2"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        Submit Review
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="w-full"
                    >
                        Cancel
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
