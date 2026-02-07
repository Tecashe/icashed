"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MapPin, Clock } from "lucide-react"
import { fetcher } from "@/lib/api-client"

interface WaitingStage {
    id: string
    name: string
    latitude: number
    longitude: number
    order: number
    isTerminal: boolean
    waitingCount: number
    oldestWaiting: number | null
    route: {
        id: string
        name: string
        code: string
        color: string
    }
}

interface WaitingPassengersProps {
    routeId?: string
    compact?: boolean
}

export function WaitingPassengers({ routeId, compact = false }: WaitingPassengersProps) {
    const { data, isLoading } = useSWR<{ stages: WaitingStage[] }>(
        routeId
            ? `/api/driver/stages/waiting?routeId=${routeId}`
            : "/api/driver/stages/waiting",
        fetcher,
        { refreshInterval: 30000 }
    )

    // Filter to only stages with waiting passengers
    const stagesWithWaiting = data?.stages.filter((s) => s.waitingCount > 0) || []
    const totalWaiting = stagesWithWaiting.reduce((sum, s) => sum + s.waitingCount, 0)

    if (isLoading) {
        return (
            <Card className={compact ? "border-0 shadow-none" : ""}>
                <CardContent className="p-4">
                    <div className="animate-pulse flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted" />
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-muted rounded" />
                            <div className="h-3 w-32 bg-muted rounded" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (stagesWithWaiting.length === 0) {
        if (compact) return null

        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Waiting Passengers
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No passengers waiting at your route&apos;s stages
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Compact view for dashboard
    if (compact) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <p className="font-semibold text-foreground">{totalWaiting} waiting</p>
                    <p className="text-xs text-muted-foreground">
                        at {stagesWithWaiting.length} stage{stagesWithWaiting.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>
        )
    }

    // Full view
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Passengers Waiting
                    </span>
                    <Badge variant="secondary" className="font-bold">
                        {totalWaiting} total
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {stagesWithWaiting.map((stage) => (
                    <div
                        key={stage.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border"
                    >
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${stage.route.color}20` }}
                        >
                            <MapPin className="h-5 w-5" style={{ color: stage.route.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                                {stage.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs">
                                    {stage.route.code}
                                </Badge>
                                {stage.oldestWaiting && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                        <Clock className="h-3 w-3" />
                                        {stage.oldestWaiting}m
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-bold">
                            <Users className="h-4 w-4" />
                            {stage.waitingCount}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
