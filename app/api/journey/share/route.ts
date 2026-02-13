import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { randomBytes } from "crypto"

// POST /api/journey/share — Create a shared journey
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { vehicleId, routeId, label } = body

        if (!vehicleId) {
            return NextResponse.json({ error: "Vehicle ID is required" }, { status: 400 })
        }

        // Verify the vehicle exists and is active
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: { id: true, plateNumber: true, isActive: true },
        })

        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
        }

        // Deactivate any existing active shares from this user
        await prisma.sharedJourney.updateMany({
            where: { userId: user.id, isActive: true },
            data: { isActive: false },
        })

        // Generate a short, URL-safe share code
        const shareCode = randomBytes(6).toString("base64url") // ~8 chars

        // Create the shared journey — expires in 2 hours
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

        const journey = await prisma.sharedJourney.create({
            data: {
                shareCode,
                userId: user.id,
                vehicleId,
                routeId: routeId || null,
                label: label?.trim() || null,
                expiresAt,
            },
        })

        const shareUrl = `/journey/${journey.shareCode}`

        return NextResponse.json({
            journey: {
                id: journey.id,
                shareCode: journey.shareCode,
                shareUrl,
                expiresAt: journey.expiresAt.toISOString(),
                vehiclePlate: vehicle.plateNumber,
            },
        }, { status: 201 })
    } catch (error) {
        console.error("Create shared journey error:", error)
        return NextResponse.json({ error: "Failed to create shared journey" }, { status: 500 })
    }
}

// GET /api/journey/share — Get user's active shares
export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const journeys = await prisma.sharedJourney.findMany({
            where: {
                userId: user.id,
                isActive: true,
                expiresAt: { gt: new Date() },
            },
            include: {
                vehicle: {
                    select: {
                        plateNumber: true,
                        nickname: true,
                        positions: { orderBy: { timestamp: "desc" }, take: 1 },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json({ journeys })
    } catch (error) {
        console.error("Get shared journeys error:", error)
        return NextResponse.json({ error: "Failed to fetch journeys" }, { status: 500 })
    }
}

// DELETE /api/journey/share — Stop sharing (deactivate)
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const journeyId = searchParams.get("id")

        if (journeyId) {
            // Deactivate specific journey
            await prisma.sharedJourney.updateMany({
                where: { id: journeyId, userId: user.id },
                data: { isActive: false },
            })
        } else {
            // Deactivate all active journeys
            await prisma.sharedJourney.updateMany({
                where: { userId: user.id, isActive: true },
                data: { isActive: false },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Stop sharing error:", error)
        return NextResponse.json({ error: "Failed to stop sharing" }, { status: 500 })
    }
}
