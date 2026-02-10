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
 * Get road-following route path for an array of stage coordinates.
 * Uses Google Directions API with waypoints.
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
        const directionsService = new google.maps.DirectionsService()

        const origin = stages[0]
        const destination = stages[stages.length - 1]

        // Google allows max 25 waypoints (23 intermediate + origin + destination)
        // For routes with many stages, we sample intermediate waypoints
        let waypoints: google.maps.DirectionsWaypoint[] = []
        const intermediateStages = stages.slice(1, -1)

        if (intermediateStages.length <= 23) {
            waypoints = intermediateStages.map((s) => ({
                location: new google.maps.LatLng(s.lat, s.lng),
                stopover: true,
            }))
        } else {
            // Sample evenly if too many stages
            const step = intermediateStages.length / 23
            for (let i = 0; i < 23; i++) {
                const idx = Math.round(i * step)
                const s = intermediateStages[idx]
                waypoints.push({
                    location: new google.maps.LatLng(s.lat, s.lng),
                    stopover: true,
                })
            }
        }

        const result = await directionsService.route({
            origin: new google.maps.LatLng(origin.lat, origin.lng),
            destination: new google.maps.LatLng(destination.lat, destination.lng),
            waypoints,
            optimizeWaypoints: false, // Keep stage order
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
                departureTime: new Date(),
                trafficModel: google.maps.TrafficModel.BEST_GUESS,
            },
        })

        if (result.routes.length === 0) return null

        const route = result.routes[0]

        // Extract full path from all legs
        const path: google.maps.LatLng[] = []
        const legs: DirectionsResult["legs"] = []

        for (const leg of route.legs) {
            // Add all points from this leg's steps
            for (const step of leg.steps) {
                path.push(...step.path)
            }

            legs.push({
                distanceMeters: leg.distance?.value || 0,
                durationSeconds: leg.duration?.value || 0,
                startAddress: leg.start_address || "",
                endAddress: leg.end_address || "",
            })
        }

        const totalDistanceMeters = legs.reduce((sum, l) => sum + l.distanceMeters, 0)
        const totalDurationSeconds = legs.reduce((sum, l) => sum + l.durationSeconds, 0)

        const directionsResult: DirectionsResult = {
            path,
            totalDistanceMeters,
            totalDurationSeconds,
            legs,
        }

        // Cache it
        directionsCache.set(routeId, directionsResult)

        return directionsResult
    } catch (error) {
        console.warn(`Directions API failed for route ${routeId}:`, error)
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
