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
  Wifi,
  WifiOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRealtimePositions } from "@/hooks/use-realtime-positions"
import { useRoutes, type LivePosition } from "@/hooks/use-data"
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
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false)

  // Use real-time positions instead of polling
  const { positions: allPositions, isRealtime, connectionState } = useRealtimePositions()
  const { data: routesData } = useRoutes({ limit: 100 })

  const routes = routesData?.routes || []

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
      isLive: isRealtime,
    }))
  }, [activeVehicles, isRealtime])

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
      if (lp) {
        setSelectedVehicle(lp)
        setMobileSheetExpanded(true)
      }
    },
    [allPositions]
  )

  const closeVehiclePanel = () => {
    setSelectedVehicle(null)
    setMobileSheetExpanded(false)
  }

  return (
    <div className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden">
      {/* ─── Desktop Sidebar ───────────────────────────────────── */}
      {showSidebar && (
        <div className="absolute left-0 top-0 z-20 hidden h-full w-80 flex-col border-r border-border bg-card shadow-xl lg:relative lg:flex lg:shadow-none">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-foreground">
              Routes & Vehicles
            </h2>
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
                    "mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    !selectedRouteId
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Layers className="h-4 w-4" />
                  All Routes
                  <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {allPositions.length}
                  </span>
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
                        "mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                        selectedRouteId === route.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: route.color }}
                      />
                      <span className="flex-1 truncate">{route.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Active Vehicles List */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Active Vehicles ({activeVehicles.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {activeVehicles.map((vehicle) => (
                    <button
                      type="button"
                      key={vehicle.vehicleId}
                      onClick={() => {
                        setSelectedVehicle(vehicle)
                        setMobileSheetExpanded(true)
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                        selectedVehicle?.vehicleId === vehicle.vehicleId
                          ? "bg-primary/10 ring-1 ring-primary/20"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                        <Bus className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {vehicle.plateNumber}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {vehicle.routes.map((r) => r.name).join(", ")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                          <Navigation className="h-3 w-3 text-primary" />
                          {Math.round(vehicle.position.speed)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">km/h</span>
                      </div>
                    </button>
                  ))}
                  {activeVehicles.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No active vehicles
                    </p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ─── Map Area ──────────────────────────────────────────── */}
      <div className="relative flex-1">
        {/* Mobile Route Filter Button */}
        <Button
          variant="outline"
          size="sm"
          className="absolute left-3 top-3 z-30 gap-2 bg-card/95 shadow-lg backdrop-blur-sm lg:hidden"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          <Layers className="h-4 w-4" />
          Routes
        </Button>

        {/* Connection Status Indicator */}
        <div className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded-full bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          {connectionState === "connected" ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <Wifi className="h-3.5 w-3.5 text-primary" />
            </>
          ) : connectionState === "connecting" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
              <WifiOff className="h-3.5 w-3.5 text-destructive" />
            </>
          )}
          <span className="text-xs font-medium text-foreground">
            {activeVehicles.length} live
          </span>
        </div>

        {/* Leaflet Map */}
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
            enableAnimation={true}
          />
        </Suspense>

        {/* ─── Desktop Vehicle Panel ───────────────────────────── */}
        {selectedVehicle && (
          <div className="absolute bottom-4 right-4 z-20 hidden w-80 rounded-2xl border border-border bg-card p-4 shadow-xl md:block">
            <VehicleDetails vehicle={selectedVehicle} onClose={closeVehiclePanel} />
          </div>
        )}

        {/* ─── Mobile Bottom Sheet ─────────────────────────────── */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 z-30 rounded-t-3xl border-t border-border bg-card shadow-2xl transition-transform duration-300 ease-out md:hidden",
            selectedVehicle
              ? mobileSheetExpanded
                ? "translate-y-0"
                : "translate-y-[calc(100%-80px)]"
              : "translate-y-full"
          )}
        >
          {/* Sheet Handle */}
          <button
            type="button"
            onClick={() => setMobileSheetExpanded(!mobileSheetExpanded)}
            className="flex w-full items-center justify-center py-3"
          >
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </button>

          {/* Collapsed Preview */}
          {selectedVehicle && !mobileSheetExpanded && (
            <div className="flex items-center gap-3 px-4 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Bus className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {selectedVehicle.plateNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.round(selectedVehicle.position.speed)} km/h
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeVehiclePanel}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Expanded Content */}
          {selectedVehicle && mobileSheetExpanded && (
            <div className="px-4 pb-6">
              <VehicleDetails vehicle={selectedVehicle} onClose={closeVehiclePanel} />
            </div>
          )}
        </div>
      </div>

      {/* ─── Mobile Sidebar Overlay ────────────────────────────── */}
      {showSidebar && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setShowSidebar(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-80 border-r border-border bg-card lg:hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-display text-sm font-semibold text-foreground">
                Routes & Vehicles
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={() => setShowSidebar(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ScrollArea className="h-[calc(100%-56px)]">
              <div className="p-4">
                {/* Same route filter as desktop */}
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Filter by Route
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRouteId(null)
                    setShowSidebar(false)
                  }}
                  className={cn(
                    "mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm transition-colors",
                    !selectedRouteId
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Layers className="h-4 w-4" />
                  All Routes
                  <span className="ml-auto">{allPositions.length}</span>
                </button>
                {routes.map((route) => {
                  const count = allPositions.filter((p) =>
                    p.routes.some((r) => r.id === route.id)
                  ).length
                  return (
                    <button
                      type="button"
                      key={route.id}
                      onClick={() => {
                        setSelectedRouteId(route.id)
                        setShowSidebar(false)
                      }}
                      className={cn(
                        "mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm transition-colors",
                        selectedRouteId === route.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: route.color }}
                      />
                      <span className="flex-1 truncate">{route.name}</span>
                      <span>{count}</span>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Vehicle Details Component ────────────────────────────────
function VehicleDetails({
  vehicle,
  onClose,
}: {
  vehicle: LivePosition
  onClose: () => void
}) {
  return (
    <>
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
              <p className="text-sm text-muted-foreground">
                {vehicle.nickname}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {VEHICLE_TYPE_LABELS[vehicle.type as keyof typeof VEHICLE_TYPE_LABELS] || vehicle.type}
        </Badge>
        {vehicle.isPremium && (
          <Badge className="bg-accent text-accent-foreground text-xs">
            Premium
          </Badge>
        )}
      </div>

      {/* Stats Grid */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center rounded-xl bg-muted p-3">
          <Navigation className="h-5 w-5 text-primary" />
          <p className="mt-1 text-lg font-bold text-foreground">
            {Math.round(vehicle.position.speed)}
          </p>
          <p className="text-[11px] text-muted-foreground">km/h</p>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-muted p-3">
          <MapPin className="h-5 w-5 text-accent" />
          <p className="mt-1 text-lg font-bold text-foreground">
            {vehicle.position.latitude.toFixed(3)}
          </p>
          <p className="text-[11px] text-muted-foreground">lat</p>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-muted p-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <p className="mt-1 text-lg font-bold text-foreground">
            {new Date(vehicle.position.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-[11px] text-muted-foreground">updated</p>
        </div>
      </div>

      {/* Routes */}
      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Route className="h-3 w-3" />
          Routes
        </p>
        <div className="flex flex-wrap gap-1.5">
          {vehicle.routes.map((route) => (
            <span
              key={route.id}
              className="rounded-lg px-2.5 py-1 text-xs font-medium"
              style={{ backgroundColor: `${route.color}20`, color: route.color }}
            >
              {route.name}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
