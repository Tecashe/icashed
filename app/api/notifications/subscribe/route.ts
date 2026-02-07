import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { endpoint, keys } = body

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json(
                { error: "Invalid subscription data" },
                { status: 400 }
            )
        }

        // Upsert the subscription (update if exists, create if not)
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            create: {
                userId: user.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
            update: {
                userId: user.id,
                p256dh: keys.p256dh,
                auth: keys.auth,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Subscribe error:", error)
        return NextResponse.json(
            { error: "Failed to save subscription" },
            { status: 500 }
        )
    }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { endpoint } = body

        if (!endpoint) {
            return NextResponse.json(
                { error: "Endpoint required" },
                { status: 400 }
            )
        }

        // Delete the subscription
        await prisma.pushSubscription.deleteMany({
            where: {
                userId: user.id,
                endpoint,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Unsubscribe error:", error)
        return NextResponse.json(
            { error: "Failed to remove subscription" },
            { status: 500 }
        )
    }
}
