import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

/**
 * POST /api/admin/routes/populate-paths
 *
 * Auto-populates RoutePath table by fetching road-following coordinates
 * from Google Directions API for each route's stages.
 *
 * Body (optional):
 *   { routeId?: string }  — populate a single route, or omit for ALL routes
 *
 * This replaces manual coordinate entry. Run once to seed, then routes
 * render from DB instead of hitting Directions API on every page load.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Admin only" }, { status: 403 })
        }

        const body = await request.json().catch(() => ({}))
        const { routeId } = body as { routeId?: string }

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: "Google Maps API key not configured" },
                { status: 500 }
            )
        }

        // Get routes to populate
        const routes = await prisma.route.findMany({
            where: routeId ? { id: routeId } : { isActive: true },
            include: {
                stages: { orderBy: { order: "asc" } },
                _count: { select: { routePath: true } },
            },
        })

        if (routes.length === 0) {
            return NextResponse.json({ error: "No routes found" }, { status: 404 })
        }

        const results: Array<{
            routeId: string
            name: string
            status: "populated" | "skipped" | "failed"
            pointCount?: number
            error?: string
        }> = []

        for (const route of routes) {
            // Skip routes that already have path data (unless specific route requested)
            if (!routeId && route._count.routePath > 0) {
                results.push({
                    routeId: route.id,
                    name: route.name,
                    status: "skipped",
                    pointCount: route._count.routePath,
                })
                continue
            }

            if (route.stages.length < 2) {
                results.push({
                    routeId: route.id,
                    name: route.name,
                    status: "failed",
                    error: "Less than 2 stages",
                })
                continue
            }

            try {
                // Fetch road-following path from Google Directions REST API
                const pathPoints = await fetchDirectionsPath(route.stages, apiKey)

                if (pathPoints.length < 2) {
                    results.push({
                        routeId: route.id,
                        name: route.name,
                        status: "failed",
                        error: "Directions API returned no path",
                    })
                    continue
                }

                // Store in DB: delete old path, insert new
                await prisma.$transaction([
                    prisma.routePath.deleteMany({ where: { routeId: route.id } }),
                    prisma.routePath.createMany({
                        data: pathPoints.map((p, index) => ({
                            routeId: route.id,
                            latitude: p.lat,
                            longitude: p.lng,
                            order: index,
                        })),
                    }),
                ])

                results.push({
                    routeId: route.id,
                    name: route.name,
                    status: "populated",
                    pointCount: pathPoints.length,
                })

                console.log(
                    `[PopulatePaths] ✅ ${route.name}: ${pathPoints.length} points stored`
                )

                // Rate limiting: small delay between routes
                await new Promise((r) => setTimeout(r, 500))
            } catch (err) {
                console.error(`[PopulatePaths] ❌ ${route.name}:`, err)
                results.push({
                    routeId: route.id,
                    name: route.name,
                    status: "failed",
                    error: err instanceof Error ? err.message : "Unknown error",
                })
            }
        }

        const populated = results.filter((r) => r.status === "populated").length
        const skipped = results.filter((r) => r.status === "skipped").length
        const failed = results.filter((r) => r.status === "failed").length

        return NextResponse.json({
            summary: { total: routes.length, populated, skipped, failed },
            results,
        })
    } catch (error) {
        console.error("Populate paths error:", error)
        return NextResponse.json(
            { error: "Failed to populate paths" },
            { status: 500 }
        )
    }
}

// ─── Google Directions REST API ──────────────────────────────

interface LatLng {
    lat: number
    lng: number
}

interface Stage {
    latitude: number
    longitude: number
    name: string
}

async function fetchDirectionsPath(
    stages: Stage[],
    apiKey: string
): Promise<LatLng[]> {
    const allPoints: LatLng[] = []

    // Google Directions supports max 25 waypoints per request
    // Split into batches: origin + destination + 23 intermediates = 25 total
    const MAX_WAYPOINTS = 23
    const batchSize = MAX_WAYPOINTS + 2
    const batches: Stage[][] = []

    for (let i = 0; i < stages.length; i += batchSize - 1) {
        const end = Math.min(i + batchSize, stages.length)
        batches.push(stages.slice(i, end))
        if (end >= stages.length) break
    }

    for (const batch of batches) {
        const origin = batch[0]
        const destination = batch[batch.length - 1]
        const waypoints = batch.slice(1, -1)

        const waypointsParam = waypoints.length > 0
            ? `&waypoints=${waypoints.map((w) => `${w.latitude},${w.longitude}`).join("|")}`
            : ""

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}${waypointsParam}&mode=driving&avoid=highways|tolls&key=${apiKey}`

        const res = await fetch(url)
        const data = await res.json()

        if (data.status !== "OK" || !data.routes?.length) {
            console.warn(`[Directions REST] Status: ${data.status}`)
            // Fallback: use stage coordinates directly
            for (const stage of batch) {
                allPoints.push({ lat: stage.latitude, lng: stage.longitude })
            }
            continue
        }

        // Decode the overview polyline — gives us the full road-following path
        const route = data.routes[0]

        // Use leg steps for detailed path points
        for (const leg of route.legs) {
            for (const step of leg.steps) {
                // Decode the step's polyline
                const decoded = decodePolyline(step.polyline.points)
                allPoints.push(...decoded)
            }
        }

        // Rate limit between batches
        if (batches.length > 1) {
            await new Promise((r) => setTimeout(r, 300))
        }
    }

    // Remove duplicates (consecutive same points)
    const deduplicated: LatLng[] = []
    for (const p of allPoints) {
        const last = deduplicated[deduplicated.length - 1]
        if (!last || Math.abs(last.lat - p.lat) > 0.00001 || Math.abs(last.lng - p.lng) > 0.00001) {
            deduplicated.push(p)
        }
    }

    return deduplicated
}

// ─── Polyline decoder (Google's encoded polyline format) ─────

function decodePolyline(encoded: string): LatLng[] {
    const points: LatLng[] = []
    let index = 0
    let lat = 0
    let lng = 0

    while (index < encoded.length) {
        // Decode latitude
        let shift = 0
        let result = 0
        let byte: number
        do {
            byte = encoded.charCodeAt(index++) - 63
            result |= (byte & 0x1f) << shift
            shift += 5
        } while (byte >= 0x20)
        lat += result & 1 ? ~(result >> 1) : result >> 1

        // Decode longitude
        shift = 0
        result = 0
        do {
            byte = encoded.charCodeAt(index++) - 63
            result |= (byte & 0x1f) << shift
            shift += 5
        } while (byte >= 0x20)
        lng += result & 1 ? ~(result >> 1) : result >> 1

        points.push({ lat: lat / 1e5, lng: lng / 1e5 })
    }

    return points
}
