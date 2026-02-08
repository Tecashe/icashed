"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
    X,
    Gauge,
    Navigation2,
    MapPin,
    Clock,
    Phone,
    User,
    Circle,
    TrendingUp,
    Map,
    ChevronDown,
    ChevronUp,
} from "lucide-react"

export interface Vehicle {
    id: string
    plateNumber: string
    nickname?: string | null
    type: string
    color: string
    routeName: string
    speed: number
    heading: number
    lat: number
    lng: number
    isLive?: boolean
    progress?: number
    etaMinutes?: number
    nextStageName?: string
    driverName?: string
    driverPhone?: string
}

interface VehiclePanelProps {
    vehicle: Vehicle | null
    onClose?: () => void
    onLocate?: () => void
    className?: string
}

export function VehiclePanel({
    vehicle,
    onClose,
    onLocate,
    className,
}: VehiclePanelProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    if (!vehicle) {
        return null
    }

    const isLive = vehicle.isLive !== false

    return (
        <div
            className={cn(
                "flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden",
                "w-full lg:w-96",
                className
            )}
        >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-card via-card to-card/50 p-6 pb-8">
                <div
                    className="absolute inset-0 opacity-5"
                    style={{
                        background: `radial-gradient(circle at 30% 50%, ${vehicle.color} 0%, transparent 50%)`,
                    }}
                />

                <div className="relative">
                    <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-white/20 shadow-lg"
                                style={{ backgroundColor: vehicle.color }}
                            >
                                <span className="text-lg font-bold text-white">
                                    {vehicle.type === "MATATU" ? "M" : vehicle.type[0]}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">
                                    {vehicle.plateNumber}
                                </h3>
                                {vehicle.nickname && (
                                    <p className="text-sm text-muted-foreground">
                                        {vehicle.nickname}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="h-8 w-8 lg:hidden"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronUp className="h-4 w-4" />
                                )}
                            </Button>
                            {onClose && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClose}
                                    className="h-8 w-8"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2">
                        <Badge
                            variant={isLive ? "default" : "secondary"}
                            className="gap-1.5"
                        >
                            <Circle
                                className={cn(
                                    "h-2 w-2 fill-current",
                                    isLive && "animate-pulse"
                                )}
                            />
                            {isLive ? "Live" : "Offline"}
                        </Badge>
                        <Badge variant="outline" className="bg-background/50">
                            {vehicle.type.replace("_", " ")}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 p-6">
                        <StatCard
                            icon={<Gauge className="h-4 w-4" />}
                            label="Speed"
                            value={`${Math.round(vehicle.speed)} km/h`}
                            color={vehicle.speed > 40 ? "text-green-500" : "text-muted-foreground"}
                        />
                        <StatCard
                            icon={<Navigation2 className="h-4 w-4" />}
                            label="Heading"
                            value={`${Math.round(vehicle.heading)}°`}
                        />
                        {vehicle.etaMinutes !== undefined && (
                            <StatCard
                                icon={<Clock className="h-4 w-4" />}
                                label="ETA"
                                value={`${vehicle.etaMinutes} min`}
                                color="text-primary"
                            />
                        )}
                    </div>

                    <Separator />

                    {/* Route Info */}
                    <div className="space-y-4 p-6">
                        <InfoRow
                            icon={<Map className="h-4 w-4" />}
                            label="Route"
                            value={vehicle.routeName}
                        />
                        {vehicle.nextStageName && (
                            <InfoRow
                                icon={<MapPin className="h-4 w-4" />}
                                label="Next Stop"
                                value={vehicle.nextStageName}
                            />
                        )}
                        {vehicle.progress !== undefined && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <TrendingUp className="h-4 w-4" />
                                        <span>Route Progress</span>
                                    </div>
                                    <span className="font-semibold text-foreground">
                                        {Math.round(vehicle.progress)}%
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-primary transition-all duration-500"
                                        style={{ width: `${vehicle.progress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Driver Info (if available) */}
                    {(vehicle.driverName || vehicle.driverPhone) && (
                        <>
                            <Separator />
                            <div className="space-y-3 p-6">
                                <h4 className="text-sm font-semibold text-foreground">
                                    Driver Information
                                </h4>
                                {vehicle.driverName && (
                                    <InfoRow
                                        icon={<User className="h-4 w-4" />}
                                        label="Name"
                                        value={vehicle.driverName}
                                    />
                                )}
                                {vehicle.driverPhone && (
                                    <InfoRow
                                        icon={<Phone className="h-4 w-4" />}
                                        label="Phone"
                                        value={vehicle.driverPhone}
                                        action={
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7"
                                                asChild
                                            >
                                                <a href={`tel:${vehicle.driverPhone}`}>Call</a>
                                            </Button>
                                        }
                                    />
                                )}
                            </div>
                        </>
                    )}

                    {/* Actions */}
                    <div className="border-t border-border bg-muted/30 p-4">
                        <Button
                            onClick={onLocate}
                            className="w-full"
                            size="lg"
                        >
                            <MapPin className="mr-2 h-4 w-4" />
                            Locate on Map
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

interface StatCardProps {
    icon: React.ReactNode
    label: string
    value: string
    color?: string
}

function StatCard({ icon, label, value, color }: StatCardProps) {
    return (
        <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {icon}
            </div>
            <p className={cn("text-base font-bold", color || "text-foreground")}>
                {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    )
}

interface InfoRowProps {
    icon: React.ReactNode
    label: string
    value: string
    action?: React.ReactNode
}

function InfoRow({ icon, label, value, action }: InfoRowProps) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {icon}
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium text-foreground">{value}</p>
                </div>
            </div>
            {action}
        </div>
    )
}
