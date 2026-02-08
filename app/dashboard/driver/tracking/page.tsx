"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { useMyVehicles, useRoutes } from "@/hooks/use-data"
import { useVehicleProgress, type RouteWithStages } from "@/hooks/use-vehicle-progress"
import useSWR from "swr"
import { apiPost, fetcher } from "@/lib/api-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  ArrowRight,
  Navigation,
  Route,
  Crosshair,
  Radio,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import type { MapVehicle, MapRoute, UserLocationData } from "@/components/map/leaflet-map"
import { cn } from "@/lib/utils"
import { calculateDistance } from "@/lib/geo-utils"
import { useUserLocation } from "@/hooks/use-user-location"

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

interface WaitingStage {
  id: string
  name: string
  latitude: number
  longitude: number
  waitingCount: number
  route: { name: string; color: string }
}

// Distance threshold in meters for "at stage"
const STAGE_PROXIMITY_THRESHOLD = 500 // 500m = at/near stage
const STAGE_WARNING_THRESHOLD = 2000 // 2km = show warning

export default function DriverTrackingPage() {
  const { data } = useMyVehicles()
  const vehicles = data?.vehicles || []
  const { data: routesData } = useRoutes({ limit: 100 })
  const routes = routesData?.routes || []

  // Get driver's current GPS location
  const { location: driverGPS, isLoading: gpsLoading } = useUserLocation({ watch: true })

  // Selection state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("")
  const [selectedRouteId, setSelectedRouteId] = useState<string>("")
  const [direction, setDirection] = useState<"forward" | "reverse">("forward")

  // Tracking state
  const [tracking, setTracking] = useState(false)
  const [position, setPosition] = useState<{
    lat: number
    lng: number
    speed: number
    heading: number
    accuracy: number
  } | null>(null)
  const [updateCount, setUpdateCount] = useState(0)
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const watchRef = useRef<number | null>(null)

  // Get waiting passengers
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

  // Get selected route
  const selectedRoute = useMemo(() => {
    if (!selectedRouteId) return vehicleRoutes[0]
    return vehicleRoutes.find(r => r.id === selectedRouteId) || vehicleRoutes[0]
  }, [selectedRouteId, vehicleRoutes])

  // Get route terminals
  const routeTerminals = useMemo(() => {
    if (!selectedRoute || selectedRoute.stages.length < 2) return null
    const stages = [...selectedRoute.stages].sort((a, b) => (a.order || 0) - (b.order || 0))
    const firstStage = stages[0]
    const lastStage = stages[stages.length - 1]
    return {
      forward: { from: firstStage, to: lastStage },
      reverse: { from: lastStage, to: firstStage },
    }
  }, [selectedRoute])

  // Get origin stage based on direction
  const originStage = useMemo(() => {
    if (!routeTerminals) return null
    return direction === "forward" ? routeTerminals.forward.from : routeTerminals.reverse.from
  }, [routeTerminals, direction])

  // Calculate distance from driver to origin stage
  const distanceToOrigin = useMemo(() => {
    if (!driverGPS || !originStage) return null
    return calculateDistance(
      driverGPS.latitude,
      driverGPS.longitude,
      originStage.latitude,
      originStage.longitude
    )
  }, [driverGPS, originStage])

  // Location status: "at_stage" | "near_stage" | "far" | "unknown"
  const locationStatus = useMemo(() => {
    if (!distanceToOrigin) return "unknown"
    if (distanceToOrigin <= STAGE_PROXIMITY_THRESHOLD) return "at_stage"
    if (distanceToOrigin <= STAGE_WARNING_THRESHOLD) return "near_stage"
    return "far"
  }, [distanceToOrigin])

  // Calculate progress
  const currentPosition = position ? { latitude: position.lat, longitude: position.lng } : null
  const routesForProgress = selectedRoute ? [selectedRoute] : []
  const progress = useVehicleProgress(currentPosition, routesForProgress, selectedVehicle?.type || "MATATU")

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
      if (!selectedVehicleId || !selectedRouteId) return
      const { latitude, longitude, speed, heading, accuracy } = pos.coords
      const spd = speed ? Math.round(speed * 3.6) : 0
      const hdg = heading ?? 0

      setPosition({ lat: latitude, lng: longitude, speed: spd, heading: hdg, accuracy: accuracy ?? 0 })

      try {
        await apiPost("/api/driver/position", {
          vehicleId: selectedVehicleId,
          routeId: selectedRouteId,
          direction,
          latitude,
          longitude,
          speed: spd,
          heading: Math.round(hdg),
        })
        setUpdateCount((c) => c + 1)
      } catch {
        // Silent retry
      }
    },
    [selectedVehicleId, selectedRouteId, direction]
  )

  const startTracking = useCallback(() => {
    if (!selectedVehicleId) {
      toast.error("Select a vehicle first")
      return
    }
    if (!selectedRouteId) {
      toast.error("Select a route first")
      return
    }
    if (!navigator.geolocation) {
      toast.error("GPS not supported")
      return
    }

    setTracking(true)
    setUpdateCount(0)

    const vehicle = vehicles.find((v) => v.id === selectedVehicleId)
    const dirLabel = routeTerminals
      ? `${direction === "forward" ? routeTerminals.forward.from.name : routeTerminals.reverse.from.name} → ${direction === "forward" ? routeTerminals.forward.to.name : routeTerminals.reverse.to.name}`
      : ""

    toast.success("You're now LIVE! 🟢", { description: `${vehicle?.plateNumber} heading ${dirLabel}` })

    watchRef.current = navigator.geolocation.watchPosition(
      sendPosition,
      (err) => toast.error("GPS Error", { description: err.message }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    )
  }, [selectedVehicleId, selectedRouteId, direction, vehicles, routeTerminals, sendPosition])

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

  const handleCenterOnMe = () => {
    if (position) {
      setFlyToLocation({ lat: position.lat, lng: position.lng, zoom: 16 })
    }
  }

  // Map data
  const userLocation: UserLocationData | null = position ? {
    latitude: position.lat,
    longitude: position.lng,
    accuracy: position.accuracy,
  } : driverGPS

  const mapVehicles: MapVehicle[] = position ? [{
    id: selectedVehicleId || "self",
    plateNumber: selectedVehicle?.plateNumber || "You",
    nickname: selectedVehicle?.nickname,
    type: selectedVehicle?.type || "MATATU",
    lat: position.lat,
    lng: position.lng,
    speed: position.speed,
    heading: position.heading,
    color: selectedRoute?.color || "#10B981",
    routeName: selectedRoute?.name || "",
    isLive: true,
    progress: progress?.progress,
    etaMinutes: progress?.etaToTerminus,
    nextStageName: progress?.nextStage?.name,
  }] : []

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

  const canGoLive = selectedVehicleId && selectedRouteId && routeTerminals

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* ═══════════════════════════════════════════════════════════════════
          COMPACT CONTROL SECTION
      ═══════════════════════════════════════════════════════════════════ */}
      {!tracking ? (
        <div className="flex-shrink-0 border-b border-border bg-card px-3 py-2 space-y-2">

          {/* Vehicle & Route Row - Side by Side */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Bus className="h-3 w-3" /> Vehicle
              </Label>
              <Select
                value={selectedVehicleId}
                onValueChange={(v) => {
                  setSelectedVehicleId(v)
                  setSelectedRouteId("")
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="font-medium">{v.plateNumber}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Route className="h-3 w-3" /> Route
              </Label>
              <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicleRoutes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                        <span>{r.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Direction - Compact Radio */}
          {routeTerminals && (
            <div className="rounded-lg border border-border bg-muted/30 p-2">
              <Label className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <Navigation className="h-3 w-3" /> Direction
              </Label>
              <RadioGroup
                value={direction}
                onValueChange={(v) => setDirection(v as "forward" | "reverse")}
                className="flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="forward" id="fwd" className="h-4 w-4" />
                  <Label htmlFor="fwd" className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <span className="font-medium truncate max-w-[100px]">{routeTerminals.forward.from.name}</span>
                    <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="font-medium truncate max-w-[100px]">{routeTerminals.forward.to.name}</span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="reverse" id="rev" className="h-4 w-4" />
                  <Label htmlFor="rev" className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <span className="font-medium truncate max-w-[100px]">{routeTerminals.reverse.from.name}</span>
                    <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="font-medium truncate max-w-[100px]">{routeTerminals.reverse.to.name}</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Location Status Banner */}
          {originStage && !gpsLoading && (
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              locationStatus === "at_stage" && "bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400",
              locationStatus === "near_stage" && "bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400",
              locationStatus === "far" && "bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400",
              locationStatus === "unknown" && "bg-muted border border-border text-muted-foreground"
            )}>
              {locationStatus === "at_stage" && (
                <>
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>You're at <strong>{originStage.name}</strong> ✓</span>
                </>
              )}
              {locationStatus === "near_stage" && (
                <>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>You're {distanceToOrigin ? `${(distanceToOrigin / 1000).toFixed(1)}km` : ""} from <strong>{originStage.name}</strong></span>
                </>
              )}
              {locationStatus === "far" && (
                <>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Go to <strong>{originStage.name}</strong> ({distanceToOrigin ? `${(distanceToOrigin / 1000).toFixed(1)}km` : "?"} away)</span>
                </>
              )}
              {locationStatus === "unknown" && (
                <>
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>Detecting your location...</span>
                </>
              )}
            </div>
          )}

          {/* GO LIVE Button */}
          <Button
            onClick={startTracking}
            disabled={!canGoLive}
            size="lg"
            className="w-full h-11 text-base font-bold shadow-md gap-2"
          >
            <Power className="h-5 w-5" />
            GO LIVE
          </Button>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════
           COMPACT LIVE STATUS
        ═══════════════════════════════════════════════════════════════════ */
        <div className="flex-shrink-0 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 px-3 py-2">
          {/* Status Row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Radio className="h-5 w-5 text-primary" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
              </div>
              <div>
                <p className="font-bold text-sm text-primary leading-none">LIVE</p>
                <p className="text-xs text-muted-foreground">{selectedVehicle?.plateNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {position && (
                <Badge variant="secondary" className="text-xs">
                  <Gauge className="h-3 w-3 mr-1" />
                  {position.speed} km/h
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">{updateCount} updates</Badge>
            </div>
          </div>

          {/* Route Direction */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedRoute?.color }} />
            <span className="font-medium">{selectedRoute?.name}</span>
            <ArrowRight className="h-3 w-3" />
            <span>{routeTerminals && (direction === "forward" ? routeTerminals.forward.to.name : routeTerminals.reverse.to.name)}</span>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                <span>Route Progress</span>
                <span>{Math.round(progress.progress)}%</span>
              </div>
              <Progress value={progress.progress} className="h-1.5" />
            </div>
          )}

          {/* Next Stage Card - Compact */}
          {progress?.nextStage && (
            <div className="flex items-center gap-2 rounded-lg bg-card/80 border border-border p-2 mb-2">
              <div className="relative flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">Next Stop</p>
                <p className="font-medium text-sm truncate">{progress.nextStage.name}</p>
              </div>
              <div className="text-right">
                {progress.etaToNextStage !== undefined && (
                  <p className="font-bold text-primary text-sm">{progress.etaToNextStage} min</p>
                )}
                {progress.distanceToNextStage !== undefined && (
                  <p className="text-[10px] text-muted-foreground">{(progress.distanceToNextStage / 1000).toFixed(1)} km</p>
                )}
              </div>
            </div>
          )}

          {/* Waiting Passengers */}
          {totalWaiting > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-1.5 mb-2 text-xs">
              <Users className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-amber-700 dark:text-amber-400">{totalWaiting} passengers waiting</span>
            </div>
          )}

          {/* STOP Button */}
          <Button
            onClick={stopTracking}
            variant="destructive"
            size="sm"
            className="w-full h-9 text-sm font-bold gap-1.5"
          >
            <PowerOff className="h-4 w-4" />
            STOP TRACKING
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAP SECTION - Maximum space
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative min-h-0">
        <LeafletMap
          vehicles={mapVehicles}
          routes={mapRoutes}
          center={position ? [position.lat, position.lng] : driverGPS ? [driverGPS.latitude, driverGPS.longitude] : [-1.2921, 36.8219]}
          zoom={position ? 15 : 13}
          showRouteLines={true}
          enableAnimation={true}
          highlightActiveRoute={true}
          flyToLocation={flyToLocation}
          userLocation={userLocation}
          showUserLocation={!tracking && !!driverGPS}
        />

        {/* Center on Me FAB */}
        {tracking && position && (
          <Button
            onClick={handleCenterOnMe}
            size="icon"
            className="absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg z-10"
          >
            <Crosshair className="h-4 w-4" />
          </Button>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="shadow-sm text-xs">
            <MapPin className="h-3 w-3 mr-1" />
            {tracking ? "Tracking Active" : "Preview"}
          </Badge>
        </div>
      </div>
    </div>
  )
}
