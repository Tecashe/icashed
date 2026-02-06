"use client"

import { useMyVehicles } from "@/hooks/use-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bus, Navigation, Star, Loader2, Plus } from "lucide-react"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import Link from "next/link"

export default function DriverVehiclesPage() {
  const { data, isLoading } = useMyVehicles()
  const vehicles = data?.vehicles || []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            My Vehicles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your registered vehicles.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/driver/register">
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : vehicles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Bus className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-display text-base font-semibold text-foreground">
                        {vehicle.plateNumber}
                      </p>
                      {vehicle.nickname && (
                        <p className="text-xs text-muted-foreground">
                          {vehicle.nickname}
                        </p>
                      )}
                    </div>
                  </div>
                  {vehicle.isActive ? (
                    <Badge className="bg-primary/10 text-primary">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {VEHICLE_TYPE_LABELS[vehicle.type] || vehicle.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {vehicle.capacity} seats
                  </Badge>
                  {vehicle.routes.map((vr) => (
                    <Badge key={vr.id} variant="outline" className="text-xs">
                      {vr.route.name}
                    </Badge>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted p-2">
                    <Star className="mx-auto h-3.5 w-3.5 fill-accent text-accent" />
                    <p className="mt-1 text-xs font-semibold text-foreground">
                      {vehicle.rating}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <Navigation className="mx-auto h-3.5 w-3.5 text-primary" />
                    <p className="mt-1 text-xs font-semibold text-foreground">
                      {vehicle.totalTrips}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-2">
                    <Bus className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                    <p className="mt-1 text-xs font-semibold text-foreground">
                      {vehicle.positions.length > 0 ? (
                        <span>
                          {vehicle.positions[0].speed} km/h
                        </span>
                      ) : (
                        "--"
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <Bus className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No vehicles registered
          </p>
          <Button variant="outline" size="sm" className="mt-3 bg-transparent" asChild>
            <Link href="/dashboard/driver/register">
              Register Your First Vehicle
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
