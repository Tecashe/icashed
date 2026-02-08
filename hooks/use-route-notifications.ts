"use client"

import { useState, useEffect, useCallback } from "react"
import { getPusherClient } from "@/lib/pusher-client"
import {
    EVENTS,
    getRouteChannel,
    getStageChannel,
    type VehicleApproachingPayload,
    type WaitingCountPayload,
} from "@/lib/pusher"

interface UseRouteNotificationsOptions {
    routeId?: string | null
    stageId?: string | null
    onVehicleApproaching?: (payload: VehicleApproachingPayload) => void
    onWaitingCountUpdate?: (payload: WaitingCountPayload) => void
}

interface RouteNotificationState {
    approaching: VehicleApproachingPayload[]
    waitingCounts: Map<string, number>
    isConnected: boolean
}

/**
 * Hook for subscribing to route/stage specific notifications
 * - Passengers: Get notified when vehicles approach their stage
 * - Drivers: Get notified about passenger waiting counts
 */
export function useRouteNotifications({
    routeId,
    stageId,
    onVehicleApproaching,
    onWaitingCountUpdate,
}: UseRouteNotificationsOptions = {}) {
    const [approaching, setApproaching] = useState<VehicleApproachingPayload[]>([])
    const [waitingCounts, setWaitingCounts] = useState<Map<string, number>>(new Map())
    const [isConnected, setIsConnected] = useState(false)

    // Handle vehicle approaching event
    const handleVehicleApproaching = useCallback(
        (payload: VehicleApproachingPayload) => {
            setApproaching((prev) => {
                // Update or add the approaching vehicle
                const existing = prev.findIndex((v) => v.vehicleId === payload.vehicleId)
                if (existing >= 0) {
                    const updated = [...prev]
                    updated[existing] = payload
                    return updated
                }
                return [...prev, payload]
            })
            onVehicleApproaching?.(payload)
        },
        [onVehicleApproaching]
    )

    // Handle waiting count update
    const handleWaitingCount = useCallback(
        (payload: WaitingCountPayload) => {
            setWaitingCounts((prev) => {
                const updated = new Map(prev)
                updated.set(payload.stageId, payload.waitingCount)
                return updated
            })
            onWaitingCountUpdate?.(payload)
        },
        [onWaitingCountUpdate]
    )

    // Clean up stale approaching vehicles (older than 5 minutes)
    useEffect(() => {
        const interval = setInterval(() => {
            setApproaching((prev) =>
                prev.filter((v) => v.etaMinutes <= 15) // Keep only vehicles within 15 min ETA
            )
        }, 30000)

        return () => clearInterval(interval)
    }, [])

    // Subscribe to route channel
    useEffect(() => {
        if (!routeId) return

        const pusher = getPusherClient()
        const channelName = getRouteChannel(routeId)
        const channel = pusher.subscribe(channelName)

        channel.bind("pusher:subscription_succeeded", () => {
            setIsConnected(true)
        })

        channel.bind(EVENTS.VEHICLE_APPROACHING, handleVehicleApproaching)

        return () => {
            channel.unbind_all()
            pusher.unsubscribe(channelName)
        }
    }, [routeId, handleVehicleApproaching])

    // Subscribe to stage channel
    useEffect(() => {
        if (!stageId) return

        const pusher = getPusherClient()
        const channelName = getStageChannel(stageId)
        const channel = pusher.subscribe(channelName)

        channel.bind(EVENTS.WAITING_COUNT_UPDATE, handleWaitingCount)
        channel.bind(EVENTS.VEHICLE_APPROACHING, handleVehicleApproaching)

        return () => {
            channel.unbind_all()
            pusher.unsubscribe(channelName)
        }
    }, [stageId, handleVehicleApproaching, handleWaitingCount])

    // Clear approaching vehicles when they arrive (<50m distance)
    useEffect(() => {
        setApproaching((prev) => prev.filter((v) => v.distanceMeters > 50))
    }, [approaching])

    return {
        approaching,
        waitingCounts,
        isConnected,
        nearestApproaching: approaching.length > 0
            ? approaching.reduce((a, b) => (a.etaMinutes < b.etaMinutes ? a : b))
            : null,
    }
}
