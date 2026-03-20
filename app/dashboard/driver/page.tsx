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
  Users,
  Bell,
  MessageSquare,
} from "lucide-react"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"

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

interface WaitingStage {
  id: string
  name: string
  waitingCount: number
  route: {
    name: string
    color: string
  }
}

export default function DriverDashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useSWR<DriverStats>("/api/driver/stats", fetcher)
  const { data: waitingData } = useSWR<{ stages: WaitingStage[] }>(
    "/api/driver/stages/waiting",
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )

  const firstName = user?.name?.split(" ")[0] || "Driver"
  const totalWaiting = waitingData?.stages?.reduce((sum, s) => sum + s.waitingCount, 0) || 0
  const stagesWithWaiting = waitingData?.stages?.filter((s) => s.waitingCount > 0) || []

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome Header - Simple and friendly */}
      <div className="text-center sm:text-left">
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
          {/* Quick Start Section - BIG obvious button */}
          <Card className="overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground">
                    Start Tracking
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Let passengers find your vehicle on the map
                  </p>
                </div>
                <Button
                  asChild
                  size="lg"
                  className="h-16 w-full gap-3 text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 sm:w-auto sm:px-12"
                >
                  <Link href="/dashboard/driver/tracking">
                    <Power className="h-6 w-6" />
                    GO LIVE
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Passengers Waiting Alert */}
          {totalWaiting > 0 && (
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <Users className="h-6 w-6 text-amber-600" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {totalWaiting > 99 ? "99+" : totalWaiting}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">
                    {totalWaiting} passenger{totalWaiting > 1 ? "s" : ""} waiting!
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    At {stagesWithWaiting.slice(0, 2).map((s) => s.name).join(", ")}
                    {stagesWithWaiting.length > 2 && ` +${stagesWithWaiting.length - 2} more`}
                  </p>
                </div>
                <Button variant="secondary" size="sm" asChild className="shrink-0">
                  <Link href="/dashboard/driver/tracking">View</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid - Big readable numbers */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="overflow-hidden">
              <CardContent className="flex flex-col items-center p-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Bus className="h-6 w-6 text-primary" />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {data?.totalVehicles || 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Vehicles</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="flex flex-col items-center p-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-chart-1/10">
                  <Activity className="h-6 w-6 text-chart-1" />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {data?.activeVehicles || 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Active</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="flex flex-col items-center p-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
                  <Route className="h-6 w-6 text-accent" />
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground">
                  {data?.totalTrips || 0}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Trips</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <Link href="/dashboard/driver/reviews" className="block h-full">
                <CardContent className="flex h-full flex-col items-center p-4 text-center transition-colors hover:bg-muted/30">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
                    <Star className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-foreground">
                    {data?.avgRating && data.avgRating > 0 ? data.avgRating.toFixed(1) : "-"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Rating</p>
                </CardContent>
              </Link>
            </Card>
          </div>

          {/* My Vehicles - Clear and tappable */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="font-display text-lg">My Vehicles</CardTitle>
              <Button variant="ghost" size="sm" asChild className="h-10 px-3">
                <Link
                  href="/dashboard/driver/vehicles"
                  className="flex items-center gap-1 text-sm"
                >
                  All <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {data?.vehicles && data.vehicles.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {data.vehicles.slice(0, 3).map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      {/* Vehicle Icon */}
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Bus className="h-6 w-6 text-muted-foreground" />
                      </div>

                      {/* Vehicle Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-base font-semibold text-foreground">
                            {vehicle.plateNumber}
                          </p>
                          {vehicle.isActive && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {VEHICLE_TYPE_LABELS[vehicle.type as keyof typeof VEHICLE_TYPE_LABELS] || vehicle.type}
                          </Badge>
                        </div>
                      </div>

                      {/* Quick Action */}
                      <Button
                        variant={vehicle.isActive ? "secondary" : "default"}
                        size="sm"
                        className="h-10 shrink-0"
                        asChild
                      >
                        <Link href="/dashboard/driver/tracking">
                          {vehicle.isActive ? "Live" : "Start"}
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Bus className="h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-3 text-base font-medium text-muted-foreground">
                    No vehicles yet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    Add your first vehicle to start earning
                  </p>
                  <Button className="mt-4" size="lg" asChild>
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
              className="h-auto flex-col gap-2 py-5 bg-transparent"
              asChild
            >
              <Link href="/dashboard/driver/vehicles">
                <Bus className="h-7 w-7 text-primary" />
                <span className="font-medium">My Vehicles</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-5 bg-transparent"
              asChild
            >
              <Link href="/dashboard/driver/register">
                <Navigation className="h-7 w-7 text-accent" />
                <span className="font-medium">Add Vehicle</span>
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
