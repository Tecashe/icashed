"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MapPin, Clock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface WaitingPassengersCardProps {
    vehicleId?: string
    routeId?: string
    className?: string
    compact?: boolean
}

interface StageWithWaiting {
    id: string
    name: string
    latitude: number
    longitude: number
    waitingCount: number
    oldestWaitingMinutes?: number
}

export function WaitingPassengersCard({
    vehicleId,
    routeId,
    className,
    compact = false,
}: WaitingPassengersCardProps) {
    // Fetch waiting passengers for driver's routes
    const { data, isLoading } = useSWR<{ stages: StageWithWaiting[] }>(
        vehicleId ? `/api/driver/stages/waiting?vehicleId=${vehicleId}` :
            routeId ? `/api/driver/stages/waiting?routeId=${routeId}` : null,
        fetcher,
        { refreshInterval: 15000 } // Refresh every 15 seconds
    )

    const stages = data?.stages || []
    const stagesWithPassengers = stages.filter((s) => s.waitingCount > 0)
    const totalWaiting = stagesWithPassengers.reduce((sum, s) => sum + s.waitingCount, 0)

    if (isLoading) {
        return null
    }

    if (stagesWithPassengers.length === 0) {
        return null
    }

    if (compact) {
        return (
            <div className={cn("flex items-center gap-2 rounded-full bg-accent/90 px-3 py-2 text-accent-foreground shadow-lg", className)}>
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{totalWaiting} waiting</span>
                <span className="text-xs opacity-80">
                    at {stagesWithPassengers.length} stage{stagesWithPassengers.length > 1 ? 's' : ''}
                </span>
            </div>
        )
    }

    return (
        <Card className={cn("border-accent/30 bg-accent/5", className)}>
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-accent" />
                    <h3 className="font-semibold text-foreground">Passengers Waiting</h3>
                    <Badge variant="secondary" className="ml-auto">
                        {totalWaiting} total
                    </Badge>
                </div>

                <div className="space-y-2">
                    {stagesWithPassengers.slice(0, 5).map((stage) => (
                        <div
                            key={stage.id}
                            className="flex items-center gap-3 rounded-xl bg-muted/50 p-3"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
                                <MapPin className="h-4 w-4 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{stage.name}</p>
                                {stage.oldestWaitingMinutes && stage.oldestWaitingMinutes > 5 && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Waiting {stage.oldestWaitingMinutes}+ min
                                    </p>
                                )}
                            </div>
                            <Badge
                                className={cn(
                                    "text-xs",
                                    stage.waitingCount >= 5
                                        ? "bg-accent text-accent-foreground"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                {stage.waitingCount} passenger{stage.waitingCount > 1 ? 's' : ''}
                            </Badge>
                        </div>
                    ))}

                    {stagesWithPassengers.length > 5 && (
                        <p className="text-center text-xs text-muted-foreground">
                            +{stagesWithPassengers.length - 5} more stages
                        </p>
                    )}
                </div>

                {/* Alert for long waits */}
                {stagesWithPassengers.some((s) => (s.oldestWaitingMinutes || 0) > 15) && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 p-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs">Some passengers waiting 15+ minutes</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
