import webPush from "web-push"

// VAPID keys for Web Push
// Generate with: npx web-push generate-vapid-keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || ""
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ""
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contact@radaa.app"

if (vapidPublicKey && vapidPrivateKey) {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export interface PushNotificationPayload {
    title: string
    body: string
    icon?: string
    tag?: string
    data?: {
        url?: string
        vehicleId?: string
        routeId?: string
        stageId?: string
    }
}

/**
 * Send a push notification to a subscription
 */
export async function sendPushNotification(
    subscription: {
        endpoint: string
        keys: {
            p256dh: string
            auth: string
        }
    },
    payload: PushNotificationPayload
): Promise<boolean> {
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn("VAPID keys not configured. Push notifications disabled.")
        return false
    }

    try {
        await webPush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
            },
            JSON.stringify(payload),
            {
                TTL: 60, // Time to live in seconds
                urgency: "high",
            }
        )
        return true
    } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string }
        console.error("Push notification failed:", err.message)

        // If subscription is invalid (410 Gone), it should be removed
        if (err.statusCode === 410) {
            console.log("Subscription expired. Should be removed from database.")
            return false
        }

        return false
    }
}

/**
 * Send vehicle approaching notification
 */
export async function sendVehicleApproachingNotification(
    subscription: {
        endpoint: string
        keys: { p256dh: string; auth: string }
    },
    vehicleInfo: {
        plateNumber: string
        routeName: string
        stageName: string
        etaMinutes: number
    }
): Promise<boolean> {
    const payload: PushNotificationPayload = {
        title: "🚐 Vehicle Approaching!",
        body: `${vehicleInfo.plateNumber} on ${vehicleInfo.routeName} is ${vehicleInfo.etaMinutes} min from ${vehicleInfo.stageName}`,
        icon: "/icons/icon-192x192.png",
        tag: `vehicle-${vehicleInfo.plateNumber}`,
        data: {
            url: "/dashboard/passenger",
        },
    }

    return sendPushNotification(subscription, payload)
}

/**
 * Get the public VAPID key for client-side subscription
 */
export function getVapidPublicKey(): string {
    return vapidPublicKey
}

export { webPush }
