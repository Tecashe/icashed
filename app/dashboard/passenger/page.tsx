"use client"

import { useAuth } from "@/lib/auth-context"
import { useSavedRoutes, useMyReports } from "@/hooks/use-data"
import { useRealtimePositions } from "@/hooks/use-realtime-positions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Route,
  Navigation,
  AlertTriangle,
  Bookmark,
  MapPin,
  ChevronRight,
  Loader2,
  Bus,
  Clock,
  Search,
} from "lucide-react"
import Link from "next/link"

export default function PassengerDashboardPage() {
  const { user } = useAuth()
  const { data: savedData, isLoading: savedLoading } = useSavedRoutes()
  const { positions, isRealtime } = useRealtimePositions()
  const { data: reportsData } = useMyReports()

  const savedRoutes = savedData?.savedRoutes || []
  const liveCount = positions.length
  const reports = reportsData?.reports || []
  const pendingReports = reports.filter((r) => r.status === "PENDING").length

  const firstName = user?.name?.split(" ")[0] || "there"

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome - Friendly and simple */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
          Hi, {firstName}! 👋
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Find your ride in seconds
        </p>
      </div>

      {/* Quick Search - Big and obvious */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground">
                Where are you going?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Find vehicles on your route
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-14 w-full gap-3 text-lg font-semibold"
            >
              <Link href="/dashboard/passenger/routes">
                <Search className="h-6 w-6" />
                Find My Route
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Status Banner */}
      <div className="flex items-center justify-between rounded-2xl bg-muted p-4">
        <div className="flex items-center gap-3">
          {isRealtime ? (
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
          ) : (
            <span className="h-3 w-3 rounded-full bg-muted-foreground" />
          )}
          <span className="font-medium text-foreground">
            {liveCount} vehicles live now
          </span>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/passenger/map">
            <MapPin className="mr-1 h-4 w-4" />
            Open Map
          </Link>
        </Button>
      </div>

      {/* Stats - Simple and clear */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Bookmark className="h-8 w-8 text-primary" />
            <p className="mt-2 text-2xl font-bold text-foreground">
              {savedLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : savedRoutes.length}
            </p>
            <p className="text-xs text-muted-foreground">Saved Routes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Bus className="h-8 w-8 text-chart-1" />
            <p className="mt-2 text-2xl font-bold text-foreground">{liveCount}</p>
            <p className="text-xs text-muted-foreground">Vehicles Live</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-accent" />
            <p className="mt-2 text-2xl font-bold text-foreground">{reports.length}</p>
            <p className="text-xs text-muted-foreground">My Reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Clock className="h-8 w-8 text-chart-4" />
            <p className="mt-2 text-2xl font-bold text-foreground">{pendingReports}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Saved Routes - Quick access */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="font-display text-lg">My Routes</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/passenger/saved" className="flex items-center gap-1">
              See All <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {savedLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : savedRoutes.length > 0 ? (
            <div className="flex flex-col gap-2">
              {savedRoutes.slice(0, 4).map((sr) => (
                <Link
                  key={sr.id}
                  href={`/routes/${sr.route.id}`}
                  className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted"
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: sr.route.color }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{sr.route.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {sr.route.origin} → {sr.route.destination}
                    </p>
                  </div>
                  <Badge variant="secondary">{sr.route._count.vehicles} vehicles</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-3 text-base text-muted-foreground">No saved routes</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Save your regular routes for quick access
              </p>
              <Button className="mt-4" variant="outline" asChild>
                <Link href="/dashboard/passenger/routes">Browse Routes</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions - Big touch targets */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto flex-col gap-3 p-6 bg-transparent"
          asChild
        >
          <Link href="/dashboard/passenger/map">
            <MapPin className="h-10 w-10 text-primary" />
            <div className="text-center">
              <p className="font-semibold">Live Map</p>
              <p className="text-xs text-muted-foreground">See all vehicles</p>
            </div>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-3 p-6 bg-transparent"
          asChild
        >
          <Link href="/dashboard/passenger/routes">
            <Route className="h-10 w-10 text-chart-1" />
            <div className="text-center">
              <p className="font-semibold">Find Route</p>
              <p className="text-xs text-muted-foreground">Search routes</p>
            </div>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-3 p-6 bg-transparent"
          asChild
        >
          <Link href="/dashboard/passenger/saved">
            <Bookmark className="h-10 w-10 text-accent" />
            <div className="text-center">
              <p className="font-semibold">Saved</p>
              <p className="text-xs text-muted-foreground">My routes</p>
            </div>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-3 p-6 bg-transparent"
          asChild
        >
          <Link href="/dashboard/passenger/reports">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="text-center">
              <p className="font-semibold">Report</p>
              <p className="text-xs text-muted-foreground">Safety issue</p>
            </div>
          </Link>
        </Button>
      </div>
    </div>
  )
}
