import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

// POST - Submit a new review
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { vehicleId, rating, comment, tags } = body

        if (!vehicleId || !rating || rating < 1 || rating > 5) {
            return NextResponse.json(
                { error: "Vehicle ID and rating (1-5) required" },
                { status: 400 }
            )
        }

        // Validate tags if provided
        const validTags = [
            "clean", "dirty", "damaged", "comfortable", "cramped",
            "polite_tout", "rude_tout", "helpful_tout", "aggressive_tout",
            "safe_driver", "speeding", "reckless", "professional",
            "on_time", "delayed", "fast_service", "slow",
            "good_music", "too_loud", "overcrowded", "recommended"
        ]
        const sanitizedTags = Array.isArray(tags)
            ? tags.filter((t: string) => validTags.includes(t))
            : []

        // Check vehicle exists (include owner for notification)
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: { id: true, ownerId: true, plateNumber: true },
        })

        if (!vehicle) {
            return NextResponse.json(
                { error: "Vehicle not found" },
                { status: 404 }
            )
        }

        // Create the review
        const review = await prisma.review.create({
            data: {
                userId: user.id,
                vehicleId,
                rating,
                comment: comment?.trim() || null,
                tags: sanitizedTags,
            },
            include: {
                user: {
                    select: { id: true, name: true, avatarUrl: true },
                },
            },
        })

        // Update vehicle's average rating
        const avgResult = await prisma.review.aggregate({
            where: { vehicleId },
            _avg: { rating: true },
            _count: { rating: true },
        })

        await prisma.vehicle.update({
            where: { id: vehicleId },
            data: {
                rating: avgResult._avg.rating || 0,
            },
        })

        // Notify vehicle owner about the new review
        createNotification({
            userId: vehicle.ownerId,
            type: "REVIEW_RECEIVED",
            title: `New ${rating}★ Review`,
            message: `${user.name || "A passenger"} rated your vehicle ${vehicle.plateNumber}${comment ? `: "${comment.trim().slice(0, 80)}"` : ""}`,
            data: {
                vehicleId,
                url: `/dashboard/driver/reviews`,
            },
            sendPush: true,
        }).catch((err) => console.error("Review notification error:", err))

        return NextResponse.json({ review })
    } catch (error) {
        console.error("Submit review error:", error)
        return NextResponse.json(
            { error: "Failed to submit review" },
            { status: 500 }
        )
    }
}

// GET - Get reviews (with optional vehicle filter)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const vehicleId = searchParams.get("vehicleId")
        const limit = parseInt(searchParams.get("limit") || "20")
        const page = parseInt(searchParams.get("page") || "1")

        const where = vehicleId ? { vehicleId } : {}

        const [reviews, total] = await Promise.all([
            prisma.review.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, avatarUrl: true },
                    },
                    vehicle: {
                        select: { id: true, plateNumber: true, nickname: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: (page - 1) * limit,
            }),
            prisma.review.count({ where }),
        ])

        return NextResponse.json({
            reviews,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        })
    } catch (error) {
        console.error("Get reviews error:", error)
        return NextResponse.json(
            { error: "Failed to get reviews" },
            { status: 500 }
        )
    }
}
