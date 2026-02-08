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

  // Get route direction labels (terminals)
  const routeTerminals = useMemo(() => {
    if (!selectedRoute || selectedRoute.stages.length < 2) return null
    const stages = [...selectedRoute.stages].sort((a, b) => (a.order || 0) - (b.order || 0))
    const firstStage = stages[0]
    const lastStage = stages[stages.length - 1]
    return {
      forward: { from: firstStage.name, to: lastStage.name },
      reverse: { from: lastStage.name, to: firstStage.name },
    }
  }, [selectedRoute])

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
        // Silent retry next tick
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
      toast.error("GPS not supported on this device")
      return
    }

    setTracking(true)
    setUpdateCount(0)

    const vehicle = vehicles.find((v) => v.id === selectedVehicleId)
    const directionLabel = routeTerminals
      ? `${direction === "forward" ? routeTerminals.forward.from : routeTerminals.reverse.from} → ${direction === "forward" ? routeTerminals.forward.to : routeTerminals.reverse.to}`
      : ""

    toast.success("You're now LIVE! 🟢", {
      description: `${vehicle?.plateNumber} heading ${directionLabel}`,
    })

    watchRef.current = navigator.geolocation.watchPosition(
      sendPosition,
      (err) => {
        toast.error("GPS Error", { description: err.message })
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    )
  }, [selectedVehicleId, selectedRouteId, direction, vehicles, routeTerminals, sendPosition])

  const stopTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setTracking(false)
    toast.info("Tracking stopped", { description: `${updateCount} location updates sent` })
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

  // Validation for Go Live
  const canGoLive = selectedVehicleId && selectedRouteId && routeTerminals

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* ═══════════════════════════════════════════════════════════════════
          CONTROL SECTION - Fixed at top
      ═══════════════════════════════════════════════════════════════════ */}
      {!tracking ? (
        <div className="flex-shrink-0 border-b border-border bg-card px-4 py-4 space-y-4">

          {/* Vehicle Selector */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Bus className="h-4 w-4" />
              Select Your Vehicle
            </Label>
            <Select
              value={selectedVehicleId}
              onValueChange={(v) => {
                setSelectedVehicleId(v)
                setSelectedRouteId("") // Reset route when vehicle changes
              }}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Choose a vehicle..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="py-3">
                    <div className="flex items-center gap-2">
                      <Bus className="h-4 w-4" />
                      <span className="font-semibold">{v.plateNumber}</span>
                      {v.nickname && (
                        <span className="text-muted-foreground">({v.nickname})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Route Selector */}
          {vehicleRoutes.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Route className="h-4 w-4" />
                Select Route
              </Label>
              <Select
                value={selectedRouteId}
                onValueChange={setSelectedRouteId}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Choose a route..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicleRoutes.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="py-3">
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
          )}

          {/* Direction Selector */}
          {routeTerminals && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <Label className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Which direction are you heading?
              </Label>
              <RadioGroup
                value={direction}
                onValueChange={(v) => setDirection(v as "forward" | "reverse")}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="forward" id="forward" />
                  <Label
                    htmlFor="forward"
                    className="flex-1 flex items-center gap-2 cursor-pointer text-base"
                  >
                    <span className="font-medium">{routeTerminals.forward.from}</span>
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="font-medium">{routeTerminals.forward.to}</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="reverse" id="reverse" />
                  <Label
                    htmlFor="reverse"
                    className="flex-1 flex items-center gap-2 cursor-pointer text-base"
                  >
                    <span className="font-medium">{routeTerminals.reverse.from}</span>
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <span className="font-medium">{routeTerminals.reverse.to}</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* GO LIVE Button */}
          <Button
            onClick={startTracking}
            disabled={!canGoLive}
            size="lg"
            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/25 gap-3"
          >
            <Power className="h-6 w-6" />
            GO LIVE
          </Button>

          {!canGoLive && (
            <p className="text-center text-sm text-muted-foreground">
              {!selectedVehicleId && "Select a vehicle to continue"}
              {selectedVehicleId && !selectedRouteId && "Select a route to continue"}
              {selectedVehicleId && selectedRouteId && !routeTerminals && "Loading route details..."}
            </p>
          )}
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════
           LIVE STATUS - Shows when tracking
        ═══════════════════════════════════════════════════════════════════ */
        <div className="flex-shrink-0 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-4">
          {/* Live Indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Radio className="h-6 w-6 text-primary" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                </span>
              </div>
              <div>
                <p className="font-bold text-primary">LIVE</p>
                <p className="text-sm text-muted-foreground">
                  {selectedVehicle?.plateNumber}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {updateCount} updates
            </Badge>
          </div>

          {/* Route & Direction */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: selectedRoute?.color }}
            />
            <span className="font-medium">{selectedRoute?.name}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {routeTerminals && (direction === "forward"
                ? routeTerminals.forward.to
                : routeTerminals.reverse.to)}
            </span>
          </div>

          {/* Speed & Progress Row */}
          {position && (
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2">
                <Gauge className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold">{position.speed}</span>
                <span className="text-sm text-muted-foreground">km/h</span>
              </div>
              {progress && (
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress.progress)}%</span>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                </div>
              )}
            </div>
          )}

          {/* Next Stage ETA Card */}
          {progress?.nextStage && (
            <div className="rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 border border-primary/20 p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  {/* Pulsating ring */}
                  <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Next Stop</p>
                  <p className="font-bold text-lg text-foreground">
                    {progress.nextStage.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {progress.etaToNextStage !== undefined && (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                        <span className="text-lg">{progress.etaToNextStage}</span> min away
                      </span>
                    )}
                    {progress.distanceToNextStage !== undefined && (
                      <span className="text-sm text-muted-foreground">
                        ({(progress.distanceToNextStage / 1000).toFixed(1)} km)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Waiting Passengers */}
          {totalWaiting > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 mb-4">
              <Users className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {totalWaiting} passengers waiting along your route
              </span>
            </div>
          )}

          {/* STOP Button */}
          <Button
            onClick={stopTracking}
            variant="destructive"
            size="lg"
            className="w-full h-12 text-base font-bold gap-2"
          >
            <PowerOff className="h-5 w-5" />
            STOP TRACKING
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAP SECTION - Takes remaining space
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative min-h-0">
        <LeafletMap
          vehicles={mapVehicles}
          routes={mapRoutes}
          center={position ? [position.lat, position.lng] : [-1.2921, 36.8219]}
          zoom={position ? 15 : 12}
          showRouteLines={true}
          enableAnimation={true}
          highlightActiveRoute={true}
          flyToLocation={flyToLocation}
        />

        {/* Center on Me FAB */}
        {tracking && position && (
          <Button
            onClick={handleCenterOnMe}
            size="icon"
            className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-10"
          >
            <Crosshair className="h-5 w-5" />
          </Button>
        )}

        {/* Vehicle count badge */}
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="shadow-sm">
            <MapPin className="h-3 w-3 mr-1" />
            {tracking ? "Tracking Active" : "Preview"}
          </Badge>
        </div>
      </div>
    </div>
  )
}
