"use client"

import { useEffect } from "react"

export function RegisterSW() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

        // Register service worker after page load for best performance
        window.addEventListener("load", async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js", {
                    scope: "/",
                })
                console.log("[PWA] Service worker registered:", registration.scope)

                // Check for updates every 60 minutes
                setInterval(() => {
                    registration.update()
                }, 60 * 60 * 1000)
            } catch (error) {
                console.error("[PWA] Service worker registration failed:", error)
            }
        })
    }, [])

    return null
}
