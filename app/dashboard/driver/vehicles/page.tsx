"use client"

import { useMyVehicles } from "@/hooks/use-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bus, Navigation, Star, Loader2, Plus, ChevronRight, Gauge } from "lucide-react"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function DriverVehiclesPage() {
  const { data, isLoading } = useMyVehicles()
  const vehicles = data?.vehicles || []

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            My Vehicles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your fleet
          </p>
        </div>
        <Button asChild size="lg" className="h-12 gap-2 px-4">
          <Link href="/dashboard/driver/register">
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add</span>
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : vehicles.length > 0 ? (
        <div className="flex flex-col gap-3">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Main Content */}
                  <div className="flex-1 p-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Bus className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-display text-lg font-semibold text-foreground">
                              {vehicle.plateNumber}
                            </p>
                            {vehicle.isActive && (
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                              </span>
                            )}
                          </div>
                          {vehicle.nickname && (
                            <p className="text-sm text-muted-foreground">
                              {vehicle.nickname}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={vehicle.isActive ? "default" : "secondary"}
                        className={cn(
                          "shrink-0",
                          vehicle.isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                      >
                        {vehicle.isActive ? "Live" : "Offline"}
                      </Badge>
                    </div>

                    {/* Info Badges */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {VEHICLE_TYPE_LABELS[vehicle.type] || vehicle.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {vehicle.capacity} seats
                      </Badge>
                      {vehicle.routes.slice(0, 2).map((vr) => (
                        <Badge
                          key={vr.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {vr.route.name}
                        </Badge>
                      ))}
                      {vehicle.routes.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{vehicle.routes.length - 2}
                        </Badge>
                      )}
                    </div>

                    {/* Stats Row */}
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium text-foreground">
                          {vehicle.rating > 0 ? vehicle.rating.toFixed(1) : "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Navigation className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {vehicle.totalTrips} trips
                        </span>
                      </div>
                      {vehicle.positions.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Gauge className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {vehicle.positions[0].speed} km/h
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link
                    href="/dashboard/driver/tracking"
                    className={cn(
                      "flex w-16 shrink-0 flex-col items-center justify-center border-l border-border transition-colors",
                      vehicle.isActive
                        ? "bg-primary/5 text-primary hover:bg-primary/10"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Navigation className="h-5 w-5" />
                    <span className="mt-1 text-[10px] font-medium">
                      {vehicle.isActive ? "View" : "Start"}
                    </span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bus className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="mt-4 text-lg font-medium text-foreground">
              No vehicles yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Register your first vehicle to start earning
            </p>
            <Button size="lg" className="mt-6" asChild>
              <Link href="/dashboard/driver/register">
                <Plus className="mr-2 h-5 w-5" />
                Register Vehicle
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
