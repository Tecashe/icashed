"use client"

/**
 * Google Directions & Distance Matrix utilities
 * - Fetches road-following routes between stage waypoints
 * - Caches results per route ID to minimize API costs
 * - Provides traffic-aware ETA via Distance Matrix
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DirectionsResult {
    path: google.maps.LatLng[]
    totalDistanceMeters: number
    totalDurationSeconds: number
    legs: Array<{
        distanceMeters: number
        durationSeconds: number
        startAddress: string
        endAddress: string
    }>
}

export interface DistanceMatrixEntry {
    distanceMeters: number
    durationSeconds: number
    durationInTrafficSeconds?: number
}

interface StageCoord {
    lat: number
    lng: number
    name?: string
}

// ============================================================================
// CACHE
// ============================================================================

const directionsCache = new Map<string, DirectionsResult>()
const distanceMatrixCache = new Map<string, { result: DistanceMatrixEntry; timestamp: number }>()
const DISTANCE_MATRIX_CACHE_TTL = 30_000 // 30 seconds

// ============================================================================
// DIRECTIONS SERVICE
// ============================================================================

/**
 * Get road-following route path using Google Directions WAYPOINTS.
 *
 * Strategy:
 * Instead of routing each A→B pair separately (which lets Google pick any road),
 * we send ALL intermediate stages as Google Directions waypoints. This forces
 * Google to route through every defined point in the correct order, following
 * the actual roads matatus use.
 *
 * Google allows max 25 waypoints per request (origin + destination + 23 intermediates).
 * For routes with more stages, we split into batches.
 *
 * Results are cached by routeId for the entire session.
 */
export async function getRouteDirections(
    routeId: string,
    stages: StageCoord[]
): Promise<DirectionsResult | null> {
    // Return cached result
    if (directionsCache.has(routeId)) {
        return directionsCache.get(routeId)!
    }

    if (stages.length < 2) return null

    try {
        console.log(`[Directions] Fetching road path for route ${routeId} with ${stages.length} stages...`)
        const directionsService = new google.maps.DirectionsService()

        const allPath: google.maps.LatLng[] = []
        const allLegs: DirectionsResult["legs"] = []

        // Split into batches of up to 25 total points (origin + destination + 23 waypoints)
        const MAX_WAYPOINTS = 23
        const batchSize = MAX_WAYPOINTS + 2 // origin + destination + waypoints
        const batches: StageCoord[][] = []

        for (let i = 0; i < stages.length; i += batchSize - 1) {
            const end = Math.min(i + batchSize, stages.length)
            batches.push(stages.slice(i, end))
            if (end >= stages.length) break
        }

        console.log(`[Directions] Split into ${batches.length} batch(es)`)

        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
            const batch = batches[batchIdx]
            const origin = batch[0]
            const destination = batch[batch.length - 1]
            const intermediates = batch.slice(1, -1)

            try {
                console.log(`[Directions] Batch ${batchIdx + 1}/${batches.length}: ${origin.name || 'start'} → ${destination.name || 'end'} (${intermediates.length} waypoints)`)

                const request: google.maps.DirectionsRequest = {
                    origin: new google.maps.LatLng(origin.lat, origin.lng),
                    destination: new google.maps.LatLng(destination.lat, destination.lng),
                    travelMode: google.maps.TravelMode.DRIVING,
                    avoidHighways: true,
                    avoidTolls: true,
                    optimizeWaypoints: false, // Keep our exact order
                    waypoints: intermediates.map((wp) => ({
                        location: new google.maps.LatLng(wp.lat, wp.lng),
                        stopover: true,
                    })),
                }

                const result = await directionsService.route(request)

                if (result.routes.length > 0) {
                    const route = result.routes[0]
                    for (const leg of route.legs) {
                        // Extract road-following points
                        for (const step of leg.steps) {
                            allPath.push(...step.path)
                        }
                        allLegs.push({
                            distanceMeters: leg.distance?.value || 0,
                            durationSeconds: leg.duration?.value || 0,
                            startAddress: leg.start_address || "",
                            endAddress: leg.end_address || "",
                        })
                    }
                } else {
                    // Fallback: straight lines for this batch
                    console.warn(`[Directions] No routes returned for batch ${batchIdx + 1}`)
                    for (const stage of batch) {
                        allPath.push(new google.maps.LatLng(stage.lat, stage.lng))
                    }
                }
            } catch (batchError: any) {
                console.error(`[Directions] ❌ Batch ${batchIdx + 1} failed:`, batchError?.message || batchError)
                // Fallback: straight lines for this batch
                for (const stage of batch) {
                    allPath.push(new google.maps.LatLng(stage.lat, stage.lng))
                }
            }

            // Small delay between batch API calls
            if (batchIdx < batches.length - 1) {
                await new Promise((r) => setTimeout(r, 300))
            }
        }

        const totalDistanceMeters = allLegs.reduce((sum, l) => sum + l.distanceMeters, 0)
        const totalDurationSeconds = allLegs.reduce((sum, l) => sum + l.durationSeconds, 0)

        const directionsResult: DirectionsResult = {
            path: allPath,
            totalDistanceMeters,
            totalDurationSeconds,
            legs: allLegs,
        }

        console.log(`[Directions] ✅ Route ${routeId} complete: ${allPath.length} points, ${totalDistanceMeters}m`)

        // Cache it — so we only call the API once per route per session
        directionsCache.set(routeId, directionsResult)

        return directionsResult
    } catch (error: any) {
        console.error(`[Directions] ❌ TOTAL FAILURE for route ${routeId}:`, error?.message || error)
        console.error(`[Directions] This usually means the Directions API is not enabled or billing is not set up in Google Cloud Console.`)
        console.error(`[Directions] Go to: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com`)
        return null
    }
}

