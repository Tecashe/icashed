"use client"

import Link from "next/link"
import {
  ArrowLeft,
  Bus,
  Star,
  Navigation,
  Clock,
  Users,
  Zap,
  MapPin,
  Route,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"

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

export function VehicleDetailView({ vehicle }: { vehicle: Vehicle }) {
  return (
    <div className="flex flex-col gap-8">
      {/* Back Link */}
      <Button variant="ghost" size="sm" className="w-fit gap-2" asChild>
        <Link href="/vehicles">
          <ArrowLeft className="h-4 w-4" />
          Back to Gallery
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Image & Quick Info */}
        <div className="lg:col-span-1">
          {/* Vehicle Image */}
          <div className="relative flex h-64 items-center justify-center rounded-2xl border border-border bg-muted/60">
            <Bus className="h-24 w-24 text-muted-foreground/20" />
            <div className="absolute left-3 top-3 flex gap-2">
              {vehicle.isPremium && (
                <Badge className="bg-accent text-accent-foreground hover:bg-accent">
                  <Zap className="mr-1 h-3 w-3" />
                  Premium
                </Badge>
              )}
              {vehicle.isActive ? (
                <Badge className="bg-primary/90 text-primary-foreground hover:bg-primary/90">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Offline</Badge>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <Star className="mx-auto h-5 w-5 fill-accent text-accent" />
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {vehicle.rating.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <Clock className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 font-display text-2xl font-bold text-foreground">
                {vehicle.totalTrips.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Trips</p>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-bold text-foreground">
                {vehicle.plateNumber}
              </h1>
              {vehicle.isActive && (
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                </span>
              )}
            </div>
            {vehicle.nickname && (
              <p className="mt-1 text-lg text-muted-foreground">
                &quot;{vehicle.nickname}&quot;
              </p>
            )}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Vehicle Type */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vehicle Type</p>
                  <p className="text-sm font-semibold text-foreground">
                    {VEHICLE_TYPE_LABELS[vehicle.type] || vehicle.type}
                  </p>
                </div>
              </div>
            </div>

            {/* Capacity */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="text-sm font-semibold text-foreground">
                    {vehicle.capacity} passengers
                  </p>
                </div>
              </div>
            </div>

            {/* Current Speed */}
            {vehicle.position && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Navigation className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Current Speed
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {vehicle.position.speed} km/h
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            {vehicle.position && (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Last Position
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {vehicle.position.lat.toFixed(4)},{" "}
                      {vehicle.position.lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Routes */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-foreground">
              <Route className="h-4 w-4 text-primary" />
              Assigned Routes
            </h3>
            <div className="flex flex-wrap gap-2">
              {vehicle.routes.map((route) => (
                <span
                  key={route}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground"
                >
                  {route}
                </span>
              ))}
            </div>
          </div>

          {/* Reliability Score */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 font-display text-sm font-semibold text-foreground">
              Reliability Score
            </h3>
            <div className="flex items-center gap-4">
              <Progress
                value={vehicle.rating * 20}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-foreground">
                {(vehicle.rating * 20).toFixed(0)}%
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Based on {vehicle.totalTrips.toLocaleString()} completed trips and
              passenger feedback.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
