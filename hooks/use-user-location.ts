"use client"

import { useState, useEffect, useCallback } from "react"

interface UserLocation {
    latitude: number
    longitude: number
    accuracy: number
    heading: number | null
    timestamp: number
}

interface UseUserLocationOptions {
    enableHighAccuracy?: boolean
    timeout?: number
    maximumAge?: number
    watch?: boolean
}

interface UseUserLocationResult {
    location: UserLocation | null
    error: string | null
    isLoading: boolean
    isSupported: boolean
    requestLocation: () => void
}

/**
 * Hook for getting and watching user's GPS location
 */
export function useUserLocation(
    options: UseUserLocationOptions = {}
): UseUserLocationResult {
    const {
        enableHighAccuracy = true,
        timeout = 10000,
        maximumAge = 5000,
        watch = false,
    } = options

    const [location, setLocation] = useState<UserLocation | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const isSupported = typeof navigator !== "undefined" && "geolocation" in navigator

    const handleSuccess = useCallback((position: GeolocationPosition) => {
        setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            timestamp: position.timestamp,
        })
        setError(null)
        setIsLoading(false)
    }, [])

    const handleError = useCallback((err: GeolocationPositionError) => {
        let errorMessage: string
        switch (err.code) {
            case err.PERMISSION_DENIED:
                errorMessage = "Location permission denied. Please enable location access."
                break
            case err.POSITION_UNAVAILABLE:
                errorMessage = "Location unavailable. Please try again."
                break
            case err.TIMEOUT:
                errorMessage = "Location request timed out."
                break
            default:
                errorMessage = "Failed to get location."
        }
        setError(errorMessage)
        setIsLoading(false)
    }, [])

    const requestLocation = useCallback(() => {
        if (!isSupported) {
            setError("Geolocation is not supported by this browser.")
            return
        }

        setIsLoading(true)
        setError(null)

        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
            enableHighAccuracy,
            timeout,
            maximumAge,
        })
    }, [isSupported, handleSuccess, handleError, enableHighAccuracy, timeout, maximumAge])

    // Watch position for continuous updates
    useEffect(() => {
        if (!watch || !isSupported) return

        const watchId = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            { enableHighAccuracy, timeout, maximumAge }
        )

        return () => {
            navigator.geolocation.clearWatch(watchId)
        }
    }, [watch, isSupported, handleSuccess, handleError, enableHighAccuracy, timeout, maximumAge])

    return {
        location,
        error,
        isLoading,
        isSupported,
        requestLocation,
    }
}
