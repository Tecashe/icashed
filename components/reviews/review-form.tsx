"use client"

import { useState } from "react"
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

interface ReviewFormProps {
    vehicleId: string
    plateNumber: string
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function ReviewForm({
    vehicleId,
    plateNumber,
    isOpen,
    onClose,
    onSuccess,
}: ReviewFormProps) {
    const [rating, setRating] = useState(0)
    const [comment, setComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
                    comment: comment.trim() || undefined,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to submit review")
            }

            // Reset form
            setRating(0)
            setComment("")

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
            setComment("")
            setError(null)
            onClose()
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={handleClose}>
            <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader className="text-left">
                    <SheetTitle>Rate Your Trip</SheetTitle>
                    <SheetDescription>
                        How was your experience with {plateNumber}?
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                    {/* Star Rating */}
                    <div className="flex flex-col items-center gap-3">
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
