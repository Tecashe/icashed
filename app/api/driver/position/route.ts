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

// Approach threshold in meters
const APPROACH_THRESHOLD = 500

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
          const waitingPassengers = await prisma.passengerPresence.count({
            where: {
              stageId: stage.id,
              expiresAt: { gt: now },
            },
          })

          if (waitingPassengers > 0) {
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
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking approaching stages:", error)
  }
}
