import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET - Get current presence status
export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get active presence (not expired)
        const presence = await prisma.passengerPresence.findFirst({
            where: {
                userId: user.id,
                expiresAt: { gt: new Date() },
            },
            include: {
                stage: true,
                route: {
                    select: { id: true, name: true, code: true, color: true },
                },
            },
        })

        return NextResponse.json({ presence })
    } catch (error) {
        console.error("Get presence error:", error)
        return NextResponse.json(
            { error: "Failed to get presence" },
            { status: 500 }
        )
    }
}

// POST - Check in at a stage
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { stageId, durationMinutes = 30 } = body

        if (!stageId) {
            return NextResponse.json(
                { error: "Stage ID required" },
                { status: 400 }
            )
        }

        // Get the stage and its route
        const stage = await prisma.stage.findUnique({
            where: { id: stageId },
            include: { route: true },
        })

        if (!stage) {
            return NextResponse.json(
                { error: "Stage not found" },
                { status: 404 }
            )
        }

        // Delete any existing presence for this user
        await prisma.passengerPresence.deleteMany({
            where: { userId: user.id },
        })

        // Create new presence
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000)

        const presence = await prisma.passengerPresence.create({
            data: {
                userId: user.id,
                stageId: stage.id,
                routeId: stage.routeId,
                expiresAt,
            },
            include: {
                stage: true,
                route: {
                    select: { id: true, name: true, code: true, color: true },
                },
            },
        })

        return NextResponse.json({ presence })
    } catch (error) {
        console.error("Check-in error:", error)
        return NextResponse.json(
            { error: "Failed to check in" },
            { status: 500 }
        )
    }
}

// DELETE - Check out from stage
export async function DELETE() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        await prisma.passengerPresence.deleteMany({
            where: { userId: user.id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Check-out error:", error)
        return NextResponse.json(
            { error: "Failed to check out" },
            { status: 500 }
        )
    }
}
