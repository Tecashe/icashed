"use client"

import React from "react"
import { useState } from "react"
import { Bell, BellOff, X, Loader2, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import { cn } from "@/lib/utils"

interface Notification {
    id: string
    title: string
    message: string
    time: string
    read: boolean
    type: "info" | "success" | "warning"
}

// Mock notifications - in production, fetch from API
const mockNotifications: Notification[] = [
    {
        id: "1",
        title: "Passengers waiting!",
        message: "3 passengers waiting at Westlands Stage",
        time: "2 min ago",
        read: false,
        type: "info",
    },
    {
        id: "2",
        title: "New review",
        message: "You received a 5-star review!",
        time: "1 hour ago",
        read: true,
        type: "success",
    },
]

export function NotificationBell({ className }: { className?: string }) {
    const [open, setOpen] = useState(false)
    const [notifications] = useState<Notification[]>(mockNotifications)
    const {
        isSupported,
        isSubscribed,
        isLoading,
        permission,
        toggle,
    } = usePushNotifications()

    const unreadCount = notifications.filter((n) => !n.read).length

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("relative h-12 w-12", className)}
                    aria-label="Open notifications"
                >
                    {isSubscribed ? (
                        <Bell className="h-5 w-5" />
                    ) : (
                        <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    {unreadCount > 0 && (
                        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center gap-2 font-display">
                        <Bell className="h-5 w-5" />
                        Notifications
                    </SheetTitle>
                </SheetHeader>

                {/* Push notification toggle */}
                {isSupported && (
                    <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <Settings className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">Push Notifications</p>
                                <p className="text-xs text-muted-foreground">
                                    {isSubscribed ? "Enabled" : "Get alerts on your phone"}
                                </p>
                            </div>
                        </div>
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                            <Switch
                                checked={isSubscribed}
                                onCheckedChange={toggle}
                                disabled={permission === "denied"}
                                aria-label="Toggle push notifications"
                            />
                        )}
                    </div>
                )}

                {permission === "denied" && (
                    <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        Notifications blocked. Please enable them in browser settings.
                    </div>
                )}

                {/* Notifications list */}
                <div className="flex flex-col gap-2">
                    {notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={cn(
                                    "flex gap-3 rounded-xl border p-4 transition-colors",
                                    notification.read
                                        ? "border-border bg-transparent"
                                        : "border-primary/20 bg-primary/5"
                                )}
                            >
                                <div
                                    className={cn(
                                        "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                                        notification.read ? "bg-muted-foreground/30" : "bg-primary"
                                    )}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">
                                        {notification.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                        {notification.time}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center py-12 text-center">
                            <Bell className="h-10 w-10 text-muted-foreground/30" />
                            <p className="mt-3 text-sm text-muted-foreground">
                                No notifications yet
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground/70">
                                We'll let you know when something happens
                            </p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
