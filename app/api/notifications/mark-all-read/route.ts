import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// PATCH /api/notifications/mark-all-read — Mark all notifications as read
export async function PATCH() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const result = await prisma.notification.updateMany({
            where: { userId: user.id, isRead: false },
            data: { isRead: true },
        })

        return NextResponse.json({
            success: true,
            updated: result.count,
        })
    } catch (error) {
        console.error("Mark all read error:", error)
        return NextResponse.json(
            { error: "Failed to mark notifications as read" },
            { status: 500 }
        )
    }
}
