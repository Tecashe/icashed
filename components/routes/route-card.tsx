"use client"

import Link from "next/link"
import { MapPin, Navigation, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Stage {
  name: string
  lat: number
  lng: number
  order: number
  isTerminal: boolean
}

interface RouteCardProps {
  id: string
  name: string
  code: string
  description: string | null
  origin: string
  destination: string
  county: string
  isActive: boolean
  color: string
  vehicleCount: number
  stages: Stage[]
}

export function RouteCard({
  id,
  name,
  code,
  description,
  origin,
  destination,
  county,
  isActive,
  color,
  vehicleCount,
  stages,
}: RouteCardProps) {
  return (
    <Link
      href={`/routes/${id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Color strip */}
      <div className="h-1.5 rounded-t-2xl" style={{ backgroundColor: color }} />

      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold text-foreground">
                {name}
              </h3>
              {isActive && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{code}</p>
          </div>
          <Badge
            variant="secondary"
            className="text-xs"
          >
            {county}
          </Badge>
        </div>

        {/* Description */}
        {description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}

        {/* Route Stages Preview */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">{origin}</span>
          </div>
          <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
          <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
            <span className="text-[10px] text-muted-foreground">
              {stages.length} stages
            </span>
          </div>
          <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-medium text-foreground">
              {destination}
            </span>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {vehicleCount} vehicles active
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View Details
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  )
}
