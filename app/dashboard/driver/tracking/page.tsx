"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { useMyVehicles, useRoutes } from "@/hooks/use-data"
import { useVehicleProgress, type RouteWithStages } from "@/hooks/use-vehicle-progress"
import useSWR from "swr"
import { apiPost, fetcher } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Power,
  PowerOff,
  MapPin,
  Bus,
  Gauge,
  Users,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Timer,
  Target,
  Navigation,
  Route,
  CheckCircle2,
  CircleDot,
} from "lucide-react"
import type { MapVehicle, MapRoute } from "@/components/map/leaflet-map"
import { cn } from "@/lib/utils"

const LeafletMap = dynamic(
  () => import("@/components/map/leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

interface WaitingStage {
  id: string
  name: string
  latitude: number
  longitude: number
  waitingCount: number
  route: { name: string; color: string }
}

export default function DriverTrackingPage() {
  const { data } = useMyVehicles()
  const vehicles = data?.vehicles || []
  const { data: routesData } = useRoutes({ limit: 100 })
  const routes = routesData?.routes || []

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("")
  const [selectedRouteId, setSelectedRouteId] = useState<string>("")
  const [tracking, setTracking] = useState(false)
  const [position, setPosition] = useState<{
    lat: number
    lng: number
    speed: number
    heading: number
    accuracy: number
  } | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [updateCount, setUpdateCount] = useState(0)
  const [showPanel, setShowPanel] = useState(true)
  const watchRef = useRef<number | null>(null)

  // Get waiting passengers for driver's routes
  const { data: waitingData } = useSWR<{ stages: WaitingStage[] }>(
    tracking ? "/api/driver/stages/waiting" : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  const stagesWithWaiting = waitingData?.stages?.filter((s) => s.waitingCount > 0) || []
  const totalWaiting = stagesWithWaiting.reduce((sum, s) => sum + s.waitingCount, 0)

  // Get selected vehicle
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)

  // Get routes for selected vehicle
  const vehicleRoutes = useMemo(() => {
    if (!selectedVehicle) return []
    return selectedVehicle.routes
      .map(vr => {
        const fullRoute = routes.find(r => r.id === vr.route.id)
        if (!fullRoute) return null
        return {
          id: fullRoute.id,
          name: fullRoute.name,
          color: fullRoute.color,
          stages: fullRoute.stages.map(s => ({
            id: s.id,
            name: s.name,
            latitude: s.latitude,
            longitude: s.longitude,
            order: s.order,
            isTerminal: s.isTerminal,
          })),
        } as RouteWithStages
      })
      .filter((r): r is RouteWithStages => r !== null)
  }, [selectedVehicle, routes])

  // Get selected route for display
  const selectedRoute = useMemo(() => {
    if (!selectedRouteId) return vehicleRoutes[0]
    return vehicleRoutes.find(r => r.id === selectedRouteId) || vehicleRoutes[0]
  }, [selectedRouteId, vehicleRoutes])

  // Calculate progress along route
  const currentPosition = position ? { latitude: position.lat, longitude: position.lng } : null
  const routesForProgress = selectedRoute ? [selectedRoute] : []
  const progress = useVehicleProgress(
    currentPosition,
    routesForProgress,
    selectedVehicle?.type || "MATATU"
  )

  // Auto-select first vehicle
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id)
    }
  }, [vehicles, selectedVehicleId])

  // Auto-select first route when vehicle changes
  useEffect(() => {
    if (vehicleRoutes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(vehicleRoutes[0].id)
    }
  }, [vehicleRoutes, selectedRouteId])

  const sendPosition = useCallback(
    async (pos: GeolocationPosition) => {
      if (!selectedVehicleId) return
      const { latitude, longitude, speed, heading, accuracy } = pos.coords
      const spd = speed ? Math.round(speed * 3.6) : 0
      const hdg = heading ?? 0

      setPosition({ lat: latitude, lng: longitude, speed: spd, heading: hdg, accuracy: accuracy ?? 0 })

      try {
        await apiPost("/api/driver/position", {
          vehicleId: selectedVehicleId,
          latitude,
          longitude,
          speed: spd,
          heading: Math.round(hdg),
        })
        setLastUpdate(new Date())
        setUpdateCount((c) => c + 1)
      } catch {
        // Silent retry next tick
      }
    },
    [selectedVehicleId]
  )

  const startTracking = useCallback(() => {
    if (!selectedVehicleId) {
      toast.error("Select a vehicle first")
      return
    }
    if (!navigator.geolocation) {
      toast.error("GPS not supported on this device")
      return
    }

    setTracking(true)
    setUpdateCount(0)

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)
    toast.success("You're now LIVE!", {
      description: `Passengers can see ${selectedVehicle?.plateNumber}`,
    })

    watchRef.current = navigator.geolocation.watchPosition(
      sendPosition,
      (err) => {
        toast.error("GPS Error", { description: err.message })
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    )
  }, [selectedVehicleId, vehicles, sendPosition])

  const stopTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setTracking(false)
    toast.info("Tracking stopped", { description: `${updateCount} updates sent` })
  }, [updateCount])

  useEffect(() => {
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current)
      }
    }
  }, [])

  // Map data
  const mapVehicles: MapVehicle[] = position
    ? [
      {
        id: selectedVehicleId || "self",
        plateNumber: selectedVehicle?.plateNumber || "You",
        nickname: selectedVehicle?.nickname,
        type: selectedVehicle?.type || "MATATU",
        lat: position.lat,
        lng: position.lng,
        speed: position.speed,
        heading: position.heading,
        color: selectedRoute?.color || "#10B981",
        routeName: selectedRoute?.name || "Your Route",
        isLive: true,
        progress: progress?.progress,
        etaMinutes: progress?.etaToTerminus,
        nextStageName: progress?.nextStage?.name,
      },
    ]
    : []

  // Map routes - show selected route
  const mapRoutes: MapRoute[] = selectedRoute ? [{
    id: selectedRoute.id,
    name: selectedRoute.name,
    color: selectedRoute.color,
    isActive: true,
    stages: selectedRoute.stages.map(s => ({
      id: s.id,
      name: s.name,
      lat: s.latitude,
      lng: s.longitude,
      isTerminal: s.isTerminal,
      order: s.order,
    })),
  }] : []

  return (
    <div className="relative -m-4 -mb-24 flex h-[calc(100vh-4rem)] flex-col lg:-m-6 lg:-mb-6 lg:h-[calc(100vh-4rem)]">
      {/* Full-screen Map */}
      <div className="absolute inset-0">
        <LeafletMap
          vehicles={mapVehicles}
          routes={mapRoutes}
          center={position ? [position.lat, position.lng] : [-1.2921, 36.8219]}
          zoom={position ? 15 : 12}
          showRouteLines={true}
          enableAnimation={true}
          highlightActiveRoute={true}
        />
      </div>

      {/* Floating Status Badges (when tracking) */}
      {tracking && (
        <>
          {/* LIVE Badge */}
          <div className="absolute left-4 top-4 z-20">
            <Badge className="gap-2 bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
              </span>
              LIVE
            </Badge>
          </div>

          {/* Speed & Route Progress */}
          {position && (
            <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
              {/* Speed */}
              <div className="flex items-center gap-2 rounded-xl bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
                <Gauge className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold text-foreground">{position.speed}</span>
                <span className="text-sm text-muted-foreground">km/h</span>
              </div>

              {/* Route Progress */}
              {progress && (
                <div className="rounded-xl bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-bold" style={{ color: progress.routeColor }}>
                      {Math.round(progress.progress)}%
                    </span>
                  </div>
                  <Progress value={progress.progress} className="mt-1 h-1.5" />
                </div>
              )}
            </div>
          )}

          {/* Waiting Passengers Badge */}
          {totalWaiting > 0 && (
            <div className="absolute left-4 top-14 z-20">
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/90 px-3 py-2 shadow-lg">
                <Users className="h-5 w-5 text-white" />
                <span className="text-sm font-semibold text-white">
                  {totalWaiting} waiting
                </span>
              </div>
            </div>
          )}

          {/* Next Stage Card */}
          {progress?.nextStage && (
            <div className="absolute left-4 right-4 top-24 z-20 sm:left-auto sm:right-4 sm:w-64">
              <div className="rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Target className="h-3.5 w-3.5 text-accent" />
                  Next Stop
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-semibold text-foreground truncate">
                    {progress.nextStage.name}
                  </span>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Timer className="h-3 w-3" />
                    {progress.etaToNextStage} min
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {progress.distanceToNextStage.toFixed(1)} km • {progress.stagesRemaining} stops to terminus
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bottom Control Panel */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300",
          "pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0",
          !showPanel && !tracking && "translate-y-[calc(100%-60px)]"
        )}
      >
        {/* Toggle Panel Button */}
        {!tracking && (
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="absolute -top-4 left-1/2 z-10 flex h-8 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-card shadow-lg border border-border"
          >
            {showPanel ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        )}

        <div className="rounded-t-3xl border-t border-border bg-card/95 p-4 shadow-2xl backdrop-blur-lg">
          {/* Vehicle & Route Selector - Only when not tracking */}
          {!tracking && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              {/* Vehicle Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Select Vehicle
                </label>
                <Select
                  value={selectedVehicleId}
                  onValueChange={(v) => {
                    setSelectedVehicleId(v)
                    setSelectedRouteId("") // Reset route when vehicle changes
                  }}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choose your vehicle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Bus className="h-4 w-4" />
                          <span className="font-medium">{v.plateNumber}</span>
                          {v.nickname && (
                            <span className="text-muted-foreground">- {v.nickname}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Route Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Select Route
                </label>
                <Select
                  value={selectedRouteId}
                  onValueChange={setSelectedRouteId}
                  disabled={vehicleRoutes.length === 0}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Choose your route..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleRoutes.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: r.color }}
                          />
                          <span className="font-medium">{r.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({r.stages.length} stops)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Status when tracking */}
          {tracking && (
            <div className="mb-4">
              {/* Route Info */}
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
                  </span>
                  <div>
                    <p className="font-semibold text-primary">Broadcasting LIVE</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedVehicle?.plateNumber} • {selectedRoute?.name}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {updateCount} updates
                </Badge>
              </div>

              {/* Stage Timeline (compact) */}
              {selectedRoute && progress && (
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2">
                  {selectedRoute.stages.slice(0, 6).map((stage, index) => {
                    const isPassed = index <= progress.currentStageIndex
                    const isCurrent = index === progress.currentStageIndex
                    const isNext = index === progress.currentStageIndex + 1

                    return (
                      <div
                        key={stage.id}
                        className={cn(
                          "flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2 py-1",
                          isCurrent && "bg-primary/10",
                          isNext && "bg-accent/10"
                        )}
                      >
                        {isPassed ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5"
                            style={{ color: progress.routeColor }}
                          />
                        ) : isNext ? (
                          <Target className="h-3.5 w-3.5 text-accent" />
                        ) : (
                          <CircleDot className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                        <span
                          className={cn(
                            "text-xs whitespace-nowrap",
                            isPassed ? "text-foreground" : "text-muted-foreground",
                            isCurrent && "font-semibold text-primary",
                            isNext && "font-medium text-accent"
                          )}
                        >
                          {stage.name.length > 12 ? stage.name.slice(0, 12) + "..." : stage.name}
                        </span>
                        {index < selectedRoute.stages.length - 1 && index < 5 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                        )}
                      </div>
                    )
                  })}
                  {selectedRoute.stages.length > 6 && (
                    <span className="text-xs text-muted-foreground">
                      +{selectedRoute.stages.length - 6} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BIG START/STOP BUTTON */}
          <div className="flex justify-center">
            {tracking ? (
              <Button
                onClick={stopTracking}
                size="lg"
                variant="destructive"
                className="h-16 w-full gap-3 text-lg font-bold shadow-lg shadow-destructive/25 sm:w-auto sm:px-12"
              >
                <PowerOff className="h-6 w-6" />
                STOP TRACKING
              </Button>
            ) : (
              <Button
                onClick={startTracking}
                disabled={!selectedVehicleId}
                size="lg"
                className="h-16 w-full gap-3 text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-xl sm:w-auto sm:px-12"
              >
                <Power className="h-6 w-6" />
                GO LIVE
              </Button>
            )}
          </div>

          {/* Empty State Hint */}
          {!tracking && !selectedVehicleId && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Select a vehicle above to start tracking
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
