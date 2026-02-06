"use client"

import { useAuth } from "@/lib/auth-context"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
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
  Plus,
} from "lucide-react"
import Link from "next/link"
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

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Driver Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.name?.split(" ")[0] || "Driver"}. Manage your
            vehicles and track performance.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/driver/register">
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Bus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {data?.totalVehicles || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Vehicles</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-1/10">
                  <Activity className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {data?.activeVehicles || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Now</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <Route className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {data?.totalTrips || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Trips</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10">
                  <Star className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {data?.avgRating || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10">
                  <Navigation className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {data?.recentPositions || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Updates (24h)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vehicles List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-display text-base">
                My Vehicles
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="/dashboard/driver/vehicles"
                  className="flex items-center gap-1 text-xs"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {data?.vehicles && data.vehicles.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {data.vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center gap-4 rounded-lg border border-border p-4"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                        <Bus className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-sm font-semibold text-foreground">
                            {vehicle.plateNumber}
                          </p>
                          {vehicle.isActive ? (
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                            </span>
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                          )}
                        </div>
                        {vehicle.nickname && (
                          <p className="text-xs text-muted-foreground">
                            {vehicle.nickname}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {VEHICLE_TYPE_LABELS[vehicle.type] || vehicle.type}
                          </Badge>
                          {vehicle.routes.map((r) => (
                            <Badge
                              key={r}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="hidden flex-col items-end gap-1 sm:flex">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          <span className="text-sm font-semibold text-foreground">
                            {vehicle.rating}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {vehicle.totalTrips} trips
                        </span>
                      </div>
                      {vehicle.lastPosition && (
                        <div className="hidden flex-col items-end gap-1 md:flex">
                          <span className="flex items-center gap-1 text-xs text-primary">
                            <Navigation className="h-3 w-3" />
                            {vehicle.lastPosition.speed} km/h
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(
                              vehicle.lastPosition.timestamp
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Bus className="h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No vehicles registered yet
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 bg-transparent"
                    asChild
                  >
                    <Link href="/dashboard/driver/register">
                      Register Your First Vehicle
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
