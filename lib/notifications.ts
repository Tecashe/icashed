import { prisma } from "@/lib/db"
import { NotificationType } from "@prisma/client"
import { sendPushNotification, type PushNotificationPayload } from "@/lib/web-push"
import { pusherServer } from "@/lib/pusher"

// ============================================================================
// Server-side notification helper — called from API routes
// ============================================================================

interface CreateNotificationParams {
    userId: string
    type: NotificationType
    title: string
    message: string
    data?: {
        url?: string
        vehicleId?: string
        routeId?: string
        stageId?: string
    }
    /** Also send a browser push notification (requires VAPID keys) */
    sendPush?: boolean
}

/**
 * Create an in-app notification and optionally send a push notification.
 * This is the single entry point for creating notifications from any API route.
 */
export async function createNotification({
    userId,
    type,
    title,
    message,
    data,
    sendPush = false,
}: CreateNotificationParams) {
    try {
        // 1. Persist to database
        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                data: data ?? undefined,
            },
        })

        // 2. Send real-time event via Pusher so the bell updates instantly
        pusherServer
            .trigger(`user-${userId}`, "new-notification", {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                isRead: false,
                createdAt: notification.createdAt.toISOString(),
            })
            .catch((err) => console.error("Pusher notification error:", err))

        // 3. Optionally send browser push notification
        if (sendPush) {
            const subscriptions = await prisma.pushSubscription.findMany({
                where: { userId },
            })

            const pushPayload: PushNotificationPayload = {
                title,
                body: message,
                icon: "/icons/icon-192x192.png",
                tag: `${type.toLowerCase()}-${notification.id}`,
                data: {
                    url: data?.url || "/dashboard",
                    vehicleId: data?.vehicleId,
                    routeId: data?.routeId,
                    stageId: data?.stageId,
                },
            }

            // Send to all user's subscriptions (phone, desktop, etc.)
            const pushPromises = subscriptions.map((sub) =>
                sendPushNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    pushPayload
                ).catch(() => {
                    // Remove expired subscriptions (410 Gone handled inside sendPushNotification)
                    return false
                })
            )

            await Promise.allSettled(pushPromises)
        }

        return notification
    } catch (error) {
        console.error("createNotification error:", error)
        return null
    }
}

/**
 * Create notifications for multiple users at once (e.g., all waiting passengers).
 */
export async function createBulkNotifications(
    params: Omit<CreateNotificationParams, "userId"> & { userIds: string[] }
) {
    const { userIds, ...rest } = params
    const results = await Promise.allSettled(
        userIds.map((userId) => createNotification({ ...rest, userId }))
    )
    return results.filter((r) => r.status === "fulfilled").length
}
