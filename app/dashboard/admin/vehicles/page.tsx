"use client"

import { useState } from "react"
import { useVehicles } from "@/hooks/use-data"
import { apiPatch, apiDelete } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Bus, Search, Loader2, Star, Trash2 } from "lucide-react"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { toast } from "sonner"

export default function AdminVehiclesPage() {
  const [search, setSearch] = useState("")
  const [type, setType] = useState("all")
  const { data, isLoading, mutate } = useVehicles({
    query: search || undefined,
    type: type !== "all" ? type : undefined,
    limit: 50,
  })
  const vehicles = data?.vehicles || []

  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleToggleActive(vehicleId: string, currentActive: boolean) {
    setTogglingId(vehicleId)
    try {
      await apiPatch(`/api/admin/vehicles/${vehicleId}`, { isActive: !currentActive })
      mutate()
      toast.success(currentActive ? "Vehicle deactivated" : "Vehicle activated")
    } catch {
      toast.error("Failed to toggle vehicle status")
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(vehicleId: string) {
    setDeletingId(vehicleId)
    try {
      await apiDelete(`/api/admin/vehicles/${vehicleId}`)
      toast.success("Vehicle deleted")
      mutate()
    } catch (err) {
      toast.error("Failed to delete vehicle", {
        description: err instanceof Error ? err.message : "Please try again",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Vehicle Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage vehicles — toggle active status or remove.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by plate or nickname..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="MATATU">Matatu</SelectItem>
            <SelectItem value="BUS">Bus</SelectItem>
            <SelectItem value="BODA">Boda Boda</SelectItem>
            <SelectItem value="TUK_TUK">Tuk Tuk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Vehicle</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">Routes</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">Rating</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">Trips</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Active</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{vehicle.plateNumber}</p>
                      {vehicle.nickname && <p className="text-xs text-muted-foreground">{vehicle.nickname}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-xs">
                      {VEHICLE_TYPE_LABELS[vehicle.type] || vehicle.type}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {vehicle.routes.map((vr) => (
                        <Badge key={vr.id} variant="outline" className="text-[10px]">
                          {vr.route.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent text-accent" />
                      {vehicle.rating}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{vehicle.totalTrips}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={vehicle.isActive}
                      disabled={togglingId === vehicle.id}
                      onCheckedChange={() => handleToggleActive(vehicle.id, vehicle.isActive)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete <strong>{vehicle.plateNumber}</strong>? All associated data will be
                              removed. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(vehicle.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deletingId === vehicle.id}
                            >
                              {deletingId === vehicle.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vehicles.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <Bus className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No vehicles found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
