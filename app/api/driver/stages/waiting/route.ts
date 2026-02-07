import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET - Get stages with waiting passenger counts for driver's routes
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "OPERATOR") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const routeId = searchParams.get("routeId")

        // Get driver's vehicles and their routes
        const driverVehicles = await prisma.vehicle.findMany({
            where: { ownerId: user.id },
            include: {
                routes: {
                    include: {
                        route: true,
                    },
                },
            },
        })

        const routeIds = routeId
            ? [routeId]
            : driverVehicles.flatMap((v) => v.routes.map((vr) => vr.routeId))

        if (routeIds.length === 0) {
            return NextResponse.json({ stages: [] })
        }

        // Get stages on these routes with waiting passengers
        const stages = await prisma.stage.findMany({
            where: {
                routeId: { in: routeIds },
            },
            include: {
                route: {
                    select: { id: true, name: true, code: true, color: true },
                },
                waitingPassengers: {
                    where: { expiresAt: { gt: new Date() } },
                    select: {
                        id: true,
                        createdAt: true,
                        expiresAt: true,
                    },
                },
            },
            orderBy: [{ routeId: "asc" }, { order: "asc" }],
        })

        // Format response with waiting counts
        const result = stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            latitude: stage.latitude,
            longitude: stage.longitude,
            order: stage.order,
            isTerminal: stage.isTerminal,
            route: stage.route,
            waitingCount: stage.waitingPassengers.length,
            oldestWaiting: stage.waitingPassengers.length > 0
                ? Math.floor(
                    (Date.now() - new Date(stage.waitingPassengers[0].createdAt).getTime()) / 60000
                )
                : null,
        }))

        return NextResponse.json({ stages: result })
    } catch (error) {
        console.error("Waiting passengers error:", error)
        return NextResponse.json(
            { error: "Failed to get waiting passengers" },
            { status: 500 }
        )
    }
}
