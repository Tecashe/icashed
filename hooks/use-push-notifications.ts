"use client"

import { useState, useEffect, useCallback } from "react"

interface PushNotificationState {
    isSupported: boolean
    isSubscribed: boolean
    isLoading: boolean
    permission: NotificationPermission | "default"
    error: string | null
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const buffer = new ArrayBuffer(rawData.length)
    const outputArray = new Uint8Array(buffer)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export function usePushNotifications() {
    const [state, setState] = useState<PushNotificationState>({
        isSupported: false,
        isSubscribed: false,
        isLoading: true,
        permission: "default",
        error: null,
    })

    // Check if push notifications are supported
    useEffect(() => {
        const checkSupport = async () => {
            const isSupported =
                "serviceWorker" in navigator &&
                "PushManager" in window &&
                "Notification" in window

            if (!isSupported) {
                setState((prev) => ({
                    ...prev,
                    isSupported: false,
                    isLoading: false,
                    error: "Push notifications are not supported in this browser",
                }))
                return
            }

            // Check current permission
            const permission = Notification.permission

            // Check if already subscribed
            try {
                const registration = await navigator.serviceWorker.ready
                const subscription = await registration.pushManager.getSubscription()

                setState({
                    isSupported: true,
                    isSubscribed: !!subscription,
                    isLoading: false,
                    permission,
                    error: null,
                })
            } catch {
                setState({
                    isSupported: true,
                    isSubscribed: false,
                    isLoading: false,
                    permission,
                    error: null,
                })
            }
        }

        checkSupport()
    }, [])

    // Register service worker
    const registerServiceWorker = useCallback(async () => {
        if (!("serviceWorker" in navigator)) {
            throw new Error("Service Workers not supported")
        }

        const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
        })

        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready
        return registration
    }, [])

    // Subscribe to push notifications
    const subscribe = useCallback(async () => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }))

        try {
            // Request notification permission
            const permission = await Notification.requestPermission()

            if (permission !== "granted") {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    permission,
                    error: "Notification permission denied",
                }))
                return false
            }

            // Register service worker
            const registration = await registerServiceWorker()

            // Get VAPID public key from server
            const vapidResponse = await fetch("/api/notifications/vapid-key")
            if (!vapidResponse.ok) {
                throw new Error("Failed to get VAPID key")
            }
            const { publicKey } = await vapidResponse.json()

            if (!publicKey) {
                throw new Error("VAPID public key not configured")
            }

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey),
            })

            // Send subscription to server
            const response = await fetch("/api/notifications/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription.toJSON()),
            })

            if (!response.ok) {
                throw new Error("Failed to save subscription")
            }

            setState({
                isSupported: true,
                isSubscribed: true,
                isLoading: false,
                permission: "granted",
                error: null,
            })

            return true
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error"
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: message,
            }))
            return false
        }
    }, [registerServiceWorker])

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async () => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }))

        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                // Unsubscribe from browser
                await subscription.unsubscribe()

                // Remove from server
                await fetch("/api/notifications/subscribe", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                })
            }

            setState((prev) => ({
                ...prev,
                isSubscribed: false,
                isLoading: false,
                error: null,
            }))

            return true
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error"
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: message,
            }))
            return false
        }
    }, [])

    // Toggle subscription
    const toggle = useCallback(async () => {
        if (state.isSubscribed) {
            return unsubscribe()
        } else {
            return subscribe()
        }
    }, [state.isSubscribed, subscribe, unsubscribe])

    return {
        ...state,
        subscribe,
        unsubscribe,
        toggle,
    }
}
