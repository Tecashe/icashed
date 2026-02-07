"use client"

import { useAuth } from "@/lib/auth-context"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Bus,
  Navigation,
  Star,
  Route,
  Activity,
  Loader2,
  ChevronRight,
  Power,
  MapPin,
  Clock,
} from "lucide-react"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"

interface DriverStats {
  totalVehicles: number
  activeVehicles: number
  totalTrips: number
  avgRating: number
  recentPositions: number
  vehicles: {
    id: string
    plateNumber: string
    nickname: string | null
    type: string
    isActive: boolean
    rating: number
    totalTrips: number
    routes: string[]
    lastPosition: {
      latitude: number
      longitude: number
      speed: number
      timestamp: string
    } | null
  }[]
}

export default function DriverDashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useSWR<DriverStats>("/api/driver/stats", fetcher)

  const firstName = user?.name?.split(" ")[0] || "Driver"

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Header - Simple and friendly */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Hello, {firstName}! 👋
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Ready to start driving?
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Quick Start Section - Big obvious button */}
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-semibold text-foreground">
                    Start Tracking
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Let passengers find your vehicle on the map
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="h-14 w-full gap-3 text-lg font-semibold sm:w-auto sm:px-8"
                >
                  <Link href="/dashboard/driver/tracking">
                    <Power className="h-6 w-6" />
                    GO LIVE
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid - Big readable numbers */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="flex flex-col items-center p-4 text-center sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Bus className="h-6 w-6 text-primary" />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {data?.totalVehicles || 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">My Vehicles</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center p-4 text-center sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-chart-1/10">
                  <Activity className="h-6 w-6 text-chart-1" />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {data?.activeVehicles || 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Active Now</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center p-4 text-center sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                  <Route className="h-6 w-6 text-accent" />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {data?.totalTrips || 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Total Trips</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center p-4 text-center sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-chart-2/10">
                  <Star className="h-6 w-6 text-chart-2" />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {data?.avgRating && data.avgRating > 0 ? data.avgRating.toFixed(1) : "-"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Rating</p>
              </CardContent>
            </Card>
          </div>

          {/* My Vehicles - Clear and tappable */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-display text-lg">My Vehicles</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="/dashboard/driver/vehicles"
                  className="flex items-center gap-1 text-sm"
                >
                  See All <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {data?.vehicles && data.vehicles.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {data.vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center gap-4 rounded-2xl border border-border p-4 transition-colors hover:bg-muted/50"
                    >
                      {/* Vehicle Icon */}
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted">
                        <Bus className="h-7 w-7 text-muted-foreground" />
                      </div>

                      {/* Vehicle Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-base font-semibold text-foreground">
                            {vehicle.plateNumber}
                          </p>
                          {vehicle.isActive ? (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                            </span>
                          ) : (
                            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                          )}
                        </div>
                        {vehicle.nickname && (
                          <p className="text-sm text-muted-foreground">
                            {vehicle.nickname}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="text-xs">
                            {VEHICLE_TYPE_LABELS[vehicle.type as keyof typeof VEHICLE_TYPE_LABELS] || vehicle.type}
                          </Badge>
                          {vehicle.routes.slice(0, 2).map((r) => (
                            <Badge key={r} variant="outline" className="text-xs">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Quick Action */}
                      <Button
                        variant={vehicle.isActive ? "secondary" : "default"}
                        size="sm"
                        className="shrink-0"
                        asChild
                      >
                        <Link href="/dashboard/driver/tracking">
                          {vehicle.isActive ? "Tracking" : "Start"}
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-10 text-center">
                  <Bus className="h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-3 text-base text-muted-foreground">
                    No vehicles yet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    Add your first vehicle to start earning
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/driver/register">
                      Add Vehicle
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions - Large touch targets */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-6 bg-transparent"
              asChild
            >
              <Link href="/dashboard/driver/vehicles">
                <Bus className="h-8 w-8 text-primary" />
                <span className="font-medium">My Vehicles</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-6 bg-transparent"
              asChild
            >
              <Link href="/dashboard/driver/register">
                <Navigation className="h-8 w-8 text-accent" />
                <span className="font-medium">Add Vehicle</span>
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
