"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getPusherClient } from "@/lib/pusher-client"

// ============================================================================
// Types
// ============================================================================

export interface AppNotification {
    id: string
    type: string
    title: string
    message: string
    data: {
        url?: string
        vehicleId?: string
        routeId?: string
        stageId?: string
    } | null
    isRead: boolean
    createdAt: string
}

interface UseNotificationsReturn {
    notifications: AppNotification[]
    unreadCount: number
    isLoading: boolean
    error: string | null
    hasMore: boolean
    /** Mark a single notification as read */
    markAsRead: (id: string) => Promise<void>
    /** Mark all notifications as read */
    markAllRead: () => Promise<void>
    /** Delete a notification */
    deleteNotification: (id: string) => Promise<void>
    /** Load more notifications (pagination) */
    loadMore: () => Promise<void>
    /** Force refresh from server */
    refresh: () => Promise<void>
}

// ============================================================================
// Hook
// ============================================================================

export function useNotifications(): UseNotificationsReturn {
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const isMounted = useRef(true)

    // Fetch notifications from API
    const fetchNotifications = useCallback(async (cursor?: string | null) => {
        try {
            const params = new URLSearchParams({ limit: "30" })
            if (cursor) params.set("cursor", cursor)

            const res = await fetch(`/api/notifications?${params}`)
            if (!res.ok) throw new Error("Failed to fetch notifications")

            const data = await res.json()
            if (!isMounted.current) return

            if (cursor) {
                // Appending for pagination
                setNotifications((prev) => [...prev, ...data.notifications])
            } else {
                // Fresh fetch
                setNotifications(data.notifications)
            }
            setUnreadCount(data.unreadCount)
            setHasMore(data.hasMore)
            setNextCursor(data.nextCursor)
            setError(null)
        } catch (err) {
            if (!isMounted.current) return
            setError(err instanceof Error ? err.message : "Unknown error")
        } finally {
            if (isMounted.current) setIsLoading(false)
        }
    }, [])

    // Initial fetch
    useEffect(() => {
        isMounted.current = true
        fetchNotifications()
        return () => {
            isMounted.current = false
        }
    }, [fetchNotifications])

    // Poll every 30 seconds for unread count
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/notifications?limit=1&unreadOnly=true")
                if (res.ok) {
                    const data = await res.json()
                    if (isMounted.current) {
                        setUnreadCount(data.unreadCount)
                    }
                }
            } catch {
                // Silently fail polling
            }
        }, 30_000)

        return () => clearInterval(interval)
    }, [])

    // Listen for real-time notifications via Pusher
    useEffect(() => {
        // We need to get the user ID to subscribe to their channel
        // We'll fetch it from the first notification or a dedicated endpoint
        // For now, we subscribe after the first fetch populates data
        let channelName: string | null = null

        const subscribeToUserChannel = async () => {
            try {
                const res = await fetch("/api/auth/me")
                if (!res.ok) return
                const user = await res.json()
                if (!user?.id) return

                const pusher = getPusherClient()
                channelName = `user-${user.id}`
                const channel = pusher.subscribe(channelName)

                channel.bind("new-notification", (notification: AppNotification) => {
                    if (!isMounted.current) return
                    setNotifications((prev) => [notification, ...prev])
                    setUnreadCount((prev) => prev + 1)
                })
            } catch {
                // Silently fail — real-time will fallback to polling
            }
        }

        subscribeToUserChannel()

        return () => {
            if (channelName) {
                const pusher = getPusherClient()
                pusher.unsubscribe(channelName)
            }
        }
    }, [])

    // Mark a single notification as read
    const markAsRead = useCallback(async (id: string) => {
        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))

        try {
            const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" })
            if (!res.ok) throw new Error("Failed to mark as read")
        } catch {
            // Revert on failure
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
            )
            setUnreadCount((prev) => prev + 1)
        }
    }, [])

    // Mark all as read
    const markAllRead = useCallback(async () => {
        const previousNotifications = notifications
        const previousCount = unreadCount

        // Optimistic update
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
        setUnreadCount(0)

        try {
            const res = await fetch("/api/notifications/mark-all-read", {
                method: "PATCH",
            })
            if (!res.ok) throw new Error("Failed to mark all as read")
        } catch {
            // Revert on failure
            setNotifications(previousNotifications)
            setUnreadCount(previousCount)
        }
    }, [notifications, unreadCount])

    // Delete a notification
    const deleteNotification = useCallback(async (id: string) => {
        const previous = notifications
        const wasUnread = notifications.find((n) => n.id === id && !n.isRead)

        // Optimistic update
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1))

        try {
            const res = await fetch(`/api/notifications/${id}`, {
                method: "DELETE",
            })
            if (!res.ok) throw new Error("Failed to delete notification")
        } catch {
            // Revert on failure
            setNotifications(previous)
            if (wasUnread) setUnreadCount((prev) => prev + 1)
        }
    }, [notifications])

    // Load more (pagination)
    const loadMore = useCallback(async () => {
        if (!hasMore || !nextCursor) return
        await fetchNotifications(nextCursor)
    }, [hasMore, nextCursor, fetchNotifications])

    // Force refresh
    const refresh = useCallback(async () => {
        setIsLoading(true)
        setNextCursor(null)
        await fetchNotifications()
    }, [fetchNotifications])

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        hasMore,
        markAsRead,
        markAllRead,
        deleteNotification,
        loadMore,
        refresh,
    }
}
