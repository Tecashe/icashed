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
  Edit3,
  Check,
  X,
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
  // Location state - support both GPS and manual entry
  const [manualOrigin, setManualOrigin] = useState("")
  const [isEditingOrigin, setIsEditingOrigin] = useState(false)
  const [showOriginDropdown, setShowOriginDropdown] = useState(false)

  // Destination state
  const [destination, setDestination] = useState("")
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false)

  // Route & vehicle state
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<LivePosition | null>(null)
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

  // Filter stages for origin autocomplete
  const filteredOriginStages = useMemo(() => {
    if (!manualOrigin.trim()) return allStages.slice(0, 5) // Show first 5 when empty
    const query = manualOrigin.toLowerCase()
    return allStages.filter(s =>
      s.name.toLowerCase().includes(query)
    ).slice(0, 5)
  }, [manualOrigin, allStages])

  // Filter stages for destination autocomplete
  const filteredDestinationStages = useMemo(() => {
    if (!destination.trim()) return []
    const query = destination.toLowerCase()
    return allStages.filter(s =>
      s.name.toLowerCase().includes(query)
    ).slice(0, 5)
  }, [destination, allStages])

  // Find nearest stage to GPS location
  const nearestStageToGPS = useMemo(() => {
    if (!userLocation || allStages.length === 0) return null
    const stagesWithCoords = allStages.map(s => ({
      ...s,
      latitude: s.lat,
      longitude: s.lng,
    }))
    const nearest = findNearest(userLocation.latitude, userLocation.longitude, stagesWithCoords)
    return nearest?.location || null
  }, [userLocation, allStages])

  // Determine origin stage - manual selection or GPS-based
  const originStage = useMemo(() => {
    // If user manually selected a stage, use that
    if (manualOrigin) {
      return allStages.find(s => s.name.toLowerCase() === manualOrigin.toLowerCase()) || null
    }
    // Otherwise use nearest to GPS
    if (nearestStageToGPS) {
      return {
        ...nearestStageToGPS,
        lat: nearestStageToGPS.latitude,
        lng: nearestStageToGPS.longitude,
      } as MapStage
    }
    return null
  }, [manualOrigin, nearestStageToGPS, allStages])

  // Selected destination stage
  const destinationStage = useMemo(() => {
    return allStages.find(s => s.name.toLowerCase() === destination.toLowerCase()) || null
  }, [destination, allStages])

  // Find routes that connect origin to destination
  const suggestedRoutes = useMemo(() => {
    if (!originStage || !destinationStage) return []

    // Find routes that have BOTH the origin stage AND destination stage
    return routes.filter(route => {
      const stageNames = route.stages?.map(s => s.name.toLowerCase()) || []
      const originName = originStage.name?.toLowerCase() || ""
      const destName = destinationStage.name.toLowerCase()
      const hasOrigin = stageNames.includes(originName)
      const hasDestination = stageNames.includes(destName)
      return hasOrigin && hasDestination
    }).map(route => {
      // Count vehicles on this route
      const vehicleCount = allPositions.filter(p =>
        p.routes.some(r => r.id === route.id)
      ).length
      return { ...route, vehicleCount }
    })
  }, [originStage, destinationStage, routes, allPositions])

  // Auto-select first suggested route and focus map
  useEffect(() => {
    if (suggestedRoutes.length > 0 && !selectedRouteId) {
      const firstRoute = suggestedRoutes[0]
      setSelectedRouteId(firstRoute.id)
      // Focus map on route
      if (firstRoute.stages.length > 0) {
        const midIndex = Math.floor(firstRoute.stages.length / 2)
        const midStage = firstRoute.stages[midIndex]
        setFlyToLocation({ lat: midStage.latitude, lng: midStage.longitude, zoom: 13 })
      }
    }
  }, [suggestedRoutes, selectedRouteId])

  // Reset route selection when origin/destination changes
  useEffect(() => {
    setSelectedRouteId(null)
  }, [originStage?.name, destinationStage?.name])

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

  // Calculate nearest stage for guidance path
  const nearestStage: NearestStageData | null = useMemo(() => {
    if (!userLocation || !originStage) return null
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      originStage.lat,
      originStage.lng
    )
    const walkingTime = Math.ceil(distance / 80) // ~80m per minute walking
    return {
      stage: originStage,
      distance,
      walkingTime,
      direction: "N",
    }
  }, [userLocation, originStage])

  // Handlers
  const handleSelectOrigin = (stage: MapStage) => {
    setManualOrigin(stage.name)
    setShowOriginDropdown(false)
    setIsEditingOrigin(false)
  }

  const handleSelectDestination = (stage: MapStage) => {
    setDestination(stage.name)
    setShowDestinationDropdown(false)
    // Focus map on destination
    setFlyToLocation({ lat: stage.lat, lng: stage.lng, zoom: 14 })
  }

  const handleSelectRoute = (routeId: string) => {
    setSelectedRouteId(routeId)
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

  const handleStartEditOrigin = () => {
    setIsEditingOrigin(true)
    setShowOriginDropdown(true)
    setManualOrigin("")
  }

  const handleCancelEditOrigin = () => {
    setIsEditingOrigin(false)
    setShowOriginDropdown(false)
    setManualOrigin("")
  }

  // Location display text
  const originDisplayText = useMemo(() => {
    if (manualOrigin) return manualOrigin
    if (locationLoading) return "Detecting your location..."
    if (locationError) return "Location unavailable - tap to enter manually"
    if (nearestStageToGPS) return `Near ${nearestStageToGPS.name}`
    if (userLocation) return `${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}`
    return "Tap to enter your location"
  }, [manualOrigin, locationLoading, locationError, nearestStageToGPS, userLocation])

  const hasLocationError = locationError || (!locationLoading && !userLocation && !manualOrigin)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER SECTION - Fixed at top
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 border-b border-border bg-card px-4 py-3 space-y-3">

        {/* Your Location - GPS or Manual */}
        <div className="relative">
          {!isEditingOrigin ? (
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                hasLocationError ? "bg-destructive/5 border-destructive/30" : "bg-primary/5 border-primary/20",
                "hover:bg-primary/10"
              )}
              onClick={handleStartEditOrigin}
            >
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                hasLocationError ? "bg-destructive/10" : "bg-primary/10"
              )}>
                <MapPin className={cn("h-5 w-5", hasLocationError ? "text-destructive" : "text-primary")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Your Location</p>
                <p className={cn(
                  "font-medium truncate",
                  hasLocationError ? "text-destructive" : "text-foreground"
                )}>
                  {originDisplayText}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Edit3 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted border border-primary">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Enter your pickup location</p>
                <Input
                  placeholder="Search for a stage..."
                  value={manualOrigin}
                  onChange={(e) => {
                    setManualOrigin(e.target.value)
                    setShowOriginDropdown(true)
                  }}
                  onFocus={() => setShowOriginDropdown(true)}
                  autoFocus
                  className="border-0 p-0 h-7 text-base font-medium bg-transparent focus-visible:ring-0"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelEditOrigin}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Origin Autocomplete Dropdown */}
          {showOriginDropdown && isEditingOrigin && filteredOriginStages.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[10000] rounded-xl border border-border bg-card shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
              {filteredOriginStages.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => handleSelectOrigin(stage)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">{stage.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination Input */}
        <div className="relative">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <Navigation className="h-5 w-5 text-accent" />
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
                onBlur={() => setTimeout(() => setShowDestinationDropdown(false), 200)}
                className="border-0 p-0 h-7 text-base font-medium bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
            </div>
            {destination && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDestination("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Destination Autocomplete Dropdown */}
          {showDestinationDropdown && filteredDestinationStages.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[10000] rounded-xl border border-border bg-card shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
              {filteredDestinationStages.map((stage) => (
                <button
                  key={stage.id}
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur
                  onClick={() => handleSelectDestination(stage)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0"
                >
                  <Navigation className="h-4 w-4 text-accent" />
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
            🚌 {suggestedRoutes.length} Route{suggestedRoutes.length > 1 ? "s" : ""} Available
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
                      ? "bg-primary text-primary-foreground border-primary shadow-lg"
                      : "bg-card border-border hover:border-primary/50 hover:shadow"
                  )}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: route.color }}
                  />
                  <span className="font-medium text-sm">{route.name}</span>
                  <Badge
                    variant={selectedRouteId === route.id ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    <Bus className="h-3 w-3 mr-1" />
                    {route.vehicleCount}
                  </Badge>
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* No routes found message */}
      {originStage && destinationStage && suggestedRoutes.length === 0 && (
        <div className="flex-shrink-0 px-4 py-4 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
            <Bus className="h-5 w-5" />
            <p className="text-sm">No direct routes found between these locations</p>
          </div>
        </div>
      )}

      {/* Show prompt if no destination yet */}
      {!destinationStage && (
        <div className="flex-shrink-0 px-4 py-4 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Search className="h-5 w-5" />
            <p className="text-sm">Enter your destination to see available routes</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAP SECTION - Takes remaining space
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
            showUserLocation={!!userLocation}
            showGuidancePath={!!nearestStage && !!userLocation}
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

        {/* Vehicle Count on Map */}
        <div className="absolute top-2 left-2 z-10">
          <Badge variant="secondary" className="shadow-sm">
            <Bus className="h-3 w-3 mr-1" />
            {mapVehicles.length} vehicle{mapVehicles.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>
    </div>
  )
}
