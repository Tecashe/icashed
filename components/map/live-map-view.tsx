"use client"

import { useState, useMemo, useCallback, Suspense, useRef } from "react"
import dynamic from "next/dynamic"
import {
  Layers,
  Loader2,
  Wifi,
  WifiOff,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRealtimePositions } from "@/hooks/use-realtime-positions"
import { useRoutes, type LivePosition } from "@/hooks/use-data"
import { useVehicleProgress, type RouteWithStages } from "@/hooks/use-vehicle-progress"
import { ApproachingVehicleBadge } from "@/components/passenger/approaching-vehicle-alert"
import { MapFAB } from "@/components/map/map-fab"
import { VehicleSheet } from "@/components/map/vehicle-sheet"
import { RouteBottomSheet } from "@/components/map/route-bottom-sheet"
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

interface LiveMapViewProps {
  isFullScreen?: boolean
  onToggleFullScreen?: () => void
}

export function LiveMapView({ isFullScreen = false, onToggleFullScreen }: LiveMapViewProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<LivePosition | null>(null)
  const [showRouteSheet, setShowRouteSheet] = useState(false)
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(true)
  const mapRef = useRef<{ flyTo?: (lat: number, lng: number, zoom?: number) => void }>(null)

  // Real-time data
  const { positions: allPositions, isRealtime, connectionState } = useRealtimePositions()
  const { data: routesData } = useRoutes({ limit: 100 })
  const routes = routesData?.routes || []

  // Filter vehicles by selected route
  const activeVehicles = useMemo(() => {
    if (!selectedRouteId) return allPositions
    return allPositions.filter((p) =>
      p.routes.some((r) => r.id === selectedRouteId)
    )
  }, [selectedRouteId, allPositions])

  // Calculate vehicles per route for the route sheet
  const vehiclesPerRoute = useMemo(() => {
    const map = new Map<string, number>()
    routes.forEach((route) => {
      const count = allPositions.filter((p) =>
        p.routes.some((r) => r.id === route.id)
      ).length
      map.set(route.id, count)
    })
    return map
  }, [routes, allPositions])

  // Vehicle progress calculation
  const selectedVehicleRoutes = useMemo((): RouteWithStages[] => {
    if (!selectedVehicle) return []
    return selectedVehicle.routes.map(vr => {
      const routeData = routes.find(r => r.id === vr.id)
      return {
        id: vr.id,
        name: vr.name,
        color: vr.color,
        stages: routeData?.stages?.map(s => ({
          id: s.id,
          name: s.name,
          latitude: s.latitude,
          longitude: s.longitude,
          order: s.order,
          isTerminal: s.isTerminal,
        })) || [],
      }
    }).filter(r => r.stages.length > 0)
  }, [selectedVehicle, routes])

  const selectedVehiclePosition = selectedVehicle ? {
    latitude: selectedVehicle.position.latitude,
    longitude: selectedVehicle.position.longitude,
  } : null

  const vehicleProgress = useVehicleProgress(
    selectedVehiclePosition,
    selectedVehicleRoutes,
    selectedVehicle?.type || "MATATU"
  )

  // Transform data for Leaflet
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
      isActive: r.id === selectedRouteId,
      stages: r.stages.map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.latitude,
        lng: s.longitude,
        isTerminal: s.isTerminal,
        order: s.order,
      })),
    }))
  }, [routes, selectedRouteId])

  // Handlers
  const handleVehicleClick = useCallback(
    (mv: MapVehicle) => {
      const lp = allPositions.find((p) => p.vehicleId === mv.id)
      if (lp) {
        setSelectedVehicle(lp)
      }
    },
    [allPositions]
  )

  const closeVehiclePanel = () => {
    setSelectedVehicle(null)
  }

  const handleCenterUser = (lat: number, lng: number) => {
    // This will be passed to LeafletMap for centering
    // For now, we can trigger a fly-to animation
    console.log("Center on user:", lat, lng)
  }

  // Get selected route name for display
  const selectedRouteName = selectedRouteId
    ? routes.find(r => r.id === selectedRouteId)?.name || "Selected Route"
    : "All Routes"

  return (
    <div className={cn(
      "relative flex w-full overflow-hidden bg-background",
      isFullScreen ? "h-screen" : "h-[calc(100vh-4rem)]"
    )}>
      {/* ─── Desktop Sidebar ─────────────────────────────────────── */}
      {showDesktopSidebar && (
        <div className="hidden lg:flex w-80 flex-col border-r border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-sm font-semibold text-foreground">
              Routes & Vehicles
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDesktopSidebar(false)}
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {/* Route Filter */}
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
                <span className="ml-auto text-xs">{allPositions.length}</span>
              </button>
              {routes.map((route) => {
                const count = vehiclesPerRoute.get(route.id) || 0
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
                    <span className="text-xs">{count}</span>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ─── Map Area ───────────────────────────────────────────── */}
      <div className="relative flex-1">
        {/* Top Controls - Clean, minimal */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          {/* Route Filter Pill (Mobile) */}
          <Button
            variant="secondary"
            size="sm"
            className="pointer-events-auto gap-2 rounded-full bg-card/95 shadow-lg backdrop-blur-sm hover:bg-card border border-border lg:hidden h-11 px-4"
            onClick={() => setShowRouteSheet(true)}
          >
            <Layers className="h-4 w-4" />
            <span className="max-w-[120px] truncate">{selectedRouteName}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>

          {/* Show sidebar button (Desktop, when hidden) */}
          {!showDesktopSidebar && (
            <Button
              variant="secondary"
              size="sm"
              className="pointer-events-auto hidden lg:flex gap-2 rounded-full bg-card/95 shadow-lg backdrop-blur-sm hover:bg-card border border-border h-11 px-4"
              onClick={() => setShowDesktopSidebar(true)}
            >
              <Layers className="h-4 w-4" />
              Routes
            </Button>
          )}

          {/* Connection Status */}
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-sm border border-border">
            {connectionState === "connected" ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <Wifi className="h-3.5 w-3.5 text-primary" />
              </>
            ) : connectionState === "connecting" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
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
        </div>

        {/* Approaching Vehicle Alert */}
        {selectedRouteId && (
          <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2">
            <ApproachingVehicleBadge
              routeId={selectedRouteId}
              onVehicleClick={(vehicleId) => {
                const lp = allPositions.find((p) => p.vehicleId === vehicleId)
                if (lp) {
                  setSelectedVehicle(lp)
                }
              }}
            />
          </div>
        )}

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
            selectedRouteId={selectedRouteId}
            onVehicleClick={handleVehicleClick}
            showRouteLines={true}
            enableAnimation={true}
            highlightActiveRoute={true}
          />
        </Suspense>

        {/* FAB Controls (Mobile) */}
        <div className="absolute bottom-6 right-4 z-20 md:hidden">
          <MapFAB
            onCenterUser={handleCenterUser}
            onToggleFullScreen={onToggleFullScreen}
            onSearchRoutes={() => setShowRouteSheet(true)}
            isFullScreen={isFullScreen}
          />
        </div>

        {/* FAB Controls (Desktop) */}
        <div className="absolute bottom-6 right-4 z-20 hidden md:block">
          <MapFAB
            onCenterUser={handleCenterUser}
            onToggleFullScreen={onToggleFullScreen}
            onSearchRoutes={() => {
              if (!showDesktopSidebar) setShowDesktopSidebar(true)
            }}
            isFullScreen={isFullScreen}
          />
        </div>

        {/* Desktop Vehicle Panel */}
        {selectedVehicle && (
          <div className="absolute bottom-6 left-4 z-20 hidden md:block w-80 max-h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <DesktopVehiclePanel
              vehicle={selectedVehicle}
              progress={vehicleProgress}
              routes={routes}
              onClose={closeVehiclePanel}
            />
          </div>
        )}
      </div>

      {/* ─── Mobile Sheets ───────────────────────────────────────── */}

      {/* Vehicle Sheet (3-state) */}
      <VehicleSheet
        vehicle={selectedVehicle}
        progress={vehicleProgress}
        onClose={closeVehiclePanel}
      />

      {/* Route Selection Sheet */}
      <RouteBottomSheet
        isOpen={showRouteSheet}
        onClose={() => setShowRouteSheet(false)}
        routes={routes}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        vehiclesPerRoute={vehiclesPerRoute}
      />
    </div>
  )
}

// ─── Desktop Vehicle Panel (simplified) ─────────────────────────────
import {
  Bus,
  Navigation,
  Timer,
  X,
  Star,
  MessageSquare,
  Target,
  Route,
  Clock,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { ReviewForm } from "@/components/reviews/review-form"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import type { RouteData } from "@/hooks/use-data"

interface DesktopVehiclePanelProps {
  vehicle: LivePosition
  progress: ReturnType<typeof useVehicleProgress>
  routes: RouteData[]
  onClose: () => void
}

function DesktopVehiclePanel({ vehicle, progress, routes, onClose }: DesktopVehiclePanelProps) {
  const [showReviewForm, setShowReviewForm] = useState(false)

  const { data: reviewsData } = useSWR(
    `/api/reviews?vehicleId=${vehicle.vehicleId}&limit=5`,
    fetcher
  )
  const recentReviews = reviewsData?.reviews || []
  const avgRating = recentReviews.length > 0
    ? recentReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / recentReviews.length
    : null

  const routeColor = vehicle.routes[0]?.color || "#10B981"

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: routeColor }}
          >
            <Bus className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-foreground">
              {vehicle.plateNumber}
            </p>
            <div className="flex items-center gap-2">
              {vehicle.nickname && (
                <p className="text-sm text-muted-foreground">{vehicle.nickname}</p>
              )}
              {avgRating && (
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="text-xs font-medium">{avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {VEHICLE_TYPE_LABELS[vehicle.type as keyof typeof VEHICLE_TYPE_LABELS] || vehicle.type}
        </Badge>
        {vehicle.isPremium && (
          <Badge className="bg-accent text-accent-foreground text-xs">Premium</Badge>
        )}
        {progress?.isOnRoute && (
          <Badge variant="outline" className="gap-1 text-xs text-primary border-primary/30">
            <Target className="h-3 w-3" />
            On Route
          </Badge>
        )}
      </div>

      {/* Progress */}
      {progress && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Progress</span>
            <span className="text-sm font-bold" style={{ color: routeColor }}>
              {Math.round(progress.progress)}%
            </span>
          </div>
          <Progress value={progress.progress} className="h-2" />
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{progress.formattedDistance} left</span>
            <span>ETA: {progress.formattedETA}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center rounded-xl bg-muted p-3">
          <Navigation className="h-5 w-5 text-primary" />
          <p className="mt-1 text-lg font-bold text-foreground">
            {Math.round(vehicle.position.speed)}
          </p>
          <p className="text-[10px] text-muted-foreground">km/h</p>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-muted p-3">
          <Timer className="h-5 w-5 text-accent" />
          <p className="mt-1 text-lg font-bold text-foreground">
            {progress?.formattedETA || "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">ETA</p>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-muted p-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <p className="mt-1 text-lg font-bold text-foreground">
            {new Date(vehicle.position.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p className="text-[10px] text-muted-foreground">updated</p>
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

      {/* Rate Button */}
      <Button
        variant="outline"
        className="mt-4 w-full gap-2"
        onClick={() => setShowReviewForm(true)}
      >
        <MessageSquare className="h-4 w-4" />
        Rate Vehicle
      </Button>

      <ReviewForm
        vehicleId={vehicle.vehicleId}
        plateNumber={vehicle.plateNumber}
        isOpen={showReviewForm}
        onClose={() => setShowReviewForm(false)}
      />
    </div>
  )
}
