import { Redis } from "@upstash/redis"

// ═══════════════════════════════════════════════════════════════════
// REDIS CLIENT (graceful fallback if env vars not set)
// ═══════════════════════════════════════════════════════════════════

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export const redis: Redis | null =
    REDIS_URL && REDIS_TOKEN
        ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN })
        : null

export const isRedisAvailable = () => redis !== null

// ═══════════════════════════════════════════════════════════════════
// KEY PREFIXES
// ═══════════════════════════════════════════════════════════════════

const KEYS = {
    /** Hash storing a vehicle's latest position data */
    vehiclePosition: (vehicleId: string) => `vpos:${vehicleId}`,
    /** Set of all vehicle IDs with cached positions */
    activeVehicles: "active-vehicles",
    /** Geospatial index of vehicle locations */
    vehicleGeo: "vehicle-geo",
    /** Driver heartbeat (TTL key) */
    driverOnline: (vehicleId: string) => `online:${vehicleId}`,
} as const

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface CachedVehiclePosition {
    vehicleId: string
    plateNumber: string
    nickname: string | null
    type: string
    isPremium: boolean
    latitude: number
    longitude: number
    speed: number
    heading: number
    timestamp: string
    routes: string // JSON-encoded array of { id, name, color }
}

// ═══════════════════════════════════════════════════════════════════
// WRITE: Cache vehicle position + geospatial index
// ═══════════════════════════════════════════════════════════════════

/**
 * Write a vehicle's latest position to Redis.
 * Stores the full position data in a hash and updates the geo index.
 * Fire-and-forget — errors are logged but don't break the flow.
 */
export async function cacheVehiclePosition(data: {
    vehicleId: string
    plateNumber: string
    nickname: string | null
    type: string
    isPremium?: boolean
    latitude: number
    longitude: number
    speed: number
    heading: number
    timestamp: string
    routes: Array<{ id: string; name: string; color: string }>
}): Promise<void> {
    if (!redis) return

    try {
        const posKey = KEYS.vehiclePosition(data.vehicleId)

        // Store position data as a hash (all fields are strings in Redis)
        const hashData: Record<string, string> = {
            vehicleId: data.vehicleId,
            plateNumber: data.plateNumber,
            nickname: data.nickname || "",
            type: data.type,
            isPremium: data.isPremium ? "1" : "0",
            latitude: String(data.latitude),
            longitude: String(data.longitude),
            speed: String(data.speed),
            heading: String(data.heading),
            timestamp: data.timestamp,
            routes: JSON.stringify(data.routes),
        }

        await Promise.all([
            // Store full position data
            redis.hset(posKey, hashData),
            // Set 2-minute TTL so stale positions auto-expire
            redis.expire(posKey, 120),
            // Add to active vehicles set
            redis.sadd(KEYS.activeVehicles, data.vehicleId),
            // Update geospatial index (lng, lat order for Redis GEOADD)
            redis.geoadd(KEYS.vehicleGeo, {
                longitude: data.longitude,
                latitude: data.latitude,
                member: data.vehicleId,
            }),
        ])
    } catch (err) {
        console.error("Redis cacheVehiclePosition error:", err)
    }
}

// ═══════════════════════════════════════════════════════════════════
// READ: Get all cached positions
// ═══════════════════════════════════════════════════════════════════

/**
 * Get all cached vehicle positions from Redis.
 * Returns null if Redis is unavailable — caller should fall back to Postgres.
 */
