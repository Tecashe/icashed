"use client"

import { useParams } from "next/navigation"
import { useRoute, useVehicles } from "@/hooks/use-data"
import { RouteDetailView } from "@/components/routes/route-detail-view"
import { Loader2 } from "lucide-react"

export default function RouteDetailPage() {
  const params = useParams<{ id: string }>()
  const { data: routeData, isLoading: routeLoading, error: routeError } = useRoute(params.id)
  const { data: vehiclesData } = useVehicles({ routeId: params.id, limit: 50 })

  if (routeLoading) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (routeError || !routeData?.route) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-lg font-semibold text-foreground">Route not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This route may have been removed or the database is not connected.
        </p>
      </div>
    )
  }

  const route = routeData.route
  const vehicles = (vehiclesData?.vehicles || []).map((v) => ({
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
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-12">
      <RouteDetailView
        route={{
          id: route.id,
          name: route.name,
          code: route.code,
          description: route.description,
          origin: route.origin,
          destination: route.destination,
          county: route.county,
          isActive: route.isActive,
          color: route.color,
          vehicleCount: route._count.vehicles,
          stages: route.stages.map((s) => ({
            name: s.name,
            lat: s.latitude,
            lng: s.longitude,
            order: s.order,
            isTerminal: s.isTerminal,
          })),
        }}
        vehicles={vehicles}
      />
    </div>
  )
}
