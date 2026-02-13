import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/notifications — Fetch current user's notifications
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const unreadOnly = searchParams.get("unreadOnly") === "true"
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
        const cursor = searchParams.get("cursor") // For pagination

        const where: Record<string, unknown> = { userId: user.id }
        if (unreadOnly) {
            where.isRead = false
        }

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit + 1, // Fetch one extra to check if there are more
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        })

        const hasMore = notifications.length > limit
        const items = hasMore ? notifications.slice(0, limit) : notifications

        // Get unread count separately for badge
        const unreadCount = await prisma.notification.count({
            where: { userId: user.id, isRead: false },
        })

        return NextResponse.json({
            notifications: items,
            unreadCount,
            hasMore,
            nextCursor: hasMore ? items[items.length - 1]?.id : null,
        })
    } catch (error) {
        console.error("Fetch notifications error:", error)
        return NextResponse.json(
            { error: "Failed to fetch notifications" },
            { status: 500 }
        )
    }
}
