"use client"

import { useState } from "react"
import { useVehicles } from "@/hooks/use-data"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Bus, Search, Loader2, Star, Navigation } from "lucide-react"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"

export default function AdminVehiclesPage() {
  const [search, setSearch] = useState("")
  const [type, setType] = useState("all")
  const { data, isLoading } = useVehicles({
    query: search || undefined,
    type: type !== "all" ? type : undefined,
    limit: 50,
  })
  const vehicles = data?.vehicles || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Vehicle Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View all registered vehicles on the platform.
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
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
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
                    {vehicle.isActive ? (
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        <span className="text-xs text-primary">Active</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Inactive</span>
                    )}
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
