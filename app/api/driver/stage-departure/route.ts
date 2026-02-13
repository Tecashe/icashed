import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"

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

        // Build notification details based on action type
        let notificationType: "VEHICLE_APPROACHING" | "VEHICLE_DEPARTED" | "VEHICLE_ARRIVING"
        let title: string
        let getMessage: (stageName: string) => string

        if (action === "departed") {
            notificationType = "VEHICLE_DEPARTED"
            title = "🚐 Vehicle Departed!"
            getMessage = (stageName: string) =>
                `${vehicle.plateNumber} has left ${stage.name} on ${stage.route.name}. Heading toward ${stageName}.`
        } else if (action === "approaching" && etaMinutes) {
            notificationType = "VEHICLE_APPROACHING"
            title = "🚐 Vehicle Approaching!"
            getMessage = (stageName: string) =>
                `${vehicle.plateNumber} is ${etaMinutes} min from ${stageName}`
        } else if (action === "arriving") {
            notificationType = "VEHICLE_ARRIVING"
            title = "🎉 Almost There!"
            getMessage = (stageName: string) =>
                `${vehicle.plateNumber} is arriving at ${stageName} NOW!`
        } else {
            return NextResponse.json({ success: true, notificationsSent: 0, waitingPassengers: waitingPassengers.length })
        }

        // Create notification for each unique waiting passenger
        const uniqueUserIds = [...new Set(waitingPassengers.map((p) => p.user.id))]
        let notificationsSent = 0

        for (const userId of uniqueUserIds) {
            const presence = waitingPassengers.find((p) => p.user.id === userId)
            const passengerStageName = presence?.stage.name || stage.name

            const result = await createNotification({
                userId,
                type: notificationType,
                title,
                message: getMessage(passengerStageName),
                data: {
                    url: "/dashboard/passenger/map",
                    vehicleId,
                    stageId: presence?.stageId || stageId,
                },
                sendPush: true,
            })

            if (result) notificationsSent++
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