export async function getCachedPositions(): Promise<CachedVehiclePosition[] | null> {
    if (!redis) return null

    try {
        // Get all active vehicle IDs
        const vehicleIds = await redis.smembers(KEYS.activeVehicles) as string[]
        if (!vehicleIds || vehicleIds.length === 0) return null

        // Fetch all position hashes in parallel
        const pipeline = redis.pipeline()
        for (const id of vehicleIds) {
            pipeline.hgetall(KEYS.vehiclePosition(id))
        }
        const results = await pipeline.exec()

        const positions: CachedVehiclePosition[] = []
        for (let i = 0; i < results.length; i++) {
            const data = results[i] as Record<string, string> | null
            if (!data || !data.vehicleId) {
                // Position expired — remove from active set
                if (vehicleIds[i]) {
                    redis.srem(KEYS.activeVehicles, vehicleIds[i]).catch(() => { })
                    redis.zrem(KEYS.vehicleGeo, vehicleIds[i]).catch(() => { })
                }
                continue
            }

            positions.push({
                vehicleId: data.vehicleId,
                plateNumber: data.plateNumber,
                nickname: data.nickname || null,
                type: data.type,
                isPremium: data.isPremium === "1",
                latitude: parseFloat(data.latitude),
                longitude: parseFloat(data.longitude),
                speed: parseFloat(data.speed),
                heading: parseFloat(data.heading),
                timestamp: data.timestamp,
                routes: data.routes, // Keep as JSON string, parsed by consumer
            })
        }

        return positions.length > 0 ? positions : null
    } catch (err) {
        console.error("Redis getCachedPositions error:", err)
        return null // Fall back to Postgres
    }
}

// ═══════════════════════════════════════════════════════════════════
// READ: Get nearby vehicles (geospatial)
// ═══════════════════════════════════════════════════════════════════

/**
 * Find vehicle IDs within a radius of a location.
 * Uses GEOSEARCH (Redis 6.2+).
 * Returns null if Redis is unavailable.
 */
export async function getNearbyVehicleIds(
    lat: number,
    lng: number,
    radiusKm: number = 5
): Promise<string[] | null> {
    if (!redis) return null

    try {
        const results = await redis.geosearch(
            KEYS.vehicleGeo,
            { type: "FROMLONLAT", coordinate: { lon: lng, lat: lat } },
            { type: "BYRADIUS", radius: radiusKm, radiusType: "KM" },
            "ASC"
        )
        // Results are objects with { member } — extract member strings
        return results.map((r: any) => typeof r === "string" ? r : r.member) as string[]
    } catch (err) {
        console.error("Redis getNearbyVehicles error:", err)
        return null
    }
}

// ═══════════════════════════════════════════════════════════════════
// READ: Get a single vehicle's cached position
// ═══════════════════════════════════════════════════════════════════

/**
 * Get a single vehicle's cached position from Redis.
 * Returns null if not found or Redis is unavailable.
 */
export async function getCachedVehiclePosition(
    vehicleId: string
): Promise<CachedVehiclePosition | null> {
    if (!redis) return null

    try {
        const data = await redis.hgetall(KEYS.vehiclePosition(vehicleId)) as Record<string, string> | null
        if (!data || !data.vehicleId) return null

        return {
            vehicleId: data.vehicleId,
            plateNumber: data.plateNumber,
            nickname: data.nickname || null,
            type: data.type,
            isPremium: data.isPremium === "1",
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            speed: parseFloat(data.speed),
            heading: parseFloat(data.heading),
            timestamp: data.timestamp,
            routes: data.routes,
        }
    } catch (err) {
        console.error("Redis getCachedVehiclePosition error:", err)
        return null
    }
}

// ═══════════════════════════════════════════════════════════════════
// DRIVER PRESENCE (heartbeat with TTL)
// ═══════════════════════════════════════════════════════════════════

const HEARTBEAT_TTL = 30 // seconds

/**
 * Mark a driver/vehicle as online. Call on each position update.
 * The key auto-expires after 30s if no new heartbeat.
 */
export async function setDriverOnline(vehicleId: string): Promise<void> {
    if (!redis) return

    try {
        await redis.set(KEYS.driverOnline(vehicleId), "1", { ex: HEARTBEAT_TTL })
    } catch (err) {
        console.error("Redis setDriverOnline error:", err)
    }
}

/**
 * Check if a driver/vehicle is currently online.
 */
export async function isDriverOnline(vehicleId: string): Promise<boolean> {
    if (!redis) return false

    try {
        const result = await redis.get(KEYS.driverOnline(vehicleId))
        return result === "1"
    } catch (err) {
        console.error("Redis isDriverOnline error:", err)
        return false
    }
}
