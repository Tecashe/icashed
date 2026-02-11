"use client"

import { useMemo } from "react"
import {
    calculateRouteProgress,
    estimateAverageSpeed,
    isRushHour,
    type VehicleProgress,
    type RouteStage,
    type GeoPoint,
} from "@/lib/geo-utils"

// ============================================================================
// TYPES
// ============================================================================

export interface RouteWithStages {
    id: string
    name: string
    color: string
    stages: RouteStage[]
}

export interface VehicleProgressResult extends VehicleProgress {
    routeId: string
    routeName: string
    routeColor: string
    formattedETA: string
    formattedDistance: string
    stagesRemaining: number
    totalStages: number
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Calculate vehicle progress along its assigned routes
 * Returns detailed progress information including ETA and stage tracking
 */
export function useVehicleProgress(
    position: GeoPoint | null,
    routes: RouteWithStages[],
    vehicleType: string = "MATATU"
): VehicleProgressResult | null {
    return useMemo(() => {
        if (!position || routes.length === 0) return null

        // Estimate average speed based on vehicle type and traffic conditions
        const avgSpeed = estimateAverageSpeed(vehicleType, isRushHour())

        // Try to find the best matching route based on vehicle position
        let bestResult: VehicleProgressResult | null = null
        let bestScore = Infinity

        for (const route of routes) {
            if (route.stages.length < 2) continue

            const progress = calculateRouteProgress(position, route.stages, avgSpeed)
            if (!progress) continue


            const score = progress.deviationDistance

            if (score < bestScore) {
                bestScore = score
                bestResult = {
                    ...progress,
                    routeId: route.id,
                    routeName: route.name,
                    routeColor: route.color,
                    formattedETA: formatMinutes(progress.etaToTerminus),
                    formattedDistance: formatKm(progress.totalDistance - progress.distanceTraveled),
                    stagesRemaining: route.stages.length - progress.currentStageIndex - 1,
                    totalStages: route.stages.length,
                }
            }
        }

        return bestResult
    }, [position, routes, vehicleType])
}

/**
 * Calculate progress for multiple vehicles at once
 * Useful for the passenger view showing all active vehicles
 */
export function useMultiVehicleProgress(
    vehicles: Array<{
        id: string
        position: GeoPoint
        type: string
        routes: RouteWithStages[]
    }>
): Map<string, VehicleProgressResult> {
    return useMemo(() => {
        const results = new Map<string, VehicleProgressResult>()
        const rushHour = isRushHour()

        for (const vehicle of vehicles) {
            if (vehicle.routes.length === 0) continue

            const avgSpeed = estimateAverageSpeed(vehicle.type, rushHour)
            let bestProgress: VehicleProgressResult | null = null
            let bestScore = Infinity

            for (const route of vehicle.routes) {
                if (route.stages.length < 2) continue

                const progress = calculateRouteProgress(vehicle.position, route.stages, avgSpeed)
                if (!progress) continue

                const score = progress.deviationDistance

                if (score < bestScore) {
                    bestScore = score
                    bestProgress = {
                        ...progress,
                        routeId: route.id,
                        routeName: route.name,
                        routeColor: route.color,
                        formattedETA: formatMinutes(progress.etaToTerminus),
                        formattedDistance: formatKm(progress.totalDistance - progress.distanceTraveled),
                        stagesRemaining: route.stages.length - progress.currentStageIndex - 1,
                        totalStages: route.stages.length,
                    }
                }
            }

            if (bestProgress) {
                results.set(vehicle.id, bestProgress)
            }
        }

        return results
    }, [vehicles])
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

function formatMinutes(minutes: number): string {
    if (minutes < 1) return "< 1 min"
    if (minutes < 60) return `${Math.round(minutes)} min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatKm(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`
    return `${km.toFixed(1)} km`
}
