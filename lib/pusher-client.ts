"use client"

import PusherClient from "pusher-js"

// Singleton Pusher client for browser
let pusherClient: PusherClient | null = null

export function getPusherClient(): PusherClient {
    if (!pusherClient) {
        pusherClient = new PusherClient(
            process.env.NEXT_PUBLIC_PUSHER_KEY!,
            {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
                // Reconnect automatically if disconnected
                enabledTransports: ["ws", "wss"],
            }
        )
    }
    return pusherClient
}

// Connection state helper
export function usePusherConnectionState(): "connected" | "connecting" | "disconnected" {
    const client = getPusherClient()
    const state = client.connection.state

    if (state === "connected") return "connected"
    if (state === "connecting" || state === "initialized") return "connecting"
    return "disconnected"
}
