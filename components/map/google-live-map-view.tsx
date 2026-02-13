"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import { formatDistanceToNow } from "date-fns"
import {
    Loader2,
    MapPin,
    Navigation,
    Bus,
    Crosshair,
    X,
    AlertTriangle,
    Footprints,
    Clock,
    Star,
    ImageIcon,
    MessageSquare,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    ChevronRight,
    Maximize2,
    Minimize2,
    Filter,
    Zap,
    ArrowRight,
    Layers,
    TrafficCone,
    Satellite,
    Moon,
    Sun,
    LocateFixed,
    Route,
    Car,
    ChevronUp,
    ChevronDown,
    Compass,
    Share2,
    Bookmark,
    Bell,
    Settings,
    Map as MapIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useRealtimePositions } from "@/hooks/use-realtime-positions"
import { useRoutes, type LivePosition } from "@/hooks/use-data"
import { useUserLocation } from "@/hooks/use-user-location"
import { findNearest, calculateDistance } from "@/lib/geo-utils"
import { getDistanceMatrix, type DistanceMatrixEntry } from "@/lib/google-directions"
import { cn } from "@/lib/utils"
import { GoogleMap, type MapVehicle, type MapRoute, type UserLocationData, type NearestStageData, type MapStage } from "@/components/map/google-map"
import { VehicleDetailsDrawer } from "@/components/map/vehicle-details-drawer"
import { ReviewForm } from "@/components/reviews/review-form"
import { StarRating } from "@/components/reviews/star-rating"
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// Constants
const STAGE_PROXIMITY_THRESHOLD = 500
const NEARBY_VEHICLE_RADIUS = 5000
const VERY_CLOSE_THRESHOLD = 500
const CLOSE_THRESHOLD = 1500
const DISTANCE_MATRIX_INTERVAL = 30_000 // 30 seconds

interface LiveMapViewProps {
    isFullScreen?: boolean
    onToggleFullScreen?: () => void
}

function calculateReliabilityScore(vehicleId: string): number {
    return 3.5 + Math.random() * 1.5
}

function calculateETA(distanceMeters: number, currentSpeed: number): number {
    if (currentSpeed < 5) return Math.ceil(distanceMeters / (20 * 1000 / 60))
    return Math.ceil(distanceMeters / (currentSpeed * 1000 / 60))
}

