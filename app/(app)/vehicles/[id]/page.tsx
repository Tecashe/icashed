"use client"

import { useParams } from "next/navigation"
import { useVehicle } from "@/hooks/use-data"
import { VehicleDetailView } from "@/components/vehicles/vehicle-detail-view"
import { Loader2 } from "lucide-react"

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>()
  const { data, isLoading, error } = useVehicle(params.id)

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data?.vehicle) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-lg font-semibold text-foreground">Vehicle not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This vehicle may have been removed or the database is not connected.
        </p>
      </div>
    )
  }

  const v = data.vehicle

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-12">
      <VehicleDetailView
        vehicle={{
          id: v.id,
          plateNumber: v.plateNumber,
          nickname: v.nickname,
          type: v.type,
          capacity: v.capacity,
          isActive: v.isActive,
          isPremium: v.isPremium,
          rating: v.rating,
          totalTrips: v.totalTrips,
          routes: v.routes.map((vr) => vr.route.name),
          position: v.positions[0]
            ? {
                lat: v.positions[0].latitude,
                lng: v.positions[0].longitude,
                speed: v.positions[0].speed,
                heading: v.positions[0].heading,
              }
            : null,
        }}
      />
    </div>
  )
}
