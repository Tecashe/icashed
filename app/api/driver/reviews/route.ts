import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/driver/reviews - Get all reviews for driver's vehicles
export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "OPERATOR") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get all vehicles owned by driver
        const vehicles = await prisma.vehicle.findMany({
            where: { ownerId: user.id },
            select: { id: true },
        })

        const vehicleIds = vehicles.map((v) => v.id)

        if (vehicleIds.length === 0) {
            return NextResponse.json({
                reviews: [],
                stats: {
                    totalReviews: 0,
                    averageRating: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                },
            })
        }

        // Get all reviews for driver's vehicles
        const reviews = await prisma.review.findMany({
            where: { vehicleId: { in: vehicleIds } },
            include: {
                user: { select: { name: true } },
                vehicle: { select: { plateNumber: true, nickname: true } },
            },
            orderBy: { createdAt: "desc" },
        })

        // Calculate stats
        const totalReviews = reviews.length
        const averageRating =
            totalReviews > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
                : 0

        // Rating distribution
        const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        reviews.forEach((r) => {
            ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1
        })

        return NextResponse.json({
            reviews,
            stats: {
                totalReviews,
                averageRating: Math.round(averageRating * 10) / 10,
                ratingDistribution,
            },
        })
    } catch (error) {
        console.error("Error fetching driver reviews:", error)
        return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
    }
}
