"use client"

import { useAuth } from "@/lib/auth-context"
import { useSavedRoutes, useLivePositions, useMyReports } from "@/hooks/use-data"
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
} from "lucide-react"
import Link from "next/link"

export default function PassengerDashboardPage() {
  const { user } = useAuth()
  const { data: savedData, isLoading: savedLoading } = useSavedRoutes()
  const { data: positionsData } = useLivePositions()
  const { data: reportsData } = useMyReports()

  const savedRoutes = savedData?.savedRoutes || []
  const liveCount = positionsData?.positions?.length || 0
  const reports = reportsData?.reports || []
  const pendingReports = reports.filter((r) => r.status === "PENDING").length

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Welcome back, {user?.name?.split(" ")[0] || "Commuter"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your routes and stay informed about your daily commute.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Bookmark className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {savedLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  savedRoutes.length
                )}
              </p>
              <p className="text-xs text-muted-foreground">Saved Routes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-1/10">
              <Navigation className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{liveCount}</p>
              <p className="text-xs text-muted-foreground">Vehicles Live</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <AlertTriangle className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {reports.length}
              </p>
              <p className="text-xs text-muted-foreground">My Reports</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10">
              <Route className="h-5 w-5 text-chart-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {pendingReports}
              </p>
              <p className="text-xs text-muted-foreground">Pending Reports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Saved Routes + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Saved Routes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="font-display text-base">
              Saved Routes
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link
                href="/dashboard/passenger/saved"
                className="flex items-center gap-1 text-xs"
              >
                View All <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {savedLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedRoutes.length > 0 ? (
              <div className="flex flex-col gap-2">
                {savedRoutes.slice(0, 5).map((sr) => (
                  <Link
                    key={sr.id}
                    href={`/routes/${sr.route.id}`}
                    className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: sr.route.color }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {sr.route.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sr.route.origin} to {sr.route.destination}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {sr.route._count.vehicles} vehicles
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <Bookmark className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No saved routes yet
                </p>
                <Button variant="outline" size="sm" className="mt-3 bg-transparent" asChild>
                  <Link href="/dashboard/passenger/routes">
                    Browse Routes
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4 bg-transparent"
              asChild
            >
              <Link href="/dashboard/passenger/map">
                <MapPin className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Open Live Map</p>
                  <p className="text-xs text-muted-foreground">
                    See vehicles moving in real time
                  </p>
                </div>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4 bg-transparent"
              asChild
            >
              <Link href="/dashboard/passenger/routes">
                <Route className="h-5 w-5 text-chart-1" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Find a Route</p>
                  <p className="text-xs text-muted-foreground">
                    Search and save your commuter routes
                  </p>
                </div>
              </Link>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4 bg-transparent"
              asChild
            >
              <Link href="/dashboard/passenger/reports">
                <AlertTriangle className="h-5 w-5 text-accent" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Report an Issue</p>
                  <p className="text-xs text-muted-foreground">
                    Safety concern or route problem
                  </p>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
