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
 * Get road-following route path by routing EACH CONSECUTIVE PAIR of stages.
 *
 * Why segment-by-segment?
 * When you route from Stage A → Stage Z with all intermediates as waypoints,
 * Google picks whatever optimal road it wants, which often doesn't match the
 * actual matatu route. By routing A→B, B→C, C→D separately, each segment is
 * short enough that Google follows the actual (and usually only) road between
 * them.
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
        console.log(`[Directions] DirectionsService created successfully`)

        const allPath: google.maps.LatLng[] = []
        const allLegs: DirectionsResult["legs"] = []

        // Route each consecutive pair: A→B, B→C, C→D, ...
        for (let i = 0; i < stages.length - 1; i++) {
            const from = stages[i]
            const to = stages[i + 1]

            try {
                console.log(`[Directions] Requesting segment ${i + 1}/${stages.length - 1}: ${from.name || 'unknown'} → ${to.name || 'unknown'}`)
                const result = await directionsService.route({
                    origin: new google.maps.LatLng(from.lat, from.lng),
                    destination: new google.maps.LatLng(to.lat, to.lng),
                    travelMode: google.maps.TravelMode.DRIVING,
                    avoidHighways: true,
                    avoidTolls: true,
                })
                console.log(`[Directions] Segment ${i + 1} returned ${result.routes.length} routes`)

                if (result.routes.length > 0 && result.routes[0].legs.length > 0) {
                    const leg = result.routes[0].legs[0]

                    // Extract road-following points from this segment
                    for (const step of leg.steps) {
                        allPath.push(...step.path)
                    }

                    allLegs.push({
                        distanceMeters: leg.distance?.value || 0,
                        durationSeconds: leg.duration?.value || 0,
                        startAddress: leg.start_address || from.name || "",
                        endAddress: leg.end_address || to.name || "",
                    })
                } else {
                    // Fallback: straight line for this segment
                    allPath.push(
                        new google.maps.LatLng(from.lat, from.lng),
                        new google.maps.LatLng(to.lat, to.lng)
                    )
                    allLegs.push({
                        distanceMeters: 0,
                        durationSeconds: 0,
                        startAddress: from.name || "",
                        endAddress: to.name || "",
                    })
                }
            } catch (segmentError: any) {
                // If one segment fails, fall back to straight line for that segment
                console.error(`[Directions] ❌ SEGMENT FAILED: ${from.name} → ${to.name}:`, segmentError?.message || segmentError)
                console.error(`[Directions] Error details:`, JSON.stringify(segmentError, null, 2))
                allPath.push(
                    new google.maps.LatLng(from.lat, from.lng),
                    new google.maps.LatLng(to.lat, to.lng)
                )
                allLegs.push({
                    distanceMeters: 0,
                    durationSeconds: 0,
                    startAddress: from.name || "",
                    endAddress: to.name || "",
                })
            }

            // Small delay between API calls to avoid rate limiting
            if (i < stages.length - 2) {
                await new Promise((r) => setTimeout(r, 200))
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

/**
 * Clear the directions cache (useful if routes change)
 */
export function clearDirectionsCache(routeId?: string) {
    if (routeId) {
        directionsCache.delete(routeId)
    } else {
        directionsCache.clear()
    }
}
