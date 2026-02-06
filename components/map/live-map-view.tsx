"use client"

import { useState, useMemo, useCallback, Suspense } from "react"
import dynamic from "next/dynamic"
import {
  MapPin,
  Navigation,
  Bus,
  Layers,
  X,
  Clock,
  Route,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLivePositions, useRoutes, type LivePosition } from "@/hooks/use-data"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { MapVehicle, MapRoute } from "@/components/map/leaflet-map"

// Dynamic import for Leaflet (SSR-incompatible)
const LeafletMap = dynamic(
  () => import("@/components/map/leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

export function LiveMapView() {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<LivePosition | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)

  const { data: positionsData, isLoading: posLoading } = useLivePositions()
  const { data: routesData } = useRoutes({ limit: 100 })

  const routes = routesData?.routes || []
  const allPositions = positionsData?.positions || []

  const activeVehicles = useMemo(() => {
    if (!selectedRouteId) return allPositions
    return allPositions.filter((p) =>
      p.routes.some((r) => r.id === selectedRouteId)
    )
  }, [selectedRouteId, allPositions])

  // Transform data for the Leaflet map component
  const mapVehicles: MapVehicle[] = useMemo(() => {
    return activeVehicles.map((v) => ({
      id: v.vehicleId,
      plateNumber: v.plateNumber,
      nickname: v.nickname,
      type: v.type,
      lat: v.position.latitude,
      lng: v.position.longitude,
      speed: v.position.speed,
      heading: v.position.heading,
      color: v.routes[0]?.color || "#10B981",
      routeName: v.routes.map((r) => r.name).join(", "),
    }))
  }, [activeVehicles])

  const mapRoutes: MapRoute[] = useMemo(() => {
    const filteredRoutes = selectedRouteId
      ? routes.filter((r) => r.id === selectedRouteId)
      : routes

    return filteredRoutes.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      stages: r.stages.map((s) => ({
        name: s.name,
        lat: s.latitude,
        lng: s.longitude,
        isTerminal: s.isTerminal,
      })),
    }))
  }, [routes, selectedRouteId])

  const handleVehicleClick = useCallback(
    (mv: MapVehicle) => {
      const lp = allPositions.find((p) => p.vehicleId === mv.id)
      if (lp) setSelectedVehicle(lp)
    },
    [allPositions]
  )

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <div className="absolute left-0 top-0 z-20 flex h-full w-80 flex-col border-r border-border bg-card shadow-xl lg:relative lg:shadow-none">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-foreground">
              Routes & Vehicles
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 lg:hidden"
              onClick={() => setShowSidebar(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3">
              {/* Route Selector */}
              <div className="mb-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Filter by Route
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedRouteId(null)}
                  className={cn(
                    "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    !selectedRouteId
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  All Routes
                  <span className="ml-auto text-xs">{allPositions.length}</span>
                </button>
                {routes.map((route) => {
                  const count = allPositions.filter((p) =>
                    p.routes.some((r) => r.id === route.id)
                  ).length
                  return (
                    <button
                      type="button"
                      key={route.id}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={cn(
                        "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        selectedRouteId === route.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: route.color }}
                      />
                      <span className="flex-1 truncate">{route.name}</span>
                      <span className="text-xs">{count}</span>
                    </button>
                  )
                })}
              </div>

              {/* Active Vehicles List */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Active Vehicles ({activeVehicles.length})
                </p>
                {posLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {activeVehicles.map((vehicle) => (
                      <button
                        type="button"
                        key={vehicle.vehicleId}
                        onClick={() => setSelectedVehicle(vehicle)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          selectedVehicle?.vehicleId === vehicle.vehicleId
                            ? "bg-primary/10 ring-1 ring-primary/20"
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                          <Bus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium text-foreground">
                            {vehicle.plateNumber}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {vehicle.routes.map((r) => r.name).join(", ")}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Navigation className="h-3 w-3" />
                          {Math.round(vehicle.position.speed)}
                        </span>
                      </button>
                    ))}
                    {activeVehicles.length === 0 && !posLoading && (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        No active vehicles
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Map Area */}
      <div className="relative flex-1">
        {!showSidebar && (
          <Button
            variant="outline"
            size="sm"
            className="absolute left-3 top-3 z-30 gap-2 bg-card shadow-lg lg:hidden"
            onClick={() => setShowSidebar(true)}
          >
            <Layers className="h-4 w-4" />
            Routes
          </Button>
        )}

        {/* Real Leaflet Map */}
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-muted/30">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <LeafletMap
            vehicles={mapVehicles}
            routes={mapRoutes}
            selectedVehicleId={selectedVehicle?.vehicleId}
            onVehicleClick={handleVehicleClick}
            showRouteLines={true}
          />
        </Suspense>

        {/* Selected Vehicle Panel */}
        {selectedVehicle && (
          <div className="absolute bottom-4 left-4 right-4 z-20 rounded-2xl border border-border bg-card p-4 shadow-xl md:left-auto md:right-4 md:w-80">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Bus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-foreground">
                    {selectedVehicle.plateNumber}
                  </p>
                  {selectedVehicle.nickname && (
                    <p className="text-xs text-muted-foreground">
                      {selectedVehicle.nickname}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedVehicle(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {VEHICLE_TYPE_LABELS[selectedVehicle.type] || selectedVehicle.type}
              </Badge>
              {selectedVehicle.isPremium && (
                <Badge className="bg-accent text-accent-foreground hover:bg-accent text-xs">
                  Premium
                </Badge>
              )}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted p-2">
                <Navigation className="mx-auto h-3.5 w-3.5 text-primary" />
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  {Math.round(selectedVehicle.position.speed)} km/h
                </p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <MapPin className="mx-auto h-3.5 w-3.5 text-accent" />
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  {selectedVehicle.position.latitude.toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <Clock className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  {new Date(selectedVehicle.position.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Route className="h-3 w-3" />
                Routes
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedVehicle.routes.map((route) => (
                  <span
                    key={route.id}
                    className="rounded-md px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                    style={{ backgroundColor: `${route.color}20`, color: route.color }}
                  >
                    {route.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Indicator */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 shadow-lg backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-xs font-medium text-foreground">
            {activeVehicles.length} vehicles live
          </span>
        </div>
      </div>
    </div>
  )
}
