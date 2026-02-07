import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { sendPushNotification, type PushNotificationPayload } from "@/lib/web-push"

/**
 * POST /api/driver/stage-departure
 * Notify waiting passengers when a vehicle departs a stage
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "OPERATOR") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { vehicleId, stageId, etaMinutes, action } = body

        if (!vehicleId || !stageId) {
            return NextResponse.json(
                { error: "vehicleId and stageId required" },
                { status: 400 }
            )
        }

        // Get vehicle info
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            include: {
                routes: {
                    include: {
                        route: true,
                    },
                },
            },
        })

        if (!vehicle) {
            return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
        }

        // Get stage info
        const stage = await prisma.stage.findUnique({
            where: { id: stageId },
            include: {
                route: true,
            },
        })

        if (!stage) {
            return NextResponse.json({ error: "Stage not found" }, { status: 404 })
        }

        // Find passengers waiting at upcoming stages on this route
        const waitingPassengers = await prisma.passengerPresence.findMany({
            where: {
                routeId: stage.routeId,
                expiresAt: { gt: new Date() },
            },
            include: {
                user: {
                    include: {
                        pushSubscriptions: true,
                    },
                },
                stage: true,
            },
        })

        // Prepare notification based on action type
        let notificationsSent = 0

        for (const presence of waitingPassengers) {
            for (const subscription of presence.user.pushSubscriptions) {
                let payload: PushNotificationPayload

                if (action === "departed") {
                    // Vehicle has departed from a stage
                    payload = {
                        title: "🚐 Vehicle Departed!",
                        body: `${vehicle.plateNumber} has left ${stage.name} on ${stage.route.name}`,
                        icon: "/icons/icon-192x192.png",
                        tag: `departure-${vehicleId}`,
                        data: {
                            url: "/dashboard/passenger/map",
                            vehicleId,
                            stageId,
                        },
                    }
                } else if (action === "approaching" && etaMinutes) {
                    // Vehicle is approaching (5 min away, etc.)
                    payload = {
                        title: "🚐 Vehicle Approaching!",
                        body: `${vehicle.plateNumber} is ${etaMinutes} min from ${presence.stage.name}`,
                        icon: "/icons/icon-192x192.png",
                        tag: `eta-${vehicleId}`,
                        data: {
                            url: "/dashboard/passenger/map",
                            vehicleId,
                            stageId: presence.stageId,
                        },
                    }
                } else if (action === "arriving") {
                    // Vehicle is about to arrive (1 min or less)
                    payload = {
                        title: "🎉 Almost There!",
                        body: `${vehicle.plateNumber} is arriving at ${presence.stage.name} NOW!`,
                        icon: "/icons/icon-192x192.png",
                        tag: `arriving-${vehicleId}`,
                        data: {
                            url: "/dashboard/passenger/map",
                            vehicleId,
                            stageId: presence.stageId,
                        },
                    }
                } else {
                    continue
                }

                const sent = await sendPushNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh,
                            auth: subscription.auth,
                        },
                    },
                    payload
                )

                if (sent) notificationsSent++
            }
        }

        return NextResponse.json({
            success: true,
            notificationsSent,
            waitingPassengers: waitingPassengers.length,
        })
    } catch (error) {
        console.error("Stage departure notification error:", error)
        return NextResponse.json(
            { error: "Failed to send notifications" },
            { status: 500 }
        )
    }
}
