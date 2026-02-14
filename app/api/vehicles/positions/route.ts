import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { positionUpdateSchema } from "@/lib/validations"
import { getCachedPositions, getNearbyVehicleIds, getCachedVehiclePosition } from "@/lib/redis"

// GET /api/vehicles/positions - Get latest positions for all active vehicles
// Tries Redis cache first, falls back to Postgres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")
    const radius = searchParams.get("radius")

    // ─── Geospatial query: nearby vehicles only ──────────────────
    if (lat && lng) {
      const radiusKm = radius ? parseFloat(radius) : 5
      const nearbyIds = await getNearbyVehicleIds(
        parseFloat(lat),
        parseFloat(lng),
        radiusKm
      )

      if (nearbyIds && nearbyIds.length > 0) {
        // Fetch full data from Redis for nearby vehicles
        const positions = await Promise.all(
          nearbyIds.map(id => getCachedVehiclePosition(id))
        )

        const validPositions = positions
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map(p => ({
            vehicleId: p.vehicleId,
            plateNumber: p.plateNumber,
            nickname: p.nickname,
            type: p.type,
            isPremium: p.isPremium,
            position: {
              latitude: p.latitude,
              longitude: p.longitude,
              speed: p.speed,
              heading: p.heading,
              timestamp: p.timestamp,
            },
            routes: JSON.parse(p.routes || "[]"),
          }))

        if (validPositions.length > 0) {
          return NextResponse.json({ positions: validPositions, source: "redis-geo" })
        }
      }
      // Fall through to full cache or Postgres
    }

    // ─── Try Redis cache for all positions ───────────────────────
    const cached = await getCachedPositions()
    if (cached && cached.length > 0) {
      const positions = cached.map(p => ({
        vehicleId: p.vehicleId,
        plateNumber: p.plateNumber,
        nickname: p.nickname,
        type: p.type,
        isPremium: p.isPremium,
        position: {
          latitude: p.latitude,
          longitude: p.longitude,
          speed: p.speed,
          heading: p.heading,
          timestamp: p.timestamp,
        },
        routes: JSON.parse(p.routes || "[]"),
      }))

      return NextResponse.json({ positions, source: "redis" })
    }

    // ─── Fallback to Postgres ────────────────────────────────────
    const vehicles = await prisma.vehicle.findMany({
      where: { isActive: true },
      include: {
        positions: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
        routes: {
          include: { route: { select: { id: true, name: true, color: true } } },
        },
      },
    })

    const positions = vehicles
      .filter((v: any) => v.positions.length > 0)
      .map((v: any) => ({
        vehicleId: v.id,
        plateNumber: v.plateNumber,
        nickname: v.nickname,
        type: v.type,
        isPremium: v.isPremium,
        imageUrl: v.images?.[0]?.url || null,
        position: v.positions[0],
        routes: v.routes.map((vr: any) => vr.route),
      }))

    return NextResponse.json({ positions, source: "postgres" })
  } catch (error) {
    console.error("Error fetching positions:", error)
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 }
    )
  }
}

// POST /api/vehicles/positions - Update vehicle position(for operators/drivers)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = positionUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid position data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { vehicleId, latitude, longitude, speed, heading } = parsed.data

    const position = await prisma.vehiclePosition.create({
      data: {
        vehicleId,
        latitude,
        longitude,
        speed,
        heading,
      },
    })

    return NextResponse.json({ position }, { status: 201 })
  } catch (error) {
    console.error("Error updating position:", error)
    return NextResponse.json(
      { error: "Failed to update position" },
      { status: 500 }
    )
  }
}
