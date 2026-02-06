"use client"

import Link from "next/link"
import {
  Bus,
  Star,
  Navigation,
  Clock,
  Users,
  ChevronRight,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"

interface VehicleCardProps {
  id: string
  plateNumber: string
  nickname: string | null
  type: string
  capacity: number
  isActive: boolean
  isPremium: boolean
  rating: number
  totalTrips: number
  routes: string[]
  position: { lat: number; lng: number; speed: number; heading: number } | null
}

export function VehicleCard({
  id,
  plateNumber,
  nickname,
  type,
  capacity,
  isActive,
  isPremium,
  rating,
  totalTrips,
  routes,
  position,
}: VehicleCardProps) {
  return (
    <Link
      href={`/vehicles/${id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Vehicle Image Placeholder */}
      <div className="relative flex h-44 items-center justify-center rounded-t-2xl bg-muted/60">
        <Bus className="h-16 w-16 text-muted-foreground/30" />

        {/* Status badges */}
        <div className="absolute left-3 top-3 flex gap-2">
          {isPremium && (
            <Badge className="bg-accent text-accent-foreground hover:bg-accent">
              <Zap className="mr-1 h-3 w-3" />
              Premium
            </Badge>
          )}
          {isActive ? (
            <Badge className="bg-primary/90 text-primary-foreground hover:bg-primary/90">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">Offline</Badge>
          )}
        </div>

        {/* Speed */}
        {position && isActive && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs font-medium text-foreground shadow backdrop-blur-sm">
            <Navigation className="h-3 w-3 text-primary" />
            {position.speed} km/h
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Name & Plate */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">
              {plateNumber}
            </h3>
            {nickname && (
              <p className="text-xs text-muted-foreground">{nickname}</p>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5">
            <Star className="h-3 w-3 fill-accent text-accent" />
            <span className="text-xs font-medium text-accent">
              {rating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Route Tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {routes.map((route) => (
            <span
              key={route}
              className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
            >
              {route}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bus className="h-3 w-3" />
            {VEHICLE_TYPE_LABELS[type] || type}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {capacity} seats
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {totalTrips.toLocaleString()} trips
          </span>
        </div>

        {/* Hover CTA */}
        <div className="mt-2 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          View Details
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  )
}
