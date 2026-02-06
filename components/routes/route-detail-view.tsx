"use client"

import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Bus,
  Clock,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"

interface Stage {
  name: string
  lat: number
  lng: number
  order: number
  isTerminal: boolean
}

interface Vehicle {
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

interface RouteData {
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

interface RouteDetailViewProps {
  route: RouteData
  vehicles: Vehicle[]
}

export function RouteDetailView({ route, vehicles }: RouteDetailViewProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Back Link */}
      <Button variant="ghost" size="sm" className="w-fit gap-2" asChild>
        <Link href="/routes">
          <ArrowLeft className="h-4 w-4" />
          Back to Routes
        </Link>
      </Button>

      {/* Route Header */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: route.color }}
          />
          <h1 className="font-display text-3xl font-bold text-foreground">
            {route.name}
          </h1>
          {route.isActive && (
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
              Active
            </Badge>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>Code: {route.code}</span>
          <span>County: {route.county}</span>
          <span>{route.vehicleCount} vehicles</span>
        </div>
        {route.description && (
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {route.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Stages Timeline */}
        <div className="lg:col-span-1">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
            Stages
          </h2>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-col">
              {route.stages.map((stage, index) => (
                <div key={stage.order} className="flex gap-3">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        stage.isTerminal
                          ? "bg-primary text-primary-foreground"
                          : "border-2 border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {stage.isTerminal ? (
                        <MapPin className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-medium">
                          {index + 1}
                        </span>
                      )}
                    </div>
                    {index < route.stages.length - 1 && (
                      <div
                        className="w-0.5 flex-1"
                        style={{
                          backgroundColor: route.color,
                          minHeight: "2rem",
                          opacity: 0.3,
                        }}
                      />
                    )}
                  </div>

                  {/* Stage Info */}
                  <div className="pb-6">
                    <p
                      className={`text-sm font-medium ${
                        stage.isTerminal ? "text-foreground" : "text-foreground"
                      }`}
                    >
                      {stage.name}
                    </p>
                    {stage.isTerminal && (
                      <p className="text-xs text-muted-foreground">
                        {index === 0 ? "Origin" : "Destination"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicles on this route */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
            Vehicles on this Route
          </h2>
          {vehicles.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {vehicles.map((vehicle) => (
                <Link
                  key={vehicle.id}
                  href={`/vehicles/${vehicle.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <Bus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {vehicle.plateNumber}
                      </span>
                      {vehicle.isActive && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                      )}
                    </div>
                    {vehicle.nickname && (
                      <p className="text-xs text-muted-foreground">
                        {vehicle.nickname}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{VEHICLE_TYPE_LABELS[vehicle.type] || vehicle.type}</span>
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-accent text-accent" />
                        {vehicle.rating}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {vehicle.totalTrips} trips
                      </span>
                    </div>
                  </div>
                  {vehicle.position && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Navigation className="h-3 w-3" />
                        {vehicle.position.speed} km/h
                      </div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12">
              <Bus className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No vehicles currently tracked on this route
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
