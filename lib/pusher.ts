import Pusher from "pusher"

// Server-side Pusher client for broadcasting events
const pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
})

export { pusherServer }

// Channel names
export const CHANNELS = {
    VEHICLES_LIVE: "vehicles-live",
} as const

// Event types
export const EVENTS = {
    POSITION_UPDATE: "position-update",
    VEHICLE_ONLINE: "vehicle-online",
    VEHICLE_OFFLINE: "vehicle-offline",
} as const

// Position update payload type
export interface PositionUpdatePayload {
    vehicleId: string
    plateNumber: string
    nickname: string | null
    type: string
    latitude: number
    longitude: number
    speed: number
    heading: number
    timestamp: string
    routes: { id: string; name: string; color: string }[]
}