/**
 * Clear the directions cache. Useful when route data changes.
 */
export function clearDirectionsCache(routeId?: string) {
    if (routeId) {
        directionsCache.delete(routeId)
    } else {
        directionsCache.clear()
    }
    console.log(`[Directions] Cache cleared ${routeId ? `for route ${routeId}` : 'entirely'}`)
}

// ============================================================================
// DISTANCE MATRIX SERVICE
// ============================================================================

/**
 * Get road distance and traffic-aware ETA from multiple origins to a single destination.
 * Used for calculating how far each vehicle is from the passenger.
 * Results are cached for 30 seconds per origin-destination pair.
 */
export async function getDistanceMatrix(
    origins: Array<{ id: string; lat: number; lng: number }>,
    destination: { lat: number; lng: number }
): Promise<Map<string, DistanceMatrixEntry>> {
    const results = new Map<string, DistanceMatrixEntry>()

    if (origins.length === 0) return results

    // Check cache first, collect uncached origins
    const uncachedOrigins: Array<{ id: string; lat: number; lng: number; index: number }> = []
    const destKey = `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`
    const now = Date.now()

    origins.forEach((origin, index) => {
        const cacheKey = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}->${destKey}`
        const cached = distanceMatrixCache.get(cacheKey)

        if (cached && now - cached.timestamp < DISTANCE_MATRIX_CACHE_TTL) {
            results.set(origin.id, cached.result)
        } else {
            uncachedOrigins.push({ ...origin, index })
        }
    })

    if (uncachedOrigins.length === 0) return results

    try {
        const service = new google.maps.DistanceMatrixService()

        // Google allows max 25 origins per request
        const batchSize = 25
        for (let i = 0; i < uncachedOrigins.length; i += batchSize) {
            const batch = uncachedOrigins.slice(i, i + batchSize)

            const response = await service.getDistanceMatrix({
                origins: batch.map((o) => new google.maps.LatLng(o.lat, o.lng)),
                destinations: [new google.maps.LatLng(destination.lat, destination.lng)],
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS,
                },
            })

            batch.forEach((origin, batchIdx) => {
                const element = response.rows[batchIdx]?.elements[0]
                if (element && element.status === "OK") {
                    const entry: DistanceMatrixEntry = {
                        distanceMeters: element.distance?.value || 0,
                        durationSeconds: element.duration?.value || 0,
                        durationInTrafficSeconds: element.duration_in_traffic?.value,
                    }

                    results.set(origin.id, entry)

                    // Cache it
                    const cacheKey = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}->${destKey}`
                    distanceMatrixCache.set(cacheKey, { result: entry, timestamp: now })
                }
            })
        }
    } catch (error) {
        console.warn("Distance Matrix API failed:", error)
    }

    return results
}
