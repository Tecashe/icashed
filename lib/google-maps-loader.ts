"use client"

import { setOptions, importLibrary } from "@googlemaps/js-api-loader"

let googleMapsInitialized = false
let googleMapsLoaderPromise: Promise<typeof google> | null = null

/**
 * Initialize Google Maps API options
 * Must be called before loading any libraries
 */
function initGoogleMapsOptions(): void {
    if (googleMapsInitialized) {
        return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
        console.warn(
            "Google Maps API key not found. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file."
        )
    }

    setOptions({
        key: apiKey || "",
        v: "weekly",
    })

    googleMapsInitialized = true
}

/**
 * Load Google Maps API and return the google object
 * Caches the promise to prevent multiple loads
 */
export async function loadGoogleMaps(): Promise<typeof google> {
    if (googleMapsLoaderPromise) {
        return googleMapsLoaderPromise
    }

    initGoogleMapsOptions()

    // Import all required libraries using the new functional API
    googleMapsLoaderPromise = Promise.all([
        importLibrary("maps"),
        importLibrary("places"),
        importLibrary("geometry"),
        importLibrary("marker"),
    ]).then(() => google)

    return googleMapsLoaderPromise
}

/**
 * Check if Google Maps is already loaded
 */
export function isGoogleMapsLoaded(): boolean {
    return typeof google !== "undefined" && typeof google.maps !== "undefined"
}
