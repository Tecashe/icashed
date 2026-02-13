import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// PATCH /api/notifications/[id] — Mark a notification as read
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const notification = await prisma.notification.updateMany({
            where: { id, userId: user.id },
            data: { isRead: true },
        })

        if (notification.count === 0) {
            return NextResponse.json(
                { error: "Notification not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Mark notification read error:", error)
        return NextResponse.json(
            { error: "Failed to update notification" },
            { status: 500 }
        )
    }
}

// DELETE /api/notifications/[id] — Delete a notification
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const deleted = await prisma.notification.deleteMany({
            where: { id, userId: user.id },
        })

        if (deleted.count === 0) {
            return NextResponse.json(
                { error: "Notification not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Delete notification error:", error)
        return NextResponse.json(
            { error: "Failed to delete notification" },
            { status: 500 }
        )
    }
}
