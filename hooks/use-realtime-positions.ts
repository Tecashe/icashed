"use client"

import { useState, useEffect, useCallback } from "react"
import { getPusherClient } from "@/lib/pusher-client"
import { CHANNELS, EVENTS, type PositionUpdatePayload } from "@/lib/pusher"
import { useLivePositions, type LivePosition } from "@/hooks/use-data"

interface RealtimeState {
    positions: LivePosition[]
    isRealtime: boolean
    connectionState: "connected" | "connecting" | "disconnected"
}

/**
 * Real-time vehicle positions hook using Pusher WebSocket
 * Falls back to SWR polling if WebSocket fails
 */
export function useRealtimePositions(): RealtimeState {
    const [positions, setPositions] = useState<LivePosition[]>([])
    const [connectionState, setConnectionState] = useState<"connected" | "connecting" | "disconnected">("connecting")

    // Fallback to polling data
    const { data: pollingData } = useLivePositions()

    // Update positions from real-time or fallback
    const updatePosition = useCallback((payload: PositionUpdatePayload) => {
        setPositions((prev) => {
            const existingIndex = prev.findIndex((p) => p.vehicleId === payload.vehicleId)
            const newPosition: LivePosition = {
                vehicleId: payload.vehicleId,
                plateNumber: payload.plateNumber,
                nickname: payload.nickname,
                type: payload.type,
                isPremium: false,
                position: {
                    id: `rt-${payload.vehicleId}-${Date.now()}`,
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    speed: payload.speed,
                    heading: payload.heading,
                    timestamp: payload.timestamp,
                },
                routes: payload.routes,
            }

            if (existingIndex >= 0) {
                const updated = [...prev]
                updated[existingIndex] = newPosition
                return updated
            }
            return [...prev, newPosition]
        })
    }, [])

    useEffect(() => {
        const pusher = getPusherClient()

        // Track connection state
        const handleConnected = () => setConnectionState("connected")
        const handleConnecting = () => setConnectionState("connecting")
        const handleDisconnected = () => setConnectionState("disconnected")

        pusher.connection.bind("connected", handleConnected)
        pusher.connection.bind("connecting", handleConnecting)
        pusher.connection.bind("disconnected", handleDisconnected)
        pusher.connection.bind("failed", handleDisconnected)

        // Set initial state
        if (pusher.connection.state === "connected") {
            setConnectionState("connected")
        }

        // Subscribe to live channel
        const channel = pusher.subscribe(CHANNELS.VEHICLES_LIVE)

        channel.bind(EVENTS.POSITION_UPDATE, (data: PositionUpdatePayload) => {
            updatePosition(data)
        })

        return () => {
            channel.unbind_all()
            pusher.unsubscribe(CHANNELS.VEHICLES_LIVE)
            pusher.connection.unbind("connected", handleConnected)
            pusher.connection.unbind("connecting", handleConnecting)
            pusher.connection.unbind("disconnected", handleDisconnected)
            pusher.connection.unbind("failed", handleDisconnected)
        }
    }, [updatePosition])

    // Sync with polling data when first loaded or WebSocket disconnected
    useEffect(() => {
        if (pollingData?.positions && (positions.length === 0 || connectionState === "disconnected")) {
            setPositions(pollingData.positions)
        }
    }, [pollingData, positions.length, connectionState])

    return {
        positions,
        isRealtime: connectionState === "connected",
        connectionState,
    }
}
