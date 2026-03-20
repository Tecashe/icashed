"use client"

import { useMyVehicles } from "@/hooks/use-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Bus,
  Navigation,
  Star,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Gauge,
  Radio,
} from "lucide-react"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { toast } from "sonner"

export default function DriverVehiclesPage() {
  const { data, isLoading, mutate } = useMyVehicles()
  const vehicles = data?.vehicles || []
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleToggleLive = async (vehicleId: string, currentlyActive: boolean) => {
    setTogglingId(vehicleId)
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentlyActive }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to toggle")
      }

      const vehicle = vehicles.find(v => v.id === vehicleId)
      if (!currentlyActive) {
        toast.success(`${vehicle?.plateNumber} is now LIVE 🟢`, {
          description: "Other vehicles have been set offline.",
        })
      } else {
        toast.info(`${vehicle?.plateNumber} is now offline`)
      }

      mutate()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to toggle vehicle"
      toast.error(message)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (vehicleId: string) => {
    setDeletingId(vehicleId)
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, { method: "DELETE" })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to delete")
      }

      const result = await res.json()
      toast.success(`${result.plateNumber} has been removed`)
      mutate()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete vehicle"
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            My Vehicles
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your fleet &middot; Only 1 vehicle can be live at a time
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
          {vehicles.map((vehicle) => {
            const isToggling = togglingId === vehicle.id
            const isDeleting = deletingId === vehicle.id

            return (
              <Card
                key={vehicle.id}
                className={cn(
                  "overflow-hidden transition-all",
                  vehicle.isActive && "ring-2 ring-primary/50 shadow-lg shadow-primary/10"
                )}
              >
                <CardContent className="p-0">
                  <div className="p-4">
                    {/* Row 1: Vehicle Info + Live Toggle */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                          vehicle.isActive
                            ? "bg-primary/20"
                            : "bg-primary/10"
                        )}>
                          {vehicle.isActive ? (
                            <Radio className="h-6 w-6 text-primary animate-pulse" />
                          ) : (
                            <Bus className="h-6 w-6 text-primary" />
                          )}
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

                      {/* Live Toggle */}
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-semibold",
                            vehicle.isActive ? "text-primary" : "text-muted-foreground"
                          )}>
                            {vehicle.isActive ? "LIVE" : "OFF"}
                          </span>
                          <Switch
                            checked={vehicle.isActive}
                            onCheckedChange={() => handleToggleLive(vehicle.id, vehicle.isActive)}
                            disabled={isToggling || isDeleting}
                          />
                        </div>
                        {isToggling && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Row 2: Badges */}
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

                    {/* Row 3: Stats */}
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

                    {/* Row 4: Action Buttons */}
                    <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                      >
                        <Link href={`/dashboard/driver/vehicles/${vehicle.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>

                      <Button
                        asChild
                        variant={vehicle.isActive ? "default" : "outline"}
                        size="sm"
                        className="flex-1 gap-1.5"
                      >
                        <Link href="/dashboard/driver/tracking">
                          <Navigation className="h-3.5 w-3.5" />
                          {vehicle.isActive ? "Track" : "Start"}
                        </Link>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {vehicle.plateNumber}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this vehicle and all its data
                              including images, trip history, and reviews. This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(vehicle.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Vehicle
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
