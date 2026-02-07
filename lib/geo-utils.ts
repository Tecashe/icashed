/**
 * Geospatial Utilities for Radaa Real-Time Tracking
 * 
 * Core mathematical functions for route calculations, ETA estimation,
 * and vehicle progress tracking along routes.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GeoPoint {
    latitude: number
    longitude: number
}

export interface RouteStage extends GeoPoint {
    id: string
    name: string
    order: number
    isTerminal: boolean
}

export interface VehicleProgress {
    routeId: string
    routeName: string
    routeColor: string
    progress: number // 0-100%
    distanceTraveled: number // km from origin
    totalDistance: number // km total route length
    currentStageIndex: number // Index of last passed stage
    currentStage: RouteStage | null // Last passed stage
    nextStage: RouteStage | null // Next upcoming stage
    distanceToNextStage: number // km to next stage
    etaToNextStage: number // minutes to next stage
    etaToTerminus: number // minutes to end of route
    direction: "outbound" | "inbound" // Travel direction
    isOnRoute: boolean // Is vehicle close enough to route
    nearestPointOnRoute: GeoPoint // Snapped position on route
    deviationDistance: number // How far off route (km)
}

export interface ETAResult {
    etaMinutes: number
    distanceKm: number
    stagesAway: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const EARTH_RADIUS_KM = 6371
const DEG_TO_RAD = Math.PI / 180
const MAX_ROUTE_DEVIATION_KM = 0.5 // Vehicle considered "on route" if within 500m

// ============================================================================
// DISTANCE CALCULATIONS
// ============================================================================

/**
 * Calculate the Haversine distance between two GPS points
 * @returns Distance in kilometers
 */
export function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const dLat = (lat2 - lat1) * DEG_TO_RAD
    const dLon = (lon2 - lon1) * DEG_TO_RAD

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * DEG_TO_RAD) *
        Math.cos(lat2 * DEG_TO_RAD) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c
}

/**
 * Calculate distance between two GeoPoints
 */
export function distanceBetweenPoints(p1: GeoPoint, p2: GeoPoint): number {
    return haversineDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude)
}

/**
 * Calculate total length of a route through all stages
 */
export function calculateRouteLength(stages: RouteStage[]): number {
    if (stages.length < 2) return 0

    let total = 0
    for (let i = 0; i < stages.length - 1; i++) {
        total += distanceBetweenPoints(stages[i], stages[i + 1])
    }
    return total
}

/**
 * Calculate cumulative distances from route start to each stage
 */
export function getCumulativeDistances(stages: RouteStage[]): number[] {
    const distances: number[] = [0]

    for (let i = 1; i < stages.length; i++) {
        distances.push(distances[i - 1] + distanceBetweenPoints(stages[i - 1], stages[i]))
    }

    return distances
}

// ============================================================================
// ROUTE SNAPPING / PROJECTION
// ============================================================================

/**
 * Find the nearest point on a line segment to a given point
 * Uses vector projection math for accuracy
 */
function projectPointOnSegment(
    point: GeoPoint,
    segStart: GeoPoint,
    segEnd: GeoPoint
): { point: GeoPoint; t: number } {
    const dx = segEnd.longitude - segStart.longitude
    const dy = segEnd.latitude - segStart.latitude

    if (dx === 0 && dy === 0) {
        return { point: segStart, t: 0 }
    }

    const px = point.longitude - segStart.longitude
    const py = point.latitude - segStart.latitude

    // Calculate projection parameter (0-1 means on segment)
    let t = (px * dx + py * dy) / (dx * dx + dy * dy)
    t = Math.max(0, Math.min(1, t)) // Clamp to segment

    return {
        point: {
            latitude: segStart.latitude + t * dy,
            longitude: segStart.longitude + t * dx,
        },
        t,
    }
}

/**
 * Find the nearest point on a route to a given position
 * Returns the projected point, segment index, and distance from route
 */
