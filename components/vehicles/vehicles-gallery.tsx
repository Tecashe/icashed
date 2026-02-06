"use client"

import { useState } from "react"
import { useVehicles } from "@/hooks/use-data"
import { VehicleCard } from "@/components/vehicles/vehicle-card"
import { VehicleFilters } from "@/components/vehicles/vehicle-filters"
import { Bus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function VehiclesGallery() {
  const [search, setSearch] = useState("")
  const [type, setType] = useState("all")
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useVehicles({
    query: search || undefined,
    type: type !== "all" ? type : undefined,
    page,
    limit: 12,
  })

  const vehicles = data?.vehicles || []
  const pagination = data?.pagination

  return (
    <div className="flex flex-col gap-6">
      <VehicleFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        type={type}
        onTypeChange={(v) => {
          setType(v)
          setPage(1)
        }}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/30 py-16">
          <p className="text-sm font-medium text-destructive">
            Failed to load vehicles
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Make sure your database is connected and seeded.
          </p>
        </div>
      ) : vehicles.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                id={vehicle.id}
                plateNumber={vehicle.plateNumber}
                nickname={vehicle.nickname}
                type={vehicle.type}
                capacity={vehicle.capacity}
                isActive={vehicle.isActive}
                isPremium={vehicle.isPremium}
                rating={vehicle.rating}
                totalTrips={vehicle.totalTrips}
                routes={vehicle.routes.map((r) => r.route.name)}
                position={
                  vehicle.positions[0]
                    ? {
                        lat: vehicle.positions[0].latitude,
                        lng: vehicle.positions[0].longitude,
                        speed: vehicle.positions[0].speed,
                        heading: vehicle.positions[0].heading,
                      }
                    : null
                }
              />
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="bg-transparent"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="bg-transparent"
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <Bus className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No vehicles found
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Try adjusting your search or filter
          </p>
        </div>
      )}
    </div>
  )
}
