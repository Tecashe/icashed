"use client"

import React, { useState } from "react"
import {
    Bell,
    BellOff,
    X,
    Loader2,
    Settings,
    Bus,
    Star,
    AlertTriangle,
    Info,
    CheckCheck,
    Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { useNotifications, type AppNotification } from "@/hooks/use-notifications"
import { cn } from "@/lib/utils"

// ============================================================================
// Notification type config
// ============================================================================

const typeConfig: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
    VEHICLE_APPROACHING: { icon: Bus, color: "text-blue-500" },
    VEHICLE_DEPARTED: { icon: Bus, color: "text-orange-500" },
    VEHICLE_ARRIVING: { icon: Bus, color: "text-green-500" },
    WAITING_PASSENGERS: { icon: Info, color: "text-purple-500" },
    REVIEW_RECEIVED: { icon: Star, color: "text-yellow-500" },
    SYSTEM: { icon: AlertTriangle, color: "text-muted-foreground" },
}

// ============================================================================
// Time formatting
// ============================================================================

function timeAgo(dateStr: string): string {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diffMs = now - then
    const diffMin = Math.floor(diffMs / 60_000)

    if (diffMin < 1) return "just now"
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}d ago`
    return new Date(dateStr).toLocaleDateString()
}

// ============================================================================
// Component
// ============================================================================

export function NotificationBell({ className }: { className?: string }) {
    const [open, setOpen] = useState(false)

    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllRead,
        deleteNotification,
        hasMore,
        loadMore,
    } = useNotifications()

    const {
        isSupported: pushSupported,
        isSubscribed: pushSubscribed,
        isLoading: pushLoading,
        permission: pushPermission,
        subscribe: pushSubscribe,
        unsubscribe: pushUnsubscribe,
    } = usePushNotifications()

    const togglePush = () => {
        if (pushSubscribed) {
            pushUnsubscribe()
        } else {
            pushSubscribe()
        }
    }

    const handleNotificationClick = (notification: AppNotification) => {
        if (!notification.isRead) {
            markAsRead(notification.id)
        }
        // Navigate if the notification has a URL
        if (notification.data?.url) {
            setOpen(false)
            window.location.href = notification.data.url
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("relative h-10 w-10", className)}
                    aria-label="Open notifications"
                >
                    {pushSubscribed ? (
                        <Bell className="h-5 w-5" />
                    ) : (
                        <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    {unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>

            <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                <SheetHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2 font-display">
                            <Bell className="h-5 w-5" />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                                    {unreadCount}
                                </span>
                            )}
                        </SheetTitle>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                onClick={markAllRead}
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                {/* Push notification toggle */}
                {pushSupported && (
                    <div className="mx-1 mb-3 flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                <Settings className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Push Notifications</p>
                                <p className="text-xs text-muted-foreground">
                                    {pushSubscribed
                                        ? "Enabled — you'll get alerts"
                                        : "Get alerts on your device"}
                                </p>
                            </div>
                        </div>
                        {pushLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                            <Switch
                                checked={pushSubscribed}
                                onCheckedChange={togglePush}
                                disabled={pushPermission === "denied"}
                                aria-label="Toggle push notifications"
                            />
                        )}
                    </div>
                )}

                {pushPermission === "denied" && (
                    <div className="mx-1 mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        Notifications blocked. Please enable them in browser settings.
                    </div>
                )}

                {/* Notifications list */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col gap-3 p-2">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-20 animate-pulse rounded-xl bg-muted/50"
                                />
                            ))}
                        </div>
                    ) : notifications.length > 0 ? (
                        <div className="flex flex-col gap-1.5 p-1">
                            {notifications.map((notification) => {
                                const config =
                                    typeConfig[notification.type] || typeConfig.SYSTEM
                                const Icon = config.icon

                                return (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() =>
                                            handleNotificationClick(notification)
                                        }
                                        className={cn(
                                            "group relative flex w-full gap-3 rounded-xl border p-3 text-left transition-all hover:bg-muted/50",
                                            notification.isRead
                                                ? "border-transparent"
                                                : "border-primary/20 bg-primary/5"
                                        )}
                                    >
                                        {/* Icon */}
                                        <div
                                            className={cn(
                                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                notification.isRead
                                                    ? "bg-muted"
                                                    : "bg-primary/10"
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    "h-4 w-4",
                                                    notification.isRead
                                                        ? "text-muted-foreground"
                                                        : config.color
                                                )}
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p
                                                    className={cn(
                                                        "text-sm leading-snug",
                                                        notification.isRead
                                                            ? "text-muted-foreground"
                                                            : "font-medium text-foreground"
                                                    )}
                                                >
                                                    {notification.title}
                                                </p>
                                                {/* Unread dot */}
                                                {!notification.isRead && (
                                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="mt-1 text-[10px] text-muted-foreground/70">
                                                {timeAgo(notification.createdAt)}
                                            </p>
                                        </div>

                                        {/* Delete on hover */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                deleteNotification(notification.id)
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    </button>
                                )
                            })}

                            {/* Load more */}
                            {hasMore && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mx-auto mt-2 text-xs text-muted-foreground"
                                    onClick={loadMore}
                                >
                                    Load more
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-16 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                                <Bell className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                            <p className="mt-4 text-sm font-medium text-muted-foreground">
                                No notifications yet
                            </p>
                            <p className="mt-1 max-w-[200px] text-xs text-muted-foreground/70">
                                We&apos;ll let you know when vehicles approach or
                                something important happens
                            </p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
