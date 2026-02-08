/**
 * Geographic utility functions for distance, time, and bearing calculations
 */

const EARTH_RADIUS_KM = 6371

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
    currentStageIndex: number
    nextStage: RouteStage | null
    progress: number // 0-100% along route
    distanceTraveled: number // km
    totalDistance: number // km
    distanceToNextStage: number // km
    etaToNextStage: number // minutes
    etaToTerminus: number // minutes
    deviationDistance: number // km off-route
    isOnRoute: boolean
}

// ============================================================================
// BASIC CALCULATIONS
// ============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const dLat = toRadians(lat2 - lat1)
    const dLng = toRadians(lng2 - lng1)

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c * 1000 // Convert to meters
}

/**
 * Calculate distance in kilometers
 */
export function calculateDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    return calculateDistance(lat1, lng1, lat2, lng2) / 1000
}

/**
 * Estimate walking time based on distance
 * Average walking speed: 5 km/h = 83.33 m/min
 */
export function estimateWalkingTime(distanceMeters: number): number {
    const walkingSpeedMPerMin = 83.33
    return Math.ceil(distanceMeters / walkingSpeedMPerMin)
}

/**
 * Estimate driving time based on distance and traffic conditions
 * @param distanceKm Distance in kilometers
 * @param trafficFactor 1.0 = no traffic, 2.0 = heavy traffic
 * @returns Time in minutes
 */
export function estimateDrivingTime(
    distanceKm: number,
    trafficFactor: number = 1.3
): number {
    // Average city speed ~30 km/h adjusted for traffic
    const avgSpeed = 30 / trafficFactor
    return Math.ceil((distanceKm / avgSpeed) * 60)
}

/**
 * Calculate bearing between two points (direction in degrees)
 * 0° = North, 90° = East, 180° = South, 270° = West
 */
export function calculateBearing(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const dLng = toRadians(lng2 - lng1)
    const lat1Rad = toRadians(lat1)
    const lat2Rad = toRadians(lat2)

    const y = Math.sin(dLng) * Math.cos(lat2Rad)
    const x =
        Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)

    const bearing = (toDegrees(Math.atan2(y, x)) + 360) % 360
    return bearing
}

/**
 * Get cardinal direction from bearing
 */
