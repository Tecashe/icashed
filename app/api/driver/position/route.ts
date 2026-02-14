import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { positionUpdateSchema } from "@/lib/validations"
import {
  pusherServer,
  CHANNELS,
  EVENTS,
  getRouteChannel,
  getStageChannel,
  type PositionUpdatePayload,
  type VehicleApproachingPayload,
} from "@/lib/pusher"
import { calculateDistance, calculateETA } from "@/lib/geo-utils"
import { createNotification } from "@/lib/notifications"
import { cacheVehiclePosition, setDriverOnline } from "@/lib/redis"

// Approach threshold in meters
const APPROACH_THRESHOLD = 500

// Dedup cache: prevent sending the same notification within 5 minutes
// Key: `${vehicleId}-${stageId}`, Value: timestamp of last notification
const notificationDedup = new Map<string, number>()
const DEDUP_TTL = 5 * 60 * 1000 // 5 minutes

// POST /api/driver/position - Update vehicle position (authenticated driver)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = positionUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid position data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { vehicleId, latitude, longitude, speed, heading, accuracy } = parsed.data

    // Verify the vehicle belongs to this driver and get route info with stages
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, ownerId: user.id },
      include: {
        routes: {
          include: {
            route: {
              select: {
                id: true,
                name: true,
                color: true,
                stages: {
                  select: {
                    id: true,
                    name: true,
                    latitude: true,
                    longitude: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found or not owned by you" },
        { status: 403 }
      )
    }

    const position = await prisma.vehiclePosition.create({
      data: { vehicleId, latitude, longitude, speed, heading },
    })

    // ─── Cache in Redis (fire-and-forget) ───────────────────────
    cacheVehiclePosition({
      vehicleId: vehicle.id,
      plateNumber: vehicle.plateNumber,
      nickname: vehicle.nickname,
      type: vehicle.type,
      isPremium: (vehicle as any).isPremium ?? false,
      latitude,
      longitude,
      speed,
      heading,
      timestamp: position.timestamp.toISOString(),
      routes: vehicle.routes.map((vr) => vr.route),
    }).catch((err) => console.error("Redis cache error:", err))

    // ─── Driver heartbeat ──────────────────────────────────────
    setDriverOnline(vehicle.id).catch(() => { })

    // Broadcast position update via Pusher for real-time tracking
    const payload: PositionUpdatePayload = {
      vehicleId: vehicle.id,
      plateNumber: vehicle.plateNumber,
      nickname: vehicle.nickname,
      type: vehicle.type,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      timestamp: position.timestamp.toISOString(),
      routes: vehicle.routes.map((vr) => vr.route),
    }

    // Fire and forget - don't wait for Pusher response
    pusherServer.trigger(CHANNELS.VEHICLES_LIVE, EVENTS.POSITION_UPDATE, payload).catch((err) => {
      console.error("Pusher broadcast error:", err)
    })

    // Check for approaching stages and notify passengers
    checkApproachingStages(vehicle, latitude, longitude, speed)

    return NextResponse.json({ position }, { status: 201 })
  } catch (error) {
    console.error("Error updating position:", error)
    return NextResponse.json({ error: "Failed to update position" }, { status: 500 })
  }
}

// Check if vehicle is approaching any stages with waiting passengers
async function checkApproachingStages(
  vehicle: {
    id: string
    plateNumber: string
    nickname: string | null
    routes: Array<{
      route: {
        id: string
        name: string
        color: string
        stages: Array<{ id: string; name: string; latitude: number; longitude: number }>
      }
    }>
  },
  vehicleLat: number,
  vehicleLng: number,
  speed: number
) {
  try {
    for (const vr of vehicle.routes) {
      const route = vr.route

      for (const stage of route.stages) {
        const distance = calculateDistance(
          vehicleLat,
          vehicleLng,
          stage.latitude,
          stage.longitude
        )

        // Check if within approach threshold
        if (distance <= APPROACH_THRESHOLD) {
          // Check if there are waiting passengers at this stage
          const now = new Date()
          const waitingPassengers = await prisma.passengerPresence.findMany({
            where: {
              stageId: stage.id,
              expiresAt: { gt: now },
            },
            select: { userId: true },
          })

          if (waitingPassengers.length > 0) {
            // Dedup check — don't re-notify if we already did within 5 min
            const dedupKey = `${vehicle.id}-${stage.id}`
            const lastNotified = notificationDedup.get(dedupKey)
            if (lastNotified && Date.now() - lastNotified < DEDUP_TTL) {
              continue
            }
            notificationDedup.set(dedupKey, Date.now())

            // Calculate ETA
            const etaMinutes = speed > 0
              ? Math.ceil((distance / 1000) / speed * 60)
              : Math.ceil(distance / 83) // Walking speed estimate

            const approachPayload: VehicleApproachingPayload = {
              vehicleId: vehicle.id,
              plateNumber: vehicle.plateNumber,
              nickname: vehicle.nickname,
              stageId: stage.id,
              stageName: stage.name,
              routeId: route.id,
              routeName: route.name,
              routeColor: route.color,
              distanceMeters: distance,
              etaMinutes,
              speed,
            }

            // Notify on route channel (passengers watching this route)
            pusherServer
              .trigger(getRouteChannel(route.id), EVENTS.VEHICLE_APPROACHING, approachPayload)
              .catch((err) => console.error("Route notification error:", err))

            // Notify on stage channel (passengers at this specific stage)
            pusherServer
              .trigger(getStageChannel(stage.id), EVENTS.VEHICLE_APPROACHING, approachPayload)
              .catch((err) => console.error("Stage notification error:", err))

            // Create persistent in-app notifications + push for each waiting passenger
            const uniqueUserIds = [...new Set(waitingPassengers.map((p) => p.userId))]
            for (const passengerId of uniqueUserIds) {
              createNotification({
                userId: passengerId,
                type: "VEHICLE_APPROACHING",
                title: "🚐 Vehicle Approaching!",
                message: `${vehicle.plateNumber} is ${etaMinutes} min from ${stage.name} on ${route.name}`,
                data: {
                  url: "/dashboard/passenger/map",
                  vehicleId: vehicle.id,
                  routeId: route.id,
                  stageId: stage.id,
                },
                sendPush: true,
              }).catch((err) => console.error("Notification create error:", err))
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking approaching stages:", error)
  }
}
