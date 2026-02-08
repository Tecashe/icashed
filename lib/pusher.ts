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
    // Route-specific channels for targeted notifications
    ROUTE_PREFIX: "route-", // e.g., "route-abc123"
    // Stage-specific for waiting counts
    STAGE_PREFIX: "stage-", // e.g., "stage-xyz789"
} as const

// Get dynamic channel name
export function getRouteChannel(routeId: string): string {
    return `${CHANNELS.ROUTE_PREFIX}${routeId}`
}

export function getStageChannel(stageId: string): string {
    return `${CHANNELS.STAGE_PREFIX}${stageId}`
}

// Event types
export const EVENTS = {
    // Vehicle events
    POSITION_UPDATE: "position-update",
    VEHICLE_ONLINE: "vehicle-online",
    VEHICLE_OFFLINE: "vehicle-offline",
    // Passenger notification events
    VEHICLE_APPROACHING: "vehicle-approaching",
    PASSENGER_WAITING: "passenger-waiting",
    WAITING_COUNT_UPDATE: "waiting-count-update",
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
    accuracy?: number
    timestamp: string
    routes: { id: string; name: string; color: string }[]
}

// Vehicle approaching stage payload
export interface VehicleApproachingPayload {
    vehicleId: string
    plateNumber: string
    nickname: string | null
    stageId: string
    stageName: string
    routeId: string
    routeName: string
    routeColor: string
    distanceMeters: number
    etaMinutes: number
    speed: number
}

// Passenger waiting payload (for drivers)
export interface PassengerWaitingPayload {
    stageId: string
    stageName: string
    routeId: string
    waitingCount: number
    oldestWaitingMinutes: number
}

// Waiting count update payload
export interface WaitingCountPayload {
    stageId: string
    stageName: string
    waitingCount: number
    timestamp: string
}