export function getCardinalDirection(bearing: number): string {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    const index = Math.round(bearing / 45) % 8
    return directions[index]
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`
    }
    return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Format walking time for display
 */
export function formatWalkingTime(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min walk`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}min walk`
}

/**
 * Find the nearest location from a list of coordinates
 */
export function findNearest<T extends { latitude: number; longitude: number }>(
    userLat: number,
    userLng: number,
    locations: T[]
): { location: T; distance: number } | null {
    if (locations.length === 0) return null

    let nearest = locations[0]
    let minDistance = calculateDistance(
        userLat,
        userLng,
        nearest.latitude,
        nearest.longitude
    )

    for (const loc of locations.slice(1)) {
        const dist = calculateDistance(userLat, userLng, loc.latitude, loc.longitude)
        if (dist < minDistance) {
            minDistance = dist
            nearest = loc
        }
    }

    return { location: nearest, distance: minDistance }
}

/**
 * Check if a vehicle is approaching a stage (within threshold)
 */
export function isApproaching(
    vehicleLat: number,
    vehicleLng: number,
    stageLat: number,
    stageLng: number,
    thresholdMeters: number = 500
): boolean {
    const distance = calculateDistance(vehicleLat, vehicleLng, stageLat, stageLng)
    return distance <= thresholdMeters
}

/**
 * Calculate ETA of a vehicle to a stage based on current speed and distance
 */
export function calculateETA(
    vehicleLat: number,
    vehicleLng: number,
    stageLat: number,
    stageLng: number,
    speedKmh: number
): number {
    const distanceKm = calculateDistanceKm(vehicleLat, vehicleLng, stageLat, stageLng)
    if (speedKmh <= 0) return Infinity

    // Minutes to reach
    return Math.ceil((distanceKm / speedKmh) * 60)
}

/**
 * Generate intermediate points for a dotted navigation path
 */
export function generatePathPoints(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    numPoints: number = 10
): Array<[number, number]> {
    const points: Array<[number, number]> = []

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints
        const lat = startLat + t * (endLat - startLat)
        const lng = startLng + t * (endLng - startLng)
        points.push([lat, lng])
    }

    return points
}

// ============================================================================
// ROUTE PROGRESS CALCULATION
// ============================================================================

/**
 * Check if it's rush hour (7-9 AM or 5-7 PM on weekdays)
 */
export function isRushHour(): boolean {
    const now = new Date()
    const hour = now.getHours()
    const day = now.getDay()

    // Weekend
    if (day === 0 || day === 6) return false

    // Morning rush (7-9 AM) or evening rush (5-7 PM)
    return (hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)
}

/**
 * Estimate average speed based on vehicle type and traffic
 */
export function estimateAverageSpeed(vehicleType: string, rushHour: boolean): number {
    const baseSpeeds: Record<string, number> = {
        MATATU: 35,
        BUS: 30,
        BODA: 40,
        TUK_TUK: 25,
    }

    const baseSpeed = baseSpeeds[vehicleType] || 30
    return rushHour ? baseSpeed * 0.6 : baseSpeed
}

/**
 * Calculate total route distance
 */
function calculateTotalRouteDistance(stages: RouteStage[]): number {
    let total = 0
    for (let i = 0; i < stages.length - 1; i++) {
        total += calculateDistanceKm(
            stages[i].latitude,
            stages[i].longitude,
            stages[i + 1].latitude,
            stages[i + 1].longitude
        )
    }
    return total
}

/**
 * Find the closest segment on a route to a given point
 */
function findClosestSegment(
    point: GeoPoint,
    stages: RouteStage[]
): { segmentIndex: number; distanceToRoute: number } {
    let closestIndex = 0
    let minDistance = Infinity

    for (let i = 0; i < stages.length - 1; i++) {
        // Calculate distance to this segment (simplified: distance to segment start)
        const dist = calculateDistanceKm(
            point.latitude,
            point.longitude,
            stages[i].latitude,
            stages[i].longitude
        )

        if (dist < minDistance) {
            minDistance = dist
            closestIndex = i
        }
    }

    return { segmentIndex: closestIndex, distanceToRoute: minDistance }
}

/**
 * Calculate vehicle progress along a route
 */
export function calculateRouteProgress(
    position: GeoPoint,
    stages: RouteStage[],
    avgSpeedKmh: number
): VehicleProgress | null {
    if (stages.length < 2) return null

    const { segmentIndex, distanceToRoute } = findClosestSegment(position, stages)

    const totalDistance = calculateTotalRouteDistance(stages)

    // Calculate distance traveled (sum of all segments before current)
    let distanceTraveled = 0
    for (let i = 0; i < segmentIndex; i++) {
        distanceTraveled += calculateDistanceKm(
            stages[i].latitude,
            stages[i].longitude,
            stages[i + 1].latitude,
            stages[i + 1].longitude
        )
    }

    // Add partial distance within current segment
    const distToCurrentStage = calculateDistanceKm(
        position.latitude,
        position.longitude,
        stages[segmentIndex].latitude,
        stages[segmentIndex].longitude
    )

    // Progress percentage
    const progress = totalDistance > 0 ? (distanceTraveled / totalDistance) * 100 : 0

    // Next stage info
    const nextStageIndex = Math.min(segmentIndex + 1, stages.length - 1)
    const nextStage = stages[nextStageIndex]
    const distanceToNextStage = calculateDistanceKm(
        position.latitude,
        position.longitude,
        nextStage.latitude,
        nextStage.longitude
    )

    // ETA calculations
    const etaToNextStage = avgSpeedKmh > 0 ? (distanceToNextStage / avgSpeedKmh) * 60 : 0
    const remainingDistance = totalDistance - distanceTraveled
    const etaToTerminus = avgSpeedKmh > 0 ? (remainingDistance / avgSpeedKmh) * 60 : 0

    // Consider on-route if within 500m
    const isOnRoute = distanceToRoute < 0.5

    return {
        currentStageIndex: segmentIndex,
        nextStage,
        progress,
        distanceTraveled,
        totalDistance,
        distanceToNextStage,
        etaToNextStage,
        etaToTerminus,
        deviationDistance: distanceToRoute,
        isOnRoute,
    }
}

// ============================================================================
// HELPERS
// ============================================================================

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
}

function toDegrees(radians: number): number {
    return radians * (180 / Math.PI)
}