export function findNearestPointOnRoute(
    position: GeoPoint,
    stages: RouteStage[]
): {
    nearestPoint: GeoPoint
    segmentIndex: number
    segmentT: number // Interpolation parameter within segment
    distance: number
    distanceAlongRoute: number
} {
    if (stages.length === 0) {
        return {
            nearestPoint: position,
            segmentIndex: 0,
            segmentT: 0,
            distance: 0,
            distanceAlongRoute: 0,
        }
    }

    if (stages.length === 1) {
        return {
            nearestPoint: stages[0],
            segmentIndex: 0,
            segmentT: 0,
            distance: distanceBetweenPoints(position, stages[0]),
            distanceAlongRoute: 0,
        }
    }

    let minDistance = Infinity
    let nearestPoint: GeoPoint = stages[0]
    let bestSegmentIndex = 0
    let bestSegmentT = 0

    const cumulativeDistances = getCumulativeDistances(stages)

    for (let i = 0; i < stages.length - 1; i++) {
        const { point, t } = projectPointOnSegment(position, stages[i], stages[i + 1])
        const distance = distanceBetweenPoints(position, point)

        if (distance < minDistance) {
            minDistance = distance
            nearestPoint = point
            bestSegmentIndex = i
            bestSegmentT = t
        }
    }

    // Calculate distance along route to the nearest point
    const segmentLength = distanceBetweenPoints(stages[bestSegmentIndex], stages[bestSegmentIndex + 1])
    const distanceAlongRoute = cumulativeDistances[bestSegmentIndex] + segmentLength * bestSegmentT

    return {
        nearestPoint,
        segmentIndex: bestSegmentIndex,
        segmentT: bestSegmentT,
        distance: minDistance,
        distanceAlongRoute,
    }
}

// ============================================================================
// PROGRESS & ETA CALCULATIONS
// ============================================================================

/**
 * Calculate vehicle progress along a route
 * Returns percentage (0-100) and detailed progress info
 */
export function calculateRouteProgress(
    position: GeoPoint,
    stages: RouteStage[],
    avgSpeedKmh: number = 25 // Default average matatu speed
): VehicleProgress | null {
    if (stages.length < 2) return null

    const { nearestPoint, segmentIndex, distance, distanceAlongRoute } =
        findNearestPointOnRoute(position, stages)

    const totalDistance = calculateRouteLength(stages)
    const progress = totalDistance > 0 ? (distanceAlongRoute / totalDistance) * 100 : 0

    // Determine current and next stage
    const currentStageIndex = segmentIndex
    const currentStage = stages[currentStageIndex]
    const nextStage = stages[currentStageIndex + 1] || null

    // Distance to next stage
    const distanceToNextStage = nextStage
        ? distanceBetweenPoints(nearestPoint, nextStage)
        : 0

    // Remaining distance to terminus
    const remainingDistance = totalDistance - distanceAlongRoute

    // ETA calculations
    const etaToNextStage = avgSpeedKmh > 0
        ? (distanceToNextStage / avgSpeedKmh) * 60
        : 0
    const etaToTerminus = avgSpeedKmh > 0
        ? (remainingDistance / avgSpeedKmh) * 60
        : 0

    // Determine direction based on progress and stage ordering
    // Stages are ordered from origin to destination (outbound)
    // If vehicle is moving towards higher stage indices, it's outbound
    const direction: "outbound" | "inbound" = "outbound" // Default assumption

    return {
        routeId: "", // Will be set by caller
        routeName: "", // Will be set by caller
        routeColor: "", // Will be set by caller
        progress: Math.min(100, Math.max(0, progress)),
        distanceTraveled: distanceAlongRoute,
        totalDistance,
        currentStageIndex,
        currentStage,
        nextStage,
        distanceToNextStage,
        etaToNextStage: Math.round(etaToNextStage),
        etaToTerminus: Math.round(etaToTerminus),
        direction,
        isOnRoute: distance <= MAX_ROUTE_DEVIATION_KM,
        nearestPointOnRoute: nearestPoint,
        deviationDistance: distance,
    }
}

/**
 * Calculate ETA from current position to a specific stage
 */
export function calculateETAToStage(
    position: GeoPoint,
    stages: RouteStage[],
    targetStageIndex: number,
    avgSpeedKmh: number = 25
): ETAResult | null {
    if (targetStageIndex < 0 || targetStageIndex >= stages.length) return null

    const { distanceAlongRoute } = findNearestPointOnRoute(position, stages)
    const cumulativeDistances = getCumulativeDistances(stages)
    const targetDistance = cumulativeDistances[targetStageIndex]

    // Calculate remaining distance
    const remainingDistance = Math.max(0, targetDistance - distanceAlongRoute)

    // Count stages between current position and target
    const { segmentIndex } = findNearestPointOnRoute(position, stages)
    const stagesAway = Math.max(0, targetStageIndex - segmentIndex)

    return {
        etaMinutes: avgSpeedKmh > 0 ? Math.round((remainingDistance / avgSpeedKmh) * 60) : 0,
        distanceKm: remainingDistance,
        stagesAway,
    }
}

