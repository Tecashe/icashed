"use client"

import { useState, useMemo, useCallback, Suspense, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  Loader2,
  MapPin,
  Search,
  Navigation,
  Bus,
  ChevronRight,
  RefreshCw,
  Crosshair,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useRealtimePositions } from "@/hooks/use-realtime-positions"
import { useRoutes, type LivePosition } from "@/hooks/use-data"
import { useUserLocation } from "@/hooks/use-user-location"
import { findNearest, calculateDistance } from "@/lib/geo-utils"
import { cn } from "@/lib/utils"
import type { MapVehicle, MapRoute, UserLocationData, NearestStageData, MapStage } from "@/components/map/leaflet-map"

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
  const [destination, setDestination] = useState("")
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<LivePosition | null>(null)
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false)
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

  // Real-time data
  const { positions: allPositions, isRealtime, connectionState } = useRealtimePositions()
  const { data: routesData, isLoading: routesLoading } = useRoutes({ limit: 100 })
  const routes = routesData?.routes || []

  // User location with watching enabled
  const { location: userLocationRaw, isLoading: locationLoading, error: locationError, requestLocation } = useUserLocation({ watch: true })

  // Convert raw location to UserLocationData format
  const userLocation: UserLocationData | null = useMemo(() => {
    if (!userLocationRaw) return null
    return {
      latitude: userLocationRaw.latitude,
      longitude: userLocationRaw.longitude,
      accuracy: userLocationRaw.accuracy,
    }
  }, [userLocationRaw])

  // Get all stages from all routes
  const allStages: MapStage[] = useMemo(() => {
    const stages: MapStage[] = []
    const seenIds = new Set<string>()
    routes.forEach(route => {
      route.stages?.forEach(stage => {
        if (!seenIds.has(stage.id)) {
          seenIds.add(stage.id)
          stages.push({
            id: stage.id,
            name: stage.name,
            lat: stage.latitude,
            lng: stage.longitude,
            isTerminal: stage.isTerminal || false,
            order: stage.order,
          })
        }
      })
    })
    return stages
  }, [routes])

  // Filter stages for destination autocomplete
  const filteredStages = useMemo(() => {
    if (!destination.trim()) return []
    const query = destination.toLowerCase()
    return allStages.filter(s =>
      s.name.toLowerCase().includes(query)
    ).slice(0, 5)
  }, [destination, allStages])

  // Find nearest stage to user
  const nearestStageToUser = useMemo(() => {
    if (!userLocation || allStages.length === 0) return null
    const stagesWithCoords = allStages.map(s => ({
      ...s,
      latitude: s.lat,
      longitude: s.lng,
    }))
    const nearest = findNearest(userLocation.latitude, userLocation.longitude, stagesWithCoords)
    return nearest?.location || null
  }, [userLocation, allStages])

  // Selected destination stage
  const destinationStage = useMemo(() => {
    return allStages.find(s => s.name.toLowerCase() === destination.toLowerCase()) || null
  }, [destination, allStages])

  // Find routes that connect origin to destination
  const suggestedRoutes = useMemo(() => {
    if (!nearestStageToUser || !destinationStage) return []

    // Find routes that have BOTH the nearest stage AND destination stage
    return routes.filter(route => {
      const stageIds = route.stages?.map(s => s.id) || []
      const hasOrigin = stageIds.includes(nearestStageToUser.id!)
      const hasDestination = stageIds.includes(destinationStage.id!)
      return hasOrigin && hasDestination
    }).map(route => {
      // Count vehicles on this route
      const vehicleCount = allPositions.filter(p =>
        p.routes.some(r => r.id === route.id)
      ).length
      return { ...route, vehicleCount }
    })
  }, [nearestStageToUser, destinationStage, routes, allPositions])

  // Vehicles for selected route
  const activeVehicles = useMemo(() => {
    if (!selectedRouteId) return allPositions
    return allPositions.filter((p) =>
      p.routes.some((r) => r.id === selectedRouteId)
    )
  }, [selectedRouteId, allPositions])

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
      : []

    return filteredRoutes.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      isActive: true,
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

  // Calculate nearest stage for guidance
  const nearestStage: NearestStageData | null = useMemo(() => {
    if (!userLocation || !nearestStageToUser) return null
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      nearestStageToUser.lat,
      nearestStageToUser.lng
    )
    const walkingTime = Math.ceil(distance / 80) // ~80m per minute walking
    return {
      stage: nearestStageToUser,
      distance,
      walkingTime,
      direction: "N", // Simplified
    }
  }, [userLocation, nearestStageToUser])

  // Handlers
  const handleSelectDestination = (stage: MapStage) => {
    setDestination(stage.name)
    setShowDestinationDropdown(false)
  }

  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId)
    // Fly to route bounds
    const route = routes.find(r => r.id === routeId)
    if (route && route.stages.length > 0) {
      const midStage = route.stages[Math.floor(route.stages.length / 2)]
      setFlyToLocation({ lat: midStage.latitude, lng: midStage.longitude, zoom: 13 })
    }
  }

  const handleCenterOnUser = () => {
    if (userLocation) {
      setFlyToLocation({ lat: userLocation.latitude, lng: userLocation.longitude, zoom: 15 })
    } else {
      requestLocation()
    }
  }

  // Location display text
  const locationText = useMemo(() => {
    if (locationLoading) return "Detecting your location..."
    if (locationError) return "Location unavailable"
    if (nearestStageToUser) return `Near ${nearestStageToUser.name}`
    if (userLocation) return `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`
    return "Tap to enable location"
  }, [locationLoading, locationError, nearestStageToUser, userLocation])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER SECTION - Fixed at top, never overlaps map
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3 space-y-3">

        {/* Your Location (Auto-detected) */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Your Location</p>
            <p className="font-medium text-foreground truncate">
              {locationText}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={requestLocation}
            disabled={locationLoading}
          >
            <RefreshCw className={cn("h-4 w-4", locationLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Destination Input */}
        <div className="relative">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <Search className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Where are you going?</p>
              <Input
                placeholder="Search destination..."
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value)
                  setShowDestinationDropdown(true)
                }}
                onFocus={() => setShowDestinationDropdown(true)}
                className="border-0 p-0 h-7 text-base font-medium bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {showDestinationDropdown && filteredStages.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              {filteredStages.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => handleSelectDestination(stage)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{stage.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROUTE SUGGESTIONS - Horizontal scrollable
      ═══════════════════════════════════════════════════════════════════ */}
      {suggestedRoutes.length > 0 && (
        <div className="flex-shrink-0 border-b border-border bg-card/50 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Available Routes ({suggestedRoutes.length})
          </p>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2">
              {suggestedRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => handleSelectRoute(route.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
                    selectedRouteId === route.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/50"
                  )}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: route.color }}
                  />
                  <span className="font-medium text-sm">{route.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    <Bus className="h-3 w-3 mr-1" />
                    {route.vehicleCount}
                  </Badge>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Show prompt if no destination yet */}
      {!destinationStage && destination === "" && (
        <div className="flex-shrink-0 px-4 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Navigation className="h-5 w-5" />
            <p className="text-sm">Enter your destination to see available routes</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAP SECTION - Takes remaining space, never overlapped
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative min-h-0">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-muted/30">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <LeafletMap
            vehicles={mapVehicles}
            routes={mapRoutes}
            selectedVehicleId={selectedVehicle?.vehicleId}
            selectedRouteId={selectedRouteId}
            showRouteLines={true}
            enableAnimation={true}
            highlightActiveRoute={true}
            userLocation={userLocation}
            nearestStage={nearestStage}
            showUserLocation={true}
            showGuidancePath={!!nearestStage}
            flyToLocation={flyToLocation}
          />
        </Suspense>

        {/* Center on Me FAB */}
        <Button
          onClick={handleCenterOnUser}
          size="icon"
          className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-10"
        >
          <Crosshair className="h-5 w-5" />
        </Button>

        {/* Connection Status */}
        <div className="absolute top-2 right-2 z-10">
          <Badge
            variant={isRealtime ? "default" : "secondary"}
            className="shadow-sm"
          >
            {isRealtime ? "🟢 Live" : "📡 Connecting..."}
          </Badge>
        </div>
      </div>
    </div>
  )
}
