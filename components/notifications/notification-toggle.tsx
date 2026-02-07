"use client"

import { usePushNotifications } from "@/hooks/use-push-notifications"
import { Switch } from "@/components/ui/switch"
import { Bell, BellOff, Loader2 } from "lucide-react"

interface NotificationToggleProps {
    className?: string
    showLabel?: boolean
}

export function NotificationToggle({
    className = "",
    showLabel = true,
}: NotificationToggleProps) {
    const {
        isSupported,
        isSubscribed,
        isLoading,
        permission,
        error,
        toggle,
    } = usePushNotifications()

    // Don't render if not supported
    if (!isSupported) {
        return null
    }

    const handleToggle = async () => {
        await toggle()
    }

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {showLabel && (
                <div className="flex items-center gap-2">
                    {isSubscribed ? (
                        <Bell className="h-4 w-4 text-primary" />
                    ) : (
                        <BellOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                        Notifications
                    </span>
                </div>
            )}

            <div className="flex items-center gap-2">
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <Switch
                        checked={isSubscribed}
                        onCheckedChange={handleToggle}
                        disabled={permission === "denied"}
                        aria-label="Toggle notifications"
                    />
                )}
            </div>

            {permission === "denied" && (
                <span className="text-xs text-destructive">
                    Blocked in browser
                </span>
            )}

            {error && permission !== "denied" && (
                <span className="text-xs text-destructive">
                    {error}
                </span>
            )}
        </div>
    )
}