// ============================================================================
// BEARING & DIRECTION
// ============================================================================

/**
 * Calculate bearing (heading) from one point to another
 * @returns Bearing in degrees (0-360, where 0 = North)
 */
export function calculateBearing(from: GeoPoint, to: GeoPoint): number {
    const lat1 = from.latitude * DEG_TO_RAD
    const lat2 = to.latitude * DEG_TO_RAD
    const dLon = (to.longitude - from.longitude) * DEG_TO_RAD

    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

    let bearing = Math.atan2(y, x) * (180 / Math.PI)
    return (bearing + 360) % 360
}

/**
 * Get cardinal direction from bearing
 */
export function bearingToCardinal(bearing: number): string {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    const index = Math.round(bearing / 45) % 8
    return directions[index]
}

// ============================================================================
// INTERPOLATION
// ============================================================================

/**
 * Interpolate a point along the route at a given progress percentage
 * Useful for animating vehicle movement
 */
export function interpolateAlongRoute(
    stages: RouteStage[],
    progressPercent: number
): GeoPoint | null {
    if (stages.length < 2) return stages[0] || null

    const totalDistance = calculateRouteLength(stages)
    const targetDistance = (progressPercent / 100) * totalDistance

    const cumulativeDistances = getCumulativeDistances(stages)

    // Find the segment containing the target distance
    for (let i = 0; i < cumulativeDistances.length - 1; i++) {
        if (targetDistance >= cumulativeDistances[i] && targetDistance <= cumulativeDistances[i + 1]) {
            const segmentStart = cumulativeDistances[i]
            const segmentLength = cumulativeDistances[i + 1] - segmentStart
            const t = segmentLength > 0 ? (targetDistance - segmentStart) / segmentLength : 0

            return {
                latitude: stages[i].latitude + t * (stages[i + 1].latitude - stages[i].latitude),
                longitude: stages[i].longitude + t * (stages[i + 1].longitude - stages[i].longitude),
            }
        }
    }

    // If we exceeded the route, return the last stage
    return stages[stages.length - 1]
}

// ============================================================================
// SPEED ESTIMATION
// ============================================================================

/**
 * Estimate average speed based on vehicle type and conditions
 * Returns speed in km/h
 */
export function estimateAverageSpeed(
    vehicleType: string,
    isRushHour: boolean = false
): number {
    const baseSpeedsKmh: Record<string, number> = {
        MATATU: 30,
        BUS: 25,
        BODA: 35,
        TUK_TUK: 25,
    }

    let speed = baseSpeedsKmh[vehicleType] || 25

    // Reduce speed during rush hour (7-9 AM, 5-7 PM)
    if (isRushHour) {
        speed *= 0.6 // 40% slower
    }

    return speed
}

/**
 * Check if current time is rush hour in Nairobi
 */
export function isRushHour(): boolean {
    const hour = new Date().getHours()
    return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
}

// ============================================================================
// ROUTE MATCHING
// ============================================================================

/**
 * Find the best matching route for a vehicle based on its position
 * and assigned routes
 */
export function findBestMatchingRoute<T extends { id: string; stages: RouteStage[] }>(
    position: GeoPoint,
    assignedRoutes: T[]
): { route: T; progress: VehicleProgress } | null {
    if (assignedRoutes.length === 0) return null

    let bestMatch: { route: T; progress: VehicleProgress; score: number } | null = null

    for (const route of assignedRoutes) {
        if (route.stages.length < 2) continue

        const progress = calculateRouteProgress(position, route.stages)
        if (!progress) continue

        // Score based on proximity to route (lower deviation = better)
        // and how far along the route they are (penalize being at 0% or 100%)
        const deviationPenalty = progress.deviationDistance * 10
        const progressPenalty = progress.progress < 5 || progress.progress > 95 ? 5 : 0
        const score = deviationPenalty + progressPenalty

        if (!bestMatch || score < bestMatch.score) {
            bestMatch = { route, progress, score }
        }
    }

    if (!bestMatch) return null

    return {
        route: bestMatch.route,
        progress: bestMatch.progress,
    }
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`
    }
    return `${km.toFixed(1)} km`
}

/**
 * Format ETA for display
 */
export function formatETA(minutes: number): string {
    if (minutes < 1) {
        return "< 1 min"
    }
    if (minutes < 60) {
        return `${Math.round(minutes)} min`
    }
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}