export function LiveMapView({ isFullScreen = false, onToggleFullScreen }: LiveMapViewProps) {
    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    // Search state
    const [manualOrigin, setManualOrigin] = useState("")
    const [isEditingOrigin, setIsEditingOrigin] = useState(false)
    const [showOriginDropdown, setShowOriginDropdown] = useState(false)
    const [destination, setDestination] = useState("")
    const [showDestinationDropdown, setShowDestinationDropdown] = useState(false)

    // Route & map state
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
    const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

    // UI state
    const [showVehicleDetails, setShowVehicleDetails] = useState(false)
    const [showMapSettings, setShowMapSettings] = useState(false)
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false)
    const [showReviewForm, setShowReviewForm] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    // Map feature toggles
    const [showTrafficLayer, setShowTrafficLayer] = useState(true)
    const [mapStyle, setMapStyle] = useState<"dark" | "light" | "satellite">("dark")
    const [showDistanceRings, setShowDistanceRings] = useState(true)
    const [filterBySpeed, setFilterBySpeed] = useState<"all" | "moving" | "stopped">("all")
    const [showOnlyReliable, setShowOnlyReliable] = useState(false)

    // Distance Matrix state: vehicleId -> { distanceMeters, durationSeconds }
    const [distanceMatrixResults, setDistanceMatrixResults] = useState<Map<string, DistanceMatrixEntry>>(new Map())
    const distanceMatrixTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Real-time data
    const { positions: allPositions, isRealtime, connectionState } = useRealtimePositions()
    const { data: routesData, isLoading: routesLoading } = useRoutes({ limit: 100 })
    const routes = routesData?.routes || []

    // User location
    const { location: userLocationRaw, isLoading: locationLoading, error: locationError, requestLocation } = useUserLocation({ watch: true })

    const userLocation: UserLocationData | null = useMemo(() => {
        if (!userLocationRaw) return null
        return {
            latitude: userLocationRaw.latitude,
            longitude: userLocationRaw.longitude,
            accuracy: userLocationRaw.accuracy,
        }
    }, [userLocationRaw])

    // ═══════════════════════════════════════════════════════════════════
    // COMPUTED DATA
    // ═══════════════════════════════════════════════════════════════════

    const allStages: MapStage[] = useMemo(() => {
        const stages: MapStage[] = []
        const seenIds = new Set<string>()
        routes.forEach(route => {
            route.stages?.forEach(stage => {
                // Skip routing-only waypoints from search/display
                if (stage.isWaypoint) return
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

    const filteredOriginStages = useMemo(() => {
        if (!manualOrigin.trim()) return allStages.slice(0, 5)
        const query = manualOrigin.toLowerCase()
        return allStages.filter(s => s.name.toLowerCase().includes(query)).slice(0, 5)
    }, [manualOrigin, allStages])

    const filteredDestStages = useMemo(() => {
        if (!destination.trim()) return []
        const query = destination.toLowerCase()
        return allStages.filter(s => s.name.toLowerCase().includes(query)).slice(0, 5)
    }, [destination, allStages])

    const nearestStageToGPS = useMemo(() => {
        if (!userLocation || allStages.length === 0) return null
        const stagesWithCoords = allStages.map(s => ({ ...s, latitude: s.lat, longitude: s.lng }))
        const nearest = findNearest(userLocation.latitude, userLocation.longitude, stagesWithCoords)
        return nearest?.location || null
    }, [userLocation, allStages])

    const distanceToNearestStage = useMemo(() => {
        if (!userLocation || !nearestStageToGPS) return null
        return calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            nearestStageToGPS.latitude,
            nearestStageToGPS.longitude
        )
    }, [userLocation, nearestStageToGPS])

    const isUserNearStage = distanceToNearestStage !== null && distanceToNearestStage <= STAGE_PROXIMITY_THRESHOLD

    const originStage = useMemo(() => {
        if (manualOrigin) {
            return allStages.find(s => s.name.toLowerCase() === manualOrigin.toLowerCase()) || null
        }
        if (nearestStageToGPS) {
            return { ...nearestStageToGPS, lat: nearestStageToGPS.latitude, lng: nearestStageToGPS.longitude } as MapStage
        }
        return null
    }, [manualOrigin, nearestStageToGPS, allStages])

    const destinationStage = useMemo(() => {
        return allStages.find(s => s.name.toLowerCase() === destination.toLowerCase()) || null
    }, [destination, allStages])

    const suggestedRoutes = useMemo(() => {
        if (!originStage || !destinationStage) return []
        return routes.filter(route => {
            const stageNames = route.stages?.map(s => s.name.toLowerCase()) || []
            const hasOrigin = stageNames.includes(originStage.name?.toLowerCase() || "")
            const hasDest = stageNames.includes(destinationStage.name.toLowerCase())
            return hasOrigin && hasDest
        }).map(route => {
            const vehicleCount = allPositions.filter(p => p.routes.some(r => r.id === route.id)).length
            const activeVehicleCount = allPositions.filter(p =>
                p.routes.some(r => r.id === route.id) && p.position.speed > 5
            ).length
            const vehiclesOnRoute = allPositions.filter(p => p.routes.some(r => r.id === route.id))
            const avgReliability = vehiclesOnRoute.length > 0
                ? vehiclesOnRoute.reduce((sum, v) => sum + calculateReliabilityScore(v.vehicleId), 0) / vehiclesOnRoute.length
                : 0
            return { ...route, vehicleCount, activeVehicleCount, avgReliability }
        }).sort((a, b) => {
            if (b.activeVehicleCount !== a.activeVehicleCount) return b.activeVehicleCount - a.activeVehicleCount
            if (b.vehicleCount !== a.vehicleCount) return b.vehicleCount - a.vehicleCount
            return b.avgReliability - a.avgReliability
        })
    }, [originStage, destinationStage, routes, allPositions])

    // Auto-select best route
    useEffect(() => {
        if (suggestedRoutes.length > 0 && !selectedRouteId) {
            const firstRoute = suggestedRoutes[0]
            setSelectedRouteId(firstRoute.id)
            if (firstRoute.stages.length > 0) {
                const midIndex = Math.floor(firstRoute.stages.length / 2)
                const midStage = firstRoute.stages[midIndex]
                setFlyToLocation({ lat: midStage.latitude, lng: midStage.longitude, zoom: 13 })
            }
        }
    }, [suggestedRoutes, selectedRouteId])

    useEffect(() => {
        setSelectedRouteId(null)
    }, [originStage?.name, destinationStage?.name])

    useEffect(() => {
        if (userLocation && !flyToLocation) {
            setFlyToLocation({ lat: userLocation.latitude, lng: userLocation.longitude, zoom: 14 })
        }
    }, [userLocation, flyToLocation])

    // ═══════════════════════════════════════════════════════════════════
    // VEHICLE DATA
    // ═══════════════════════════════════════════════════════════════════

    const activeVehicles = useMemo(() => {
        let filtered = allPositions

        if (selectedRouteId) {
            filtered = filtered.filter(p => p.routes.some(r => r.id === selectedRouteId))
        } else if (userLocation) {
            filtered = filtered.filter(v => {
                const distance = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    v.position.latitude,
                    v.position.longitude
                )
                return distance <= NEARBY_VEHICLE_RADIUS
            })
        }

        if (filterBySpeed === "moving") {
            filtered = filtered.filter(v => v.position.speed > 5)
        } else if (filterBySpeed === "stopped") {
            filtered = filtered.filter(v => v.position.speed <= 5)
        }

        if (showOnlyReliable) {
            filtered = filtered.filter(v => calculateReliabilityScore(v.vehicleId) >= 4.0)
        }

        return filtered
    }, [selectedRouteId, allPositions, userLocation, filterBySpeed, showOnlyReliable])

    // ═══════════════════════════════════════════════════════════════════
    // DISTANCE MATRIX — road distance + traffic-aware ETA
    // ═══════════════════════════════════════════════════════════════════

    useEffect(() => {
        if (!userLocation || activeVehicles.length === 0) return

        const fetchDistanceMatrix = async () => {
            try {
                const origins = activeVehicles.map((v) => ({
                    id: v.vehicleId,
                    lat: v.position.latitude,
                    lng: v.position.longitude,
                }))

                const destination = {
                    lat: userLocation.latitude,
                    lng: userLocation.longitude,
                }

                const results = await getDistanceMatrix(origins, destination)
                if (results.size > 0) {
                    setDistanceMatrixResults(results)
                }
            } catch (error) {
                console.warn("Distance Matrix fetch failed:", error)
            }
        }

        // Fetch immediately
        fetchDistanceMatrix()

        // Then every 30 seconds
        distanceMatrixTimerRef.current = setInterval(fetchDistanceMatrix, DISTANCE_MATRIX_INTERVAL)

        return () => {
            if (distanceMatrixTimerRef.current) {
                clearInterval(distanceMatrixTimerRef.current)
            }
        }
    }, [userLocation, activeVehicles])

    const mapVehicles: MapVehicle[] = useMemo(() => {
        return activeVehicles.map((v) => {
            const vehicleRoute = v.routes[0]
            const fullRoute = vehicleRoute ? routes.find(r => r.id === vehicleRoute.id) : null

            let originStageName: string | undefined
            let destinationStageName: string | undefined
            let nextStageName: string | undefined

            if (fullRoute && fullRoute.stages.length >= 2) {
                const sortedStages = [...fullRoute.stages].sort((a, b) => (a.order || 0) - (b.order || 0))
                originStageName = sortedStages[0].name
                destinationStageName = sortedStages[sortedStages.length - 1].name

                let minDist = Infinity
                let nextStage = null
                for (const stage of sortedStages) {
                    const dist = calculateDistance(
                        v.position.latitude,
                        v.position.longitude,
                        stage.latitude,
                        stage.longitude
                    )
                    if (dist < minDist) {
                        minDist = dist
                        nextStage = stage
                    }
                }
                nextStageName = nextStage?.name
            }

            let distanceFromUser: number | undefined
            let etaMinutes: number | undefined

            // Use Distance Matrix (road distance + traffic ETA) if available
            const dmResult = distanceMatrixResults.get(v.vehicleId)
            if (dmResult) {
                distanceFromUser = dmResult.distanceMeters
                const durationSec = dmResult.durationInTrafficSeconds || dmResult.durationSeconds
                etaMinutes = Math.ceil(durationSec / 60)
            } else if (userLocation) {
                // Fallback to Haversine + naive ETA
                distanceFromUser = calculateDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    v.position.latitude,
                    v.position.longitude
                )
                etaMinutes = calculateETA(distanceFromUser, v.position.speed)
            }

            return {
                id: v.vehicleId,
                plateNumber: v.plateNumber,
                nickname: v.nickname,
                type: v.type,
                lat: v.position.latitude,
                lng: v.position.longitude,
                speed: v.position.speed,
                heading: v.position.heading,
                color: vehicleRoute?.color || "#10B981",
                routeName: v.routes.map((r) => r.name).join(", "),
                isLive: true,
                originStageName,
                destinationStageName,
                nextStageName,
                distanceFromUser,
                etaMinutes,
                rating: calculateReliabilityScore(v.vehicleId),
            }
        })
    }, [activeVehicles, routes, userLocation, distanceMatrixResults])

    const nearbyVehiclesSorted = useMemo(() => {
        return mapVehicles
            .filter(v => v.distanceFromUser !== undefined)
            .sort((a, b) => (a.distanceFromUser || 999999) - (b.distanceFromUser || 999999))
    }, [mapVehicles])

    const veryCloseVehicles = useMemo(() => {
        return nearbyVehiclesSorted.filter(v =>
            v.distanceFromUser !== undefined && v.distanceFromUser < VERY_CLOSE_THRESHOLD
        )
    }, [nearbyVehiclesSorted])

    const mapRoutes: MapRoute[] = useMemo(() => {
        const filteredRoutes = selectedRouteId ? routes.filter(r => r.id === selectedRouteId) : []
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
                isWaypoint: s.isWaypoint || false,
                order: s.order,
            })),
        }))
    }, [routes, selectedRouteId])

    const nearestStage: NearestStageData | null = useMemo(() => {
        if (!userLocation || !nearestStageToGPS) return null
        const distance = distanceToNearestStage || 0
        const walkingTime = Math.ceil(distance / 80)
        return {
            stage: {
                id: nearestStageToGPS.id,
                name: nearestStageToGPS.name,
                lat: nearestStageToGPS.latitude,
                lng: nearestStageToGPS.longitude,
                isTerminal: nearestStageToGPS.isTerminal || false,
            },
            distance,
            walkingTime,
            direction: "N",
        }
    }, [userLocation, nearestStageToGPS, distanceToNearestStage])

    const selectedVehicle = useMemo(() => {
        return mapVehicles.find(v => v.id === selectedVehicleId)
    }, [mapVehicles, selectedVehicleId])

    // ═══════════════════════════════════════════════════════════════════
    // HANDLERS
    // ═══════════════════════════════════════════════════════════════════

    const handleSelectOrigin = (stage: MapStage) => {
        setManualOrigin(stage.name)
        setShowOriginDropdown(false)
        setIsEditingOrigin(false)
    }

    const handleSelectDest = (stage: MapStage) => {
        setDestination(stage.name)
        setShowDestinationDropdown(false)
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

    const handleVehicleClick = (vehicle: MapVehicle) => {
        setSelectedVehicleId(vehicle.id)
        setShowVehicleDetails(true)
        setFlyToLocation({ lat: vehicle.lat, lng: vehicle.lng, zoom: 16 })
    }

    const handleClearSearch = () => {
        setDestination("")
        setManualOrigin("")
        setSelectedRouteId(null)
        setSelectedVehicleId(null)
    }

    const originDisplayText = useMemo(() => {
        if (manualOrigin) return manualOrigin
        if (locationLoading) return "Detecting..."
        if (locationError) return "Tap to set"
        if (nearestStageToGPS) return nearestStageToGPS.name
        return "Your location"
    }, [manualOrigin, locationLoading, locationError, nearestStageToGPS])

    // Part 1 of render - continue in next file
    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* ═══════════════════════════════════════════════════════════════════
          PREMIUM HEADER - Collapsible with glassmorphism
      ═══════════════════════════════════════════════════════════════════ */}
            <div className={cn(
                "flex-shrink-0 border-b border-border/50 bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 relative z-30 transition-all duration-300",
                isHeaderCollapsed ? "pb-2" : "pb-3"
            )}>
                {/* Collapse toggle */}
                <button
                    onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-full p-1 shadow-lg hover:bg-muted transition-colors"
                >
                    {isHeaderCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                </button>

                <div className={cn("px-3 pt-2 space-y-2 transition-all duration-300", isHeaderCollapsed && "hidden")}>
                    {/* FROM / TO */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* FROM */}
                        <div className="relative">
                            <div
                                onClick={() => {
                                    setIsEditingOrigin(true)
                                    setShowOriginDropdown(true)
                                    setShowDestinationDropdown(false)
                                }}
                                className={cn(
                                    "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all h-12 active:scale-[0.98]",
                                    "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20",
                                    "hover:from-primary/15 hover:to-primary/10 hover:border-primary/30",
                                    "shadow-sm hover:shadow-md"
                                )}
                            >
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <MapPin className="h-4 w-4 text-primary-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-muted-foreground leading-none font-medium">FROM</p>
                                    <p className="text-sm font-semibold truncate">{originDisplayText}</p>
                                </div>
                            </div>

                            {showOriginDropdown && isEditingOrigin && (
                                <div className="absolute left-0 right-0 top-full mt-1 z-[100] rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                                    <div className="p-2 border-b border-border sticky top-0 bg-card">
                                        <Input
                                            placeholder="Search stage..."
                                            value={manualOrigin}
                                            onChange={(e) => setManualOrigin(e.target.value)}
                                            autoFocus
                                            className="h-9 text-sm rounded-lg"
                                        />
                                    </div>
                                    <ScrollArea className="max-h-60">
                                        {filteredOriginStages.length > 0 ? (
                                            filteredOriginStages.map((stage) => (
                                                <button
                                                    key={stage.id}
                                                    onClick={() => handleSelectOrigin(stage)}
                                                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/80 active:bg-muted text-sm transition-colors"
                                                >
                                                    <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                                    <span className="flex-1">{stage.name}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                                                No stages found
                                            </div>
                                        )}
                                    </ScrollArea>
                                    <button
                                        onClick={() => { setIsEditingOrigin(false); setShowOriginDropdown(false) }}
                                        className="flex w-full items-center justify-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:bg-muted border-t"
                                    >
                                        <X className="h-3 w-3" /> Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* TO */}
                        <div className="relative">
                            <div
                                onClick={() => {
                                    setShowDestinationDropdown(true)
                                    setShowOriginDropdown(false)
                                }}
                                className={cn(
                                    "flex items-center gap-2 p-2.5 rounded-xl border h-12 cursor-pointer active:scale-[0.98] transition-all",
                                    "bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20",
                                    "hover:from-accent/15 hover:to-accent/10 hover:border-accent/30",
                                    "shadow-sm hover:shadow-md"
                                )}
                            >
                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <Navigation className="h-4 w-4 text-accent-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-muted-foreground leading-none font-medium">TO</p>
                                    <Input
                                        placeholder="Where to?"
                                        value={destination}
                                        onChange={(e) => { setDestination(e.target.value); setShowDestinationDropdown(true) }}
                                        onFocus={() => { setShowDestinationDropdown(true); setShowOriginDropdown(false) }}
                                        className="border-0 p-0 h-5 text-sm font-semibold bg-transparent focus-visible:ring-0"
                                    />
                                </div>
                                {destination && (
                                    <button onClick={(e) => { e.stopPropagation(); setDestination("") }} className="p-1 active:scale-90">
                                        <X className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                )}
                            </div>

                            {showDestinationDropdown && filteredDestStages.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 z-[100] rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                                    <ScrollArea className="max-h-60">
                                        {filteredDestStages.map((stage) => (
                                            <button
                                                key={stage.id}
                                                onClick={() => handleSelectDest(stage)}
                                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/80 active:bg-muted text-sm transition-colors"
                                            >
                                                <Navigation className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                                                <span className="flex-1">{stage.name}</span>
                                            </button>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center gap-2">
                        {(manualOrigin || destination) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearSearch}
                                className="h-7 text-xs gap-1 rounded-lg"
                            >
                                <X className="h-3 w-3" /> Clear
                            </Button>
                        )}
                        <div className="flex-1" />

                        {/* Quick filter badges */}
                        <div className="flex gap-1">
                            <Badge
                                variant={filterBySpeed === "moving" ? "default" : "outline"}
                                className="cursor-pointer text-[10px] h-6 px-2"
                                onClick={() => setFilterBySpeed(filterBySpeed === "moving" ? "all" : "moving")}
                            >
                                <Zap className="h-2.5 w-2.5 mr-1" />
                                Moving
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Collapsed state mini header */}
                {isHeaderCollapsed && (
                    <div className="px-3 pt-2 flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-primary" />
                            <span className="truncate font-medium">{originDisplayText}</span>
                            {destination && (
                                <>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    <Navigation className="h-3.5 w-3.5 text-accent" />
                                    <span className="truncate font-medium">{destination}</span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Walking guidance */}
                {userLocation && nearestStageToGPS && !isUserNearStage && nearestStage && !isHeaderCollapsed && (
                    <div
                        className="mx-3 mt-2 flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-500/15 via-blue-600/10 to-blue-500/5 border border-blue-500/30 px-3 py-2.5 cursor-pointer active:scale-[0.99] transition-all shadow-sm"
                        onClick={() => setFlyToLocation({ lat: nearestStage.stage.lat, lng: nearestStage.stage.lng, zoom: 17 })}
                    >
                        <div className="relative flex-shrink-0">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                                <Footprints className="h-4 w-4 text-white" />
                            </div>
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500 border border-white" />
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Walk to stage</p>
                            <p className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate">{nearestStageToGPS.name}</p>
                        </div>
                        <div className="flex flex-col items-end text-xs text-blue-600/80 dark:text-blue-400/80">
                            <span>{distanceToNearestStage ? `${(distanceToNearestStage / 1000).toFixed(1)}km` : "—"}</span>
                            <span>{nearestStage.walkingTime} min</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-blue-500" />
                    </div>
                )}

                {/* At stage confirmation */}
                {userLocation && nearestStageToGPS && isUserNearStage && !isHeaderCollapsed && (
                    <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500/15 to-green-600/10 border border-green-500/30 px-3 py-2 text-sm">
                        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-green-700 dark:text-green-400 font-medium">
                            You're at <strong>{nearestStageToGPS.name}</strong>
                        </span>
                        <span className="ml-auto text-green-500">✓</span>
                    </div>
                )}
            </div>

            {/* Route suggestions */}
            {suggestedRoutes.length > 0 && (
                <div className="flex-shrink-0 border-b border-border/50 bg-card/30 backdrop-blur px-3 py-2 relative z-20">
                    <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">
                            {suggestedRoutes.length} Route{suggestedRoutes.length > 1 ? "s" : ""} Available
                        </p>
                        {suggestedRoutes.some(r => r.activeVehicleCount > 0) && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-green-500/10 text-green-600 border-green-500/20">
                                <Zap className="h-2.5 w-2.5 mr-0.5" />
                                {suggestedRoutes.reduce((sum, r) => sum + r.activeVehicleCount, 0)} active
                            </Badge>
                        )}
                    </div>
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex gap-2">
                            {suggestedRoutes.map((route) => (
                                <button
                                    key={route.id}
                                    onClick={() => handleSelectRoute(route.id)}
                                    className={cn(
                                        "flex flex-col items-start gap-1.5 px-3 py-2.5 rounded-xl border transition-all text-xs min-w-[150px] active:scale-[0.98]",
                                        selectedRouteId === route.id
                                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary shadow-lg shadow-primary/20"
                                            : "bg-card/50 border-border hover:border-primary/50 hover:bg-card"
                                    )}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: route.color }} />
                                        <span className="font-bold truncate flex-1">{route.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-full">
                                        <Badge variant={selectedRouteId === route.id ? "secondary" : "outline"} className="text-[9px] h-4 px-1.5">
                                            <Bus className="h-2.5 w-2.5 mr-0.5" />
                                            {route.vehicleCount}
                                        </Badge>
                                        {route.activeVehicleCount > 0 && (
                                            <Badge className="text-[9px] h-4 px-1.5 bg-green-500">
                                                <Zap className="h-2.5 w-2.5 mr-0.5" />
                                                {route.activeVehicleCount}
                                            </Badge>
                                        )}
                                        {route.avgReliability >= 4 && (
                                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            )}

            {/* No routes message */}
            {originStage && destinationStage && suggestedRoutes.length === 0 && (
                <div className="flex-shrink-0 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 relative z-10">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <p>No direct routes found. Try nearby stages.</p>
                    </div>
                </div>
            )}

            {/* Nearby vehicles panel */}
            {userLocation && !selectedRouteId && nearbyVehiclesSorted.length > 0 && (
                <div className="flex-shrink-0 border-b border-border/50 bg-gradient-to-r from-primary/5 via-background to-accent/5 px-3 py-2 relative z-10">
                    <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">
                            Vehicles Near You
                        </p>
                        {veryCloseVehicles.length > 0 && (
                            <Badge className="text-[9px] h-4 px-1.5 bg-green-500 animate-pulse">
                                {veryCloseVehicles.length} very close
                            </Badge>
                        )}
                    </div>
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex gap-2">
                            {nearbyVehiclesSorted.slice(0, 10).map((vehicle) => {
                                const isVeryClose = vehicle.distanceFromUser! < VERY_CLOSE_THRESHOLD
                                const isClose = vehicle.distanceFromUser! < CLOSE_THRESHOLD

                                return (
                                    <button
                                        key={vehicle.id}
                                        onClick={() => handleVehicleClick(vehicle)}
                                        className={cn(
                                            "flex flex-col items-start gap-1.5 px-3 py-2.5 rounded-xl border transition-all text-xs min-w-[140px] active:scale-[0.98]",
                                            isVeryClose
                                                ? "bg-gradient-to-br from-green-500/15 to-green-600/10 border-green-500/40 shadow-sm"
                                                : isClose
                                                    ? "bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30"
                                                    : "bg-card/50 border-border"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="h-2.5 w-2.5 rounded-full animate-pulse shadow-sm" style={{ backgroundColor: vehicle.color }} />
                                            <span className="font-bold truncate flex-1">{vehicle.plateNumber}</span>
                                            {vehicle.speed > 5 && <Zap className="h-3 w-3 text-green-500" />}
                                        </div>
                                        <div className="flex flex-col gap-0.5 w-full text-[10px] text-muted-foreground">
                                            <span className="truncate">{vehicle.routeName}</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "font-semibold",
                                                    isVeryClose ? "text-green-600 dark:text-green-400" : isClose ? "text-blue-600 dark:text-blue-400" : ""
                                                )}>
                                                    {vehicle.distanceFromUser! < 1000
                                                        ? `${Math.round(vehicle.distanceFromUser!)}m`
                                                        : `${(vehicle.distanceFromUser! / 1000).toFixed(1)}km`}
                                                </span>
                                                {vehicle.etaMinutes !== undefined && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{vehicle.etaMinutes} min</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
          MAP SECTION
      ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex-1 relative min-h-0" style={{ minHeight: '400px' }}>
                <GoogleMap
                    vehicles={mapVehicles}
                    routes={mapRoutes}
                    selectedVehicleId={selectedVehicleId}
                    selectedRouteId={selectedRouteId}
                    onVehicleClick={handleVehicleClick}
                    showRouteLines={true}
                    enableAnimation={true}
                    highlightActiveRoute={true}
                    userLocation={userLocation}
                    nearestStage={nearestStage}
                    showUserLocation={!!userLocation}
                    showGuidancePath={!!nearestStage && !isUserNearStage}
                    flyToLocation={flyToLocation}
                    showDistanceRings={showDistanceRings}
                    showTrafficLayer={showTrafficLayer}
                    mapStyle={mapStyle}
                />

                {/* Premium Floating Action Buttons */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
                    {/* Map settings popover */}
                    <Popover open={showMapSettings} onOpenChange={setShowMapSettings}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="h-11 w-11 rounded-full shadow-xl bg-card/90 backdrop-blur border border-border/50 hover:bg-card"
                            >
                                <Layers className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" side="left" align="end">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold">Map Style</h4>
                                    <div className="grid grid-cols-3 gap-1">
                                        {[
                                            { value: "dark", icon: Moon, label: "Dark" },
                                            { value: "light", icon: Sun, label: "Light" },
                                            { value: "satellite", icon: Satellite, label: "Sat" },
                                        ].map((style) => (
                                            <Button
                                                key={style.value}
                                                variant={mapStyle === style.value ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setMapStyle(style.value as typeof mapStyle)}
                                                className="flex-col h-auto py-2 gap-1"
                                            >
                                                <style.icon className="h-4 w-4" />
                                                <span className="text-[10px]">{style.label}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold">Layers</h4>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="traffic" className="text-sm flex items-center gap-2">
                                            <TrafficCone className="h-4 w-4 text-red-500" />
                                            Live Traffic
                                        </Label>
                                        <Switch
                                            id="traffic"
                                            checked={showTrafficLayer}
                                            onCheckedChange={setShowTrafficLayer}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="rings" className="text-sm flex items-center gap-2">
                                            <LocateFixed className="h-4 w-4 text-blue-500" />
                                            Distance Rings
                                        </Label>
                                        <Switch
                                            id="rings"
                                            checked={showDistanceRings}
                                            onCheckedChange={setShowDistanceRings}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold">Filter Vehicles</h4>
                                    <div className="flex gap-1">
                                        {(["all", "moving", "stopped"] as const).map((filter) => (
                                            <Button
                                                key={filter}
                                                variant={filterBySpeed === filter ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setFilterBySpeed(filter)}
                                                className="flex-1 text-xs capitalize"
                                            >
                                                {filter}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Center on user button */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    className="h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 active:scale-95 transition-all"
                                    onClick={handleCenterOnUser}
                                    disabled={locationLoading}
                                >
                                    {locationLoading ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <Crosshair className="h-6 w-6" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p>Center on my location</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Fullscreen toggle */}
                    {onToggleFullScreen && (
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-11 w-11 rounded-full shadow-xl bg-card/90 backdrop-blur border border-border/50 hover:bg-card active:scale-95"
                            onClick={onToggleFullScreen}
                        >
                            {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                    )}
                </div>

                {/* Status badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                    <Badge
                        variant={isRealtime ? "default" : "secondary"}
                        className={cn(
                            "shadow-lg text-xs bg-card/90 backdrop-blur border",
                            isRealtime ? "border-green-500/30" : "border-border/50"
                        )}
                    >
                        {isRealtime ? (
                            <><span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" /> Live</>
                        ) : (
                            <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Connecting</>
                        )}
                    </Badge>
                    {mapVehicles.length > 0 && (
                        <Badge variant="secondary" className="shadow-lg text-xs bg-card/90 backdrop-blur border border-border/50">
                            <Car className="h-3 w-3 mr-1" />
                            {mapVehicles.length}
                        </Badge>
                    )}
                    {showTrafficLayer && (
                        <Badge className="shadow-lg text-xs bg-red-500/90">
                            <TrafficCone className="h-3 w-3 mr-1" />
                            Traffic
                        </Badge>
                    )}
                </div>

                {/* Selected route info card */}
                {selectedRouteId && mapVehicles.length > 0 && (
                    <div className="absolute bottom-4 left-4 z-10 max-w-[220px]">
                        <div className="bg-card/95 backdrop-blur-xl rounded-xl border border-border/50 shadow-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full shadow-sm" style={{
                                    backgroundColor: routes.find(r => r.id === selectedRouteId)?.color
                                }} />
                                <span className="font-bold text-sm truncate">
                                    {routes.find(r => r.id === selectedRouteId)?.name}
                                </span>
                            </div>
                            <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span>Active vehicles</span>
                                    <span className="font-semibold text-foreground">
                                        <span className="text-green-500">{mapVehicles.filter(v => v.speed > 5).length}</span>
                                        /{mapVehicles.length}
                                    </span>
                                </div>
                                {nearbyVehiclesSorted.length > 0 && nearbyVehiclesSorted[0].distanceFromUser && (
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span>Nearest</span>
                                        <span className="font-semibold text-foreground">
                                            {nearbyVehiclesSorted[0].distanceFromUser < 1000
                                                ? `${Math.round(nearbyVehiclesSorted[0].distanceFromUser)}m`
                                                : `${(nearbyVehiclesSorted[0].distanceFromUser / 1000).toFixed(1)}km`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Vehicle Details Drawer */}
            <VehicleDetailsDrawer
                selectedVehicle={selectedVehicle || null}
                showVehicleDetails={showVehicleDetails}
                setShowVehicleDetails={setShowVehicleDetails}
                showReviewForm={showReviewForm}
                setShowReviewForm={setShowReviewForm}
                currentImageIndex={currentImageIndex}
                setCurrentImageIndex={setCurrentImageIndex}
                calculateReliabilityScore={calculateReliabilityScore}
                setFlyToLocation={setFlyToLocation}
            />
        </div>
    )
}
