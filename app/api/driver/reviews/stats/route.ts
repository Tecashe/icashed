import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET - Get driver's review statistics
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "OPERATOR") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get driver's vehicles
        const vehicles = await prisma.vehicle.findMany({
            where: { ownerId: user.id },
            include: {
                reviews: {
                    select: { rating: true },
                },
            },
        })

        // Calculate stats
        const allReviews = vehicles.flatMap((v: { reviews: { rating: number }[] }) => v.reviews)
        const totalReviews = allReviews.length
        const averageRating =
            totalReviews > 0
                ? allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / totalReviews
                : 0

        // Rating distribution [5, 4, 3, 2, 1]
        const ratingDistribution = [5, 4, 3, 2, 1].map(
            (r) => allReviews.filter((review: { rating: number }) => review.rating === r).length
        )

        // Vehicle-level stats
        const vehicleStats = vehicles.map((v: { id: string; plateNumber: string; nickname: string | null; rating: number; reviews: { rating: number }[] }) => ({
            id: v.id,
            plateNumber: v.plateNumber,
            nickname: v.nickname,
            rating: v.rating,
            reviewCount: v.reviews.length,
        }))

        return NextResponse.json({
            totalReviews,
            averageRating,
            ratingDistribution,
            vehicles: vehicleStats,
        })
    } catch (error) {
        console.error("Get review stats error:", error)
        return NextResponse.json(
            { error: "Failed to get review stats" },
            { status: 500 }
        )
    }
}
