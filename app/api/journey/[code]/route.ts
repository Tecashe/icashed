import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
    calculateRouteProgress,
    isRushHour,
    estimateAverageSpeed,
} from "@/lib/geo-utils"

// GET /api/journey/[code] — Public endpoint, no auth required
// Returns the shared journey with live vehicle position, progress, ETA, and traffic status
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params

        const journey = await prisma.sharedJourney.findUnique({
            where: { shareCode: code },
            include: {
                user: {
                    select: { name: true },
                },
                vehicle: {
                    select: {
                        id: true,
                        plateNumber: true,
                        nickname: true,
                        type: true,
                        isActive: true,
                        rating: true,
                        images: { where: { isPrimary: true }, take: 1 },
                        positions: { orderBy: { timestamp: "desc" }, take: 1 },
                        routes: {
                            include: {
                                route: {
                                    include: {
                                        stages: { orderBy: { order: "asc" } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })

        if (!journey) {
            return NextResponse.json({ error: "Journey not found" }, { status: 404 })
        }

        // Check if expired or inactive
        const isExpired = new Date() > journey.expiresAt
        const isInactive = !journey.isActive

        if (isExpired || isInactive) {
            return NextResponse.json({
                journey: {
                    shareCode: journey.shareCode,
                    label: journey.label,
                    status: "ended",
                    endedAt: journey.expiresAt.toISOString(),
                    sharerName: journey.user.name?.split(" ")[0] || "Someone",
                    vehicle: {
                        plateNumber: journey.vehicle.plateNumber,
                        nickname: journey.vehicle.nickname,
                    },
                },
            })
        }

        // Build active journey response
        const position = journey.vehicle.positions[0] || null
        const route = journey.routeId
            ? journey.vehicle.routes.find(vr => vr.route.id === journey.routeId)?.route
            : journey.vehicle.routes[0]?.route

        // ─── Compute route progress, ETA & traffic status ────────────────
        let progressData = null
        if (position && route && route.stages.length >= 2) {
            const geoStages = route.stages.map(s => ({
                id: s.id,
                name: s.name,
                latitude: s.latitude,
                longitude: s.longitude,
                order: s.order,
                isTerminal: s.isTerminal,
            }))

            const rushHour = isRushHour()
            const avgSpeed = position.speed > 3
                ? position.speed  // Use actual speed if moving
                : estimateAverageSpeed(journey.vehicle.type, rushHour)

            const progress = calculateRouteProgress(
                { latitude: position.latitude, longitude: position.longitude },
                geoStages,
                avgSpeed
            )

            if (progress) {
                // Detect traffic: speed < 10 km/h while between stages (not at a terminal)
                const isInTraffic =
                    position.speed < 10 &&
                    progress.currentStageIndex > 0 &&
                    progress.currentStageIndex < geoStages.length - 1

                // Find the nearest stage name
                const currentStage = geoStages[progress.currentStageIndex]
                const destinationStage = geoStages[geoStages.length - 1]

                progressData = {
                    nearestStageName: currentStage.name,
                    destinationName: destinationStage.name,
                    etaMinutes: Math.round(progress.etaToTerminus),
                    progressPercent: Math.round(Math.min(progress.progress, 100)),
                    distanceRemainingKm: +(progress.totalDistance - progress.distanceTraveled).toFixed(1),
                    isInTraffic,
                    isOnRoute: progress.isOnRoute,
                    nextStageName: progress.nextStage?.name || null,
                }
            }
        }

        return NextResponse.json({
            journey: {
                shareCode: journey.shareCode,
                label: journey.label,
                status: "active",
                expiresAt: journey.expiresAt.toISOString(),
                createdAt: journey.createdAt.toISOString(),
                sharerName: journey.user.name?.split(" ")[0] || "Someone",
                vehicle: {
                    id: journey.vehicle.id,
                    plateNumber: journey.vehicle.plateNumber,
                    nickname: journey.vehicle.nickname,
                    type: journey.vehicle.type,
                    isLive: journey.vehicle.isActive,
                    rating: journey.vehicle.rating,
                    imageUrl: journey.vehicle.images[0]?.url || null,
                    position: position
                        ? {
                            lat: position.latitude,
                            lng: position.longitude,
                            speed: position.speed,
                            heading: position.heading,
                            timestamp: position.timestamp.toISOString(),
                        }
                        : null,
                },
                route: route
                    ? {
                        id: route.id,
                        name: route.name,
                        color: route.color,
                        origin: route.origin,
                        destination: route.destination,
                        stages: route.stages.map(s => ({
                            id: s.id,
                            name: s.name,
                            lat: s.latitude,
                            lng: s.longitude,
                            order: s.order,
                            isTerminal: s.isTerminal,
                        })),
                    }
                    : null,
                progress: progressData,
            },
        })
    } catch (error) {
        console.error("Get shared journey error:", error)
        return NextResponse.json({ error: "Failed to fetch journey" }, { status: 500 })
    }
}
