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
  Target,
  ArrowRight,
  Timer,
  CircleDot,
  CheckCircle2,
  Star,
  MessageSquare,
  Camera,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { useRealtimePositions } from "@/hooks/use-realtime-positions"
import { useRoutes, type LivePosition, type RouteData } from "@/hooks/use-data"
import { useVehicleProgress, type RouteWithStages } from "@/hooks/use-vehicle-progress"
import { ReviewForm } from "@/components/reviews/review-form"
import { VehicleImageGallery } from "@/components/vehicles/vehicle-gallery"
import { ApproachingVehicleBadge } from "@/components/passenger/approaching-vehicle-alert"
import { StageNavigator } from "@/components/passenger/stage-navigator"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { MapVehicle, MapRoute } from "@/components/map/leaflet-map"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"

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
  const [showSidebar, setShowSidebar] = useState(false) // Start closed on mobile
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false)
  const [showNavigator, setShowNavigator] = useState(false)

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

  // Find selected route data for progress calculation
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

  // Calculate progress for selected vehicle
  const selectedVehiclePosition = selectedVehicle ? {
    latitude: selectedVehicle.position.latitude,
    longitude: selectedVehicle.position.longitude,
  } : null

  const vehicleProgress = useVehicleProgress(
    selectedVehiclePosition,
    selectedVehicleRoutes,
    selectedVehicle?.type || "MATATU"
  )

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

  // Get selected route for stage timeline
  const selectedRoute = useMemo(() => {
    if (!vehicleProgress) return null
    return routes.find(r => r.id === vehicleProgress.routeId)
  }, [vehicleProgress, routes])

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
                    <span className="text-xs">{count}</span>
                  </button>
                )
              })}

              {/* Active Vehicles */}
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Active Vehicles ({activeVehicles.length})
                </p>
                <div className="space-y-1">
                  {activeVehicles.map((vehicle) => (
                    <button
                      type="button"
                      key={vehicle.vehicleId}
                      onClick={() => {
                        setSelectedVehicle(vehicle)
                        setMobileSheetExpanded(true)
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        selectedVehicle?.vehicleId === vehicle.vehicleId
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      )}
                    >
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{ backgroundColor: vehicle.routes[0]?.color || "#10B981" }}
                      >
                        <Bus className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-foreground">
                          {vehicle.plateNumber}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {vehicle.routes.map((r) => r.name).join(", ")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
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

        {/* Approaching Vehicle Alert Badge */}
        {selectedRouteId && (
          <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2">
            <ApproachingVehicleBadge
              routeId={selectedRouteId}
              onVehicleClick={(vehicleId) => {
                const lp = allPositions.find((p) => p.vehicleId === vehicleId)
                if (lp) {
                  setSelectedVehicle(lp)
                  setMobileSheetExpanded(true)
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

        {/* ─── Desktop Vehicle Panel ───────────────────────────── */}
        {selectedVehicle && (
          <div className="absolute bottom-4 right-4 z-30 hidden w-80 max-h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl md:block">
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4">
              <VehicleDetails
                vehicle={selectedVehicle}
                progress={vehicleProgress}
                route={selectedRoute}
                onClose={closeVehiclePanel}
              />
            </div>
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
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl"
                style={{ backgroundColor: selectedVehicle.routes[0]?.color || "#10B981" }}
              >
                <Bus className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {selectedVehicle.plateNumber}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {Math.round(selectedVehicle.position.speed)} km/h
                  </span>
                  {vehicleProgress && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Timer className="mr-1 h-3 w-3" />
                      {vehicleProgress.formattedETA}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={closeVehiclePanel}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Expanded Content */}
          {selectedVehicle && mobileSheetExpanded && (
            <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">
              <VehicleDetails
                vehicle={selectedVehicle}
                progress={vehicleProgress}
                route={selectedRoute}
                onClose={closeVehiclePanel}
              />
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

// ─── Vehicle Details Component with Progress Tracking ─────────
interface VehicleDetailsProps {
  vehicle: LivePosition
  progress: ReturnType<typeof useVehicleProgress>
  route: RouteData | null | undefined
  onClose: () => void
}

function VehicleDetails({ vehicle, progress, route, onClose }: VehicleDetailsProps) {
  const [showReviewForm, setShowReviewForm] = useState(false)

  // Fetch vehicle rating
  const { data: reviewsData } = useSWR(
    `/api/reviews?vehicleId=${vehicle.vehicleId}&limit=5`,
    fetcher
  )
  const recentReviews = reviewsData?.reviews || []
  const avgRating = recentReviews.length > 0
    ? recentReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / recentReviews.length
    : null

  return (
    <>
      {/* Vehicle Images */}
      <div className="mb-4">
        <VehicleImageGallery vehicleId={vehicle.vehicleId} />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: vehicle.routes[0]?.color || "#10B981" }}
          >
            <Bus className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-display text-base font-semibold text-foreground">
              {vehicle.plateNumber}
            </p>
            <div className="flex items-center gap-2">
              {vehicle.nickname && (
                <p className="text-sm text-muted-foreground">
                  {vehicle.nickname}
                </p>
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
          <Badge className="bg-accent text-accent-foreground text-xs">
            Premium
          </Badge>
        )}
        {progress?.isOnRoute && (
          <Badge variant="outline" className="gap-1 text-xs text-primary border-primary/30">
            <Target className="h-3 w-3" />
            On Route
          </Badge>
        )}
      </div>

      {/* Progress Section */}
      {progress && (
        <div className="mt-4 space-y-3">
          {/* Route Progress Bar */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Route Progress
              </span>
              <span className="text-sm font-bold" style={{ color: progress.routeColor }}>
                {Math.round(progress.progress)}%
              </span>
            </div>
            <Progress value={progress.progress} className="h-2" />
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{progress.routeName.split('-')[0]?.trim()}</span>
              <span>{progress.routeName.split('-')[1]?.trim()}</span>
            </div>
          </div>

          {/* Next Stage & ETA */}
          <div className="grid grid-cols-2 gap-2">
            {progress.nextStage && (
              <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/30 p-3">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Next Stop
                </span>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {progress.nextStage.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {progress.distanceToNextStage.toFixed(1)} km away
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/30 p-3">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                ETA to Terminus
              </span>
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-accent" />
                <span className="text-lg font-bold text-foreground">
                  {progress.formattedETA}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {progress.formattedDistance} remaining
              </span>
            </div>
          </div>
        </div>
      )}

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

      {/* Stage Timeline (when we have progress and route data) */}
      {progress && route && route.stages.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Route className="h-3 w-3" />
            Stage Timeline ({progress.stagesRemaining} remaining)
          </p>
          <div className="max-h-32 overflow-y-auto rounded-xl border border-border bg-muted/20 p-2">
            <div className="space-y-0">
              {route.stages.slice(0, 8).map((stage, index) => {
                const isPassed = index <= progress.currentStageIndex
                const isCurrent = index === progress.currentStageIndex
                const isNext = index === progress.currentStageIndex + 1

                return (
                  <div
                    key={stage.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                      isCurrent && "bg-primary/10",
                      isNext && "bg-accent/10"
                    )}
                  >
                    <div className="relative">
                      {isPassed ? (
                        <CheckCircle2
                          className="h-4 w-4"
                          style={{ color: progress.routeColor }}
                        />
                      ) : isNext ? (
                        <Target className="h-4 w-4 text-accent animate-pulse" />
                      ) : (
                        <CircleDot className="h-4 w-4 text-muted-foreground/50" />
                      )}
                      {/* Connecting line */}
                      {index < route.stages.length - 1 && index < 7 && (
                        <div
                          className={cn(
                            "absolute left-1/2 top-full h-3 w-0.5 -translate-x-1/2",
                            isPassed ? "bg-primary/50" : "bg-muted-foreground/20"
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "flex-1 truncate text-xs",
                        isPassed ? "text-foreground font-medium" : "text-muted-foreground",
                        isCurrent && "text-primary font-semibold",
                        isNext && "text-accent font-medium"
                      )}
                    >
                      {stage.name}
                      {isCurrent && " (current)"}
                      {isNext && " (next)"}
                    </span>
                    {stage.isTerminal && (
                      <Badge variant="secondary" className="text-[8px] px-1 py-0">
                        Terminal
                      </Badge>
                    )}
                  </div>
                )
              })}
              {route.stages.length > 8 && (
                <p className="text-center text-[10px] text-muted-foreground py-1">
                  +{route.stages.length - 8} more stages
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Routes */}
      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Route className="h-3 w-3" />
          Assigned Routes
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

      {/* Rate This Vehicle Button */}
      <div className="mt-4">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setShowReviewForm(true)}
        >
          <MessageSquare className="h-4 w-4" />
          Rate This Vehicle
        </Button>
      </div>

      {/* Review Form Sheet */}
      <ReviewForm
        vehicleId={vehicle.vehicleId}
        plateNumber={vehicle.plateNumber}
        isOpen={showReviewForm}
        onClose={() => setShowReviewForm(false)}
      />
    </>
  )
}
