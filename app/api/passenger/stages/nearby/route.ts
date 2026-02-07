import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET - Find nearby stages based on GPS coordinates
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const lat = parseFloat(searchParams.get("lat") || "0")
        const lng = parseFloat(searchParams.get("lng") || "0")
        const radiusKm = parseFloat(searchParams.get("radius") || "2") // Default 2km

        if (!lat || !lng) {
            return NextResponse.json(
                { error: "Latitude and longitude required" },
                { status: 400 }
            )
        }

        // Get all stages with their routes
        const stages = await prisma.stage.findMany({
            include: {
                route: {
                    select: { id: true, name: true, code: true, color: true, isActive: true },
                },
                waitingPassengers: {
                    where: { expiresAt: { gt: new Date() } },
                    select: { id: true },
                },
            },
            where: {
                route: { isActive: true },
            },
        })

        // Define stage type
        type StageWithRoute = typeof stages[number]
        type StageWithDistance = StageWithRoute & { distance: number; waitingCount: number }

        // Calculate distance and filter by radius
        const nearbyStages = stages
            .map((stage: StageWithRoute) => {
                const distance = haversineDistance(lat, lng, stage.latitude, stage.longitude)
                return {
                    ...stage,
                    distance: Math.round(distance * 100) / 100, // Round to 2 decimals
                    waitingCount: stage.waitingPassengers.length,
                }
            })
            .filter((stage: StageWithDistance) => stage.distance <= radiusKm)
            .sort((a: StageWithDistance, b: StageWithDistance) => a.distance - b.distance)
            .slice(0, 10) // Limit to 10 nearest stages

        // Remove waitingPassengers array (just return count)
        const result = nearbyStages.map(({ waitingPassengers, ...stage }: StageWithDistance) => stage)

        return NextResponse.json({ stages: result })
    } catch (error) {
        console.error("Nearby stages error:", error)
        return NextResponse.json(
            { error: "Failed to find nearby stages" },
            { status: 500 }
        )
    }
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in kilometers
 */
function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371 // Earth's radius in km
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180)
}
