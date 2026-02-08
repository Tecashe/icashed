// "use client"

// import { useState, useMemo, useCallback, Suspense, useEffect } from "react"
// import dynamic from "next/dynamic"
// import {
//   Loader2,
//   MapPin,
//   Navigation,
//   Bus,
//   RefreshCw,
//   Crosshair,
//   Edit3,
//   X,
//   AlertTriangle,
//   Footprints,
// } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Badge } from "@/components/ui/badge"
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
// import { useRealtimePositions } from "@/hooks/use-realtime-positions"
// import { useRoutes, type LivePosition } from "@/hooks/use-data"
// import { useUserLocation } from "@/hooks/use-user-location"
// import { findNearest, calculateDistance } from "@/lib/geo-utils"
// import { cn } from "@/lib/utils"
// import type { MapVehicle, MapRoute, UserLocationData, NearestStageData, MapStage } from "./leaflet-map"

// // Dynamic import for Leaflet
// const LeafletMap = dynamic(
//   () => import("./leaflet-map").then((m) => m.LeafletMap),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="flex h-full w-full items-center justify-center bg-muted/30">
//         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
//       </div>
//     ),
//   }
// )

// // Distance threshold for "at stage"
// const STAGE_PROXIMITY_THRESHOLD = 500 // 500m = at/near stage

// interface LiveMapViewProps {
//   isFullScreen?: boolean
//   onToggleFullScreen?: () => void
// }

// export function LiveMapView({ isFullScreen = false, onToggleFullScreen }: LiveMapViewProps) {
//   // Origin state - GPS or manual
//   const [manualOrigin, setManualOrigin] = useState("")
//   const [isEditingOrigin, setIsEditingOrigin] = useState(false)
//   const [showOriginDropdown, setShowOriginDropdown] = useState(false)

//   // Destination state
//   const [destination, setDestination] = useState("")
//   const [showDestinationDropdown, setShowDestinationDropdown] = useState(false)

//   // Route & map state
//   const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
//   const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

//   // Real-time data
//   const { positions: allPositions, isRealtime, connectionState } = useRealtimePositions()
//   const { data: routesData, isLoading: routesLoading } = useRoutes({ limit: 100 })
//   const routes = routesData?.routes || []

//   // User location
//   const { location: userLocationRaw, isLoading: locationLoading, error: locationError, requestLocation } = useUserLocation({ watch: true })

//   const userLocation: UserLocationData | null = useMemo(() => {
//     if (!userLocationRaw) return null
//     return {
//       latitude: userLocationRaw.latitude,
//       longitude: userLocationRaw.longitude,
//       accuracy: userLocationRaw.accuracy,
//     }
//   }, [userLocationRaw])

//   // All stages from routes
//   const allStages: MapStage[] = useMemo(() => {
//     const stages: MapStage[] = []
//     const seenIds = new Set<string>()
//     routes.forEach(route => {
//       route.stages?.forEach(stage => {
//         if (!seenIds.has(stage.id)) {
//           seenIds.add(stage.id)
//           stages.push({
//             id: stage.id,
//             name: stage.name,
//             lat: stage.latitude,
//             lng: stage.longitude,
//             isTerminal: stage.isTerminal || false,
//             order: stage.order,
//           })
//         }
//       })
//     })
//     return stages
//   }, [routes])

//   // Filter stages for autocomplete
//   const filteredOriginStages = useMemo(() => {
//     if (!manualOrigin.trim()) return allStages.slice(0, 5)
//     const query = manualOrigin.toLowerCase()
//     return allStages.filter(s => s.name.toLowerCase().includes(query)).slice(0, 5)
//   }, [manualOrigin, allStages])

//   const filteredDestStages = useMemo(() => {
//     if (!destination.trim()) return []
//     const query = destination.toLowerCase()
//     return allStages.filter(s => s.name.toLowerCase().includes(query)).slice(0, 5)
//   }, [destination, allStages])

//   // Find nearest stage to GPS
//   const nearestStageToGPS = useMemo(() => {
//     if (!userLocation || allStages.length === 0) return null
//     const stagesWithCoords = allStages.map(s => ({ ...s, latitude: s.lat, longitude: s.lng }))
//     const nearest = findNearest(userLocation.latitude, userLocation.longitude, stagesWithCoords)
//     return nearest?.location || null
//   }, [userLocation, allStages])

//   // Distance to nearest stage
//   const distanceToNearestStage = useMemo(() => {
//     if (!userLocation || !nearestStageToGPS) return null
//     return calculateDistance(
//       userLocation.latitude,
//       userLocation.longitude,
//       nearestStageToGPS.latitude,
//       nearestStageToGPS.longitude
//     )
//   }, [userLocation, nearestStageToGPS])

//   // Is user near a stage?
//   const isUserNearStage = distanceToNearestStage !== null && distanceToNearestStage <= STAGE_PROXIMITY_THRESHOLD

//   // Origin stage (manual or GPS-based)
//   const originStage = useMemo(() => {
//     if (manualOrigin) {
//       return allStages.find(s => s.name.toLowerCase() === manualOrigin.toLowerCase()) || null
//     }
//     if (nearestStageToGPS) {
//       return { ...nearestStageToGPS, lat: nearestStageToGPS.latitude, lng: nearestStageToGPS.longitude } as MapStage
//     }
//     return null
//   }, [manualOrigin, nearestStageToGPS, allStages])

//   // Destination stage
//   const destinationStage = useMemo(() => {
//     return allStages.find(s => s.name.toLowerCase() === destination.toLowerCase()) || null
//   }, [destination, allStages])

//   // Suggested routes connecting origin to destination
//   const suggestedRoutes = useMemo(() => {
//     if (!originStage || !destinationStage) return []
//     return routes.filter(route => {
//       const stageNames = route.stages?.map(s => s.name.toLowerCase()) || []
//       const hasOrigin = stageNames.includes(originStage.name?.toLowerCase() || "")
//       const hasDest = stageNames.includes(destinationStage.name.toLowerCase())
//       return hasOrigin && hasDest
//     }).map(route => {
//       const vehicleCount = allPositions.filter(p => p.routes.some(r => r.id === route.id)).length
//       return { ...route, vehicleCount }
//     })
//   }, [originStage, destinationStage, routes, allPositions])

//   // Auto-select first route
//   useEffect(() => {
//     if (suggestedRoutes.length > 0 && !selectedRouteId) {
//       const firstRoute = suggestedRoutes[0]
//       setSelectedRouteId(firstRoute.id)
//       if (firstRoute.stages.length > 0) {
//         const midIndex = Math.floor(firstRoute.stages.length / 2)
//         const midStage = firstRoute.stages[midIndex]
//         setFlyToLocation({ lat: midStage.latitude, lng: midStage.longitude, zoom: 13 })
//       }
//     }
//   }, [suggestedRoutes, selectedRouteId])

//   // Reset route on origin/dest change
//   useEffect(() => {
//     setSelectedRouteId(null)
//   }, [originStage?.name, destinationStage?.name])

//   // Vehicles for selected route (show all if no route selected)
//   const activeVehicles = useMemo(() => {
//     if (!selectedRouteId) return allPositions
//     return allPositions.filter(p => p.routes.some(r => r.id === selectedRouteId))
//   }, [selectedRouteId, allPositions])

//   // Transform vehicles for map - include origin, dest, distance
//   const mapVehicles: MapVehicle[] = useMemo(() => {
//     return activeVehicles.map((v) => {
//       const vehicleRoute = v.routes[0]
//       const fullRoute = vehicleRoute ? routes.find(r => r.id === vehicleRoute.id) : null

//       let originStageName: string | undefined
//       let destinationStageName: string | undefined

//       if (fullRoute && fullRoute.stages.length >= 2) {
//         const sortedStages = [...fullRoute.stages].sort((a, b) => (a.order || 0) - (b.order || 0))
//         originStageName = sortedStages[0].name
//         destinationStageName = sortedStages[sortedStages.length - 1].name
//       }

//       let distanceFromUser: number | undefined
//       if (userLocation) {
//         distanceFromUser = calculateDistance(
//           userLocation.latitude,
//           userLocation.longitude,
//           v.position.latitude,
//           v.position.longitude
//         )
//       }

//       return {
//         id: v.vehicleId,
//         plateNumber: v.plateNumber,
//         nickname: v.nickname,
//         type: v.type,
//         lat: v.position.latitude,
//         lng: v.position.longitude,
//         speed: v.position.speed,
//         heading: v.position.heading,
//         color: vehicleRoute?.color || "#10B981",
//         routeName: v.routes.map((r) => r.name).join(", "),
//         isLive: true, // Always show as live for visibility
//         originStageName,
//         destinationStageName,
//         distanceFromUser,
//       }
//     })
//   }, [activeVehicles, routes, userLocation])

//   // Map routes
//   const mapRoutes: MapRoute[] = useMemo(() => {
//     const filteredRoutes = selectedRouteId ? routes.filter(r => r.id === selectedRouteId) : []
//     return filteredRoutes.map((r) => ({
//       id: r.id,
//       name: r.name,
//       color: r.color,
//       isActive: true,
//       stages: r.stages.map((s) => ({
//         id: s.id,
//         name: s.name,
//         lat: s.latitude,
//         lng: s.longitude,
//         isTerminal: s.isTerminal,
//         order: s.order,
//       })),
//     }))
//   }, [routes, selectedRouteId])

//   // Nearest stage data for guidance path
//   const nearestStage: NearestStageData | null = useMemo(() => {
//     if (!userLocation || !nearestStageToGPS) return null
//     const distance = distanceToNearestStage || 0
//     const walkingTime = Math.ceil(distance / 80) // ~80m per minute
//     return {
//       stage: {
//         id: nearestStageToGPS.id,
//         name: nearestStageToGPS.name,
//         lat: nearestStageToGPS.latitude,
//         lng: nearestStageToGPS.longitude,
//         isTerminal: nearestStageToGPS.isTerminal || false,
//       },
//       distance,
//       walkingTime,
//       direction: "N",
//     }
//   }, [userLocation, nearestStageToGPS, distanceToNearestStage])

//   // Handlers
//   const handleSelectOrigin = (stage: MapStage) => {
//     setManualOrigin(stage.name)
//     setShowOriginDropdown(false)
//     setIsEditingOrigin(false)
//   }

//   const handleSelectDest = (stage: MapStage) => {
//     setDestination(stage.name)
//     setShowDestinationDropdown(false)
//     setFlyToLocation({ lat: stage.lat, lng: stage.lng, zoom: 14 })
//   }

//   const handleSelectRoute = (routeId: string) => {
//     setSelectedRouteId(routeId)
//     const route = routes.find(r => r.id === routeId)
//     if (route && route.stages.length > 0) {
//       const midStage = route.stages[Math.floor(route.stages.length / 2)]
//       setFlyToLocation({ lat: midStage.latitude, lng: midStage.longitude, zoom: 13 })
//     }
//   }

//   const handleCenterOnUser = () => {
//     if (userLocation) {
//       setFlyToLocation({ lat: userLocation.latitude, lng: userLocation.longitude, zoom: 15 })
//     } else {
//       requestLocation()
//     }
//   }

//   // Origin display text
//   const originDisplayText = useMemo(() => {
//     if (manualOrigin) return manualOrigin
//     if (locationLoading) return "Detecting..."
//     if (locationError) return "Tap to set"
//     if (nearestStageToGPS) return nearestStageToGPS.name
//     return "Your location"
//   }, [manualOrigin, locationLoading, locationError, nearestStageToGPS])

//   return (
//     <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
//       {/* ═══════════════════════════════════════════════════════════════════
//           COMPACT HEADER - Horizontal From/To
//       ═══════════════════════════════════════════════════════════════════ */}
//       <div className="flex-shrink-0 border-b border-border bg-card px-3 py-2 space-y-2">

//         {/* FROM / TO - Side by Side */}
//         <div className="grid grid-cols-2 gap-2">
//           {/* FROM */}
//           <div className="relative">
//             <div
//               onClick={() => { setIsEditingOrigin(true); setShowOriginDropdown(true) }}
//               className={cn(
//                 "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors h-11",
//                 locationError ? "bg-destructive/5 border-destructive/30" : "bg-primary/5 border-primary/20",
//                 "hover:bg-primary/10"
//               )}
//             >
//               <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
//                 <MapPin className="h-3.5 w-3.5 text-primary" />
//               </div>
//               <div className="flex-1 min-w-0">
//                 <p className="text-[10px] text-muted-foreground leading-none">From</p>
//                 <p className="text-sm font-medium truncate">{originDisplayText}</p>
//               </div>
//             </div>
//             {/* Origin Dropdown */}
//             {showOriginDropdown && isEditingOrigin && (
//               <div className="absolute left-0 right-0 top-full mt-1 z-[10000] rounded-lg border border-border bg-card shadow-xl overflow-hidden max-h-48 overflow-y-auto">
//                 <div className="p-2 border-b border-border">
//                   <Input
//                     placeholder="Search stage..."
//                     value={manualOrigin}
//                     onChange={(e) => setManualOrigin(e.target.value)}
//                     autoFocus
//                     className="h-8 text-sm"
//                   />
//                 </div>
//                 {filteredOriginStages.map((stage) => (
//                   <button
//                     key={stage.id}
//                     onClick={() => handleSelectOrigin(stage)}
//                     className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted text-sm"
//                   >
//                     <MapPin className="h-3 w-3 text-primary" />
//                     <span>{stage.name}</span>
//                   </button>
//                 ))}
//                 <button
//                   onClick={() => { setIsEditingOrigin(false); setShowOriginDropdown(false) }}
//                   className="flex w-full items-center justify-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:bg-muted border-t"
//                 >
//                   <X className="h-3 w-3" /> Cancel
//                 </button>
//               </div>
//             )}
//           </div>

//           {/* TO */}
//           <div className="relative">
//             <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted border-border h-11">
//               <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
//                 <Navigation className="h-3.5 w-3.5 text-accent" />
//               </div>
//               <div className="flex-1 min-w-0">
//                 <p className="text-[10px] text-muted-foreground leading-none">To</p>
//                 <Input
//                   placeholder="Destination..."
//                   value={destination}
//                   onChange={(e) => { setDestination(e.target.value); setShowDestinationDropdown(true) }}
//                   onFocus={() => setShowDestinationDropdown(true)}
//                   onBlur={() => setTimeout(() => setShowDestinationDropdown(false), 200)}
//                   className="border-0 p-0 h-5 text-sm font-medium bg-transparent focus-visible:ring-0"
//                 />
//               </div>
//               {destination && (
//                 <button onClick={() => setDestination("")} className="p-1">
//                   <X className="h-3 w-3 text-muted-foreground" />
//                 </button>
//               )}
//             </div>
//             {/* Destination Dropdown */}
//             {showDestinationDropdown && filteredDestStages.length > 0 && (
//               <div className="absolute left-0 right-0 top-full mt-1 z-[10000] rounded-lg border border-border bg-card shadow-xl overflow-hidden max-h-48 overflow-y-auto">
//                 {filteredDestStages.map((stage) => (
//                   <button
//                     key={stage.id}
//                     onMouseDown={(e) => e.preventDefault()}
//                     onClick={() => handleSelectDest(stage)}
//                     className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted text-sm"
//                   >
//                     <Navigation className="h-3 w-3 text-accent" />
//                     <span>{stage.name}</span>
//                   </button>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Stage Guidance - Show if user is FAR from nearest stage */}
//         {userLocation && nearestStageToGPS && !isUserNearStage && (
//           <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-sm">
//             <div className="relative flex-shrink-0">
//               <Footprints className="h-4 w-4 text-blue-500" />
//               <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
//                 <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
//                 <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
//               </span>
//             </div>
//             <div className="flex-1">
//               <span className="text-blue-700 dark:text-blue-400">
//                 Walk to <strong>{nearestStageToGPS.name}</strong>
//               </span>
//               <span className="text-blue-600/70 dark:text-blue-400/70 ml-1">
//                 ({distanceToNearestStage ? `${(distanceToNearestStage / 1000).toFixed(1)}km` : "—"} •
//                 {nearestStage?.walkingTime || "—"} min)
//               </span>
//             </div>
//           </div>
//         )}

//         {/* At Stage Confirmation */}
//         {userLocation && nearestStageToGPS && isUserNearStage && (
//           <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm">
//             <div className="h-4 w-4 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
//             <span className="text-green-700 dark:text-green-400">
//               You're at <strong>{nearestStageToGPS.name}</strong> ✓
//             </span>
//           </div>
//         )}
//       </div>

//       {/* ═══════════════════════════════════════════════════════════════════
//           ROUTE SUGGESTIONS
//       ═══════════════════════════════════════════════════════════════════ */}
//       {suggestedRoutes.length > 0 && (
//         <div className="flex-shrink-0 border-b border-border bg-card/50 px-3 py-2">
//           <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
//             🚌 {suggestedRoutes.length} Route{suggestedRoutes.length > 1 ? "s" : ""} Found
//           </p>
//           <ScrollArea className="w-full whitespace-nowrap">
//             <div className="flex gap-1.5">
//               {suggestedRoutes.map((route) => (
//                 <button
//                   key={route.id}
//                   onClick={() => handleSelectRoute(route.id)}
//                   className={cn(
//                     "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs",
//                     selectedRouteId === route.id
//                       ? "bg-primary text-primary-foreground border-primary shadow"
//                       : "bg-card border-border hover:border-primary/50"
//                   )}
//                 >
//                   <div className="h-2 w-2 rounded-full" style={{ backgroundColor: route.color }} />
//                   <span className="font-medium">{route.name}</span>
//                   <Badge variant={selectedRouteId === route.id ? "secondary" : "outline"} className="text-[10px] h-4 px-1">
//                     <Bus className="h-2.5 w-2.5 mr-0.5" />
//                     {route.vehicleCount}
//                   </Badge>
//                 </button>
//               ))}
//             </div>
//             <ScrollBar orientation="horizontal" />
//           </ScrollArea>
//         </div>
//       )}

//       {/* No routes message */}
//       {originStage && destinationStage && suggestedRoutes.length === 0 && (
//         <div className="flex-shrink-0 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20">
//           <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
//             <AlertTriangle className="h-4 w-4" />
//             <p>No direct routes between these locations</p>
//           </div>
//         </div>
//       )}

//       {/* ═══════════════════════════════════════════════════════════════════
//           MAP SECTION - Maximum space
//       ═══════════════════════════════════════════════════════════════════ */}
//       <div className="flex-1 relative min-h-0">
//         <Suspense fallback={<div className="flex h-full items-center justify-center bg-muted/30"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
//           <LeafletMap
//             vehicles={mapVehicles}
//             routes={mapRoutes}
//             selectedRouteId={selectedRouteId}
//             showRouteLines={true}
//             enableAnimation={true}
//             highlightActiveRoute={true}
//             userLocation={userLocation}
//             nearestStage={nearestStage}
//             showUserLocation={!!userLocation}
//             showGuidancePath={!!nearestStage && !isUserNearStage}
//             flyToLocation={flyToLocation}
//           />
//         </Suspense>

//         {/* Center on Me FAB */}
//         <Button
//           onClick={handleCenterOnUser}
//           size="icon"
//           className="absolute bottom-4 right-4 h-10 w-10 rounded-full shadow-lg z-10"
//         >
//           <Crosshair className="h-4 w-4" />
//         </Button>

//         {/* Connection Status */}
//         <div className="absolute top-2 right-2 z-10">
//           <Badge variant={isRealtime ? "default" : "secondary"} className="shadow-sm text-xs">
//             {isRealtime ? "🟢 Live" : "📡 Connecting"}
//           </Badge>
//         </div>

//         {/* Vehicle Count */}
//         <div className="absolute top-2 left-2 z-10">
//           <Badge variant="secondary" className="shadow-sm text-xs">
//             <Bus className="h-3 w-3 mr-1" />
//             {mapVehicles.length} vehicle{mapVehicles.length !== 1 ? "s" : ""}
//           </Badge>
//         </div>
//       </div>
//     </div>
//   )
// }

"use client"

import { useState, useMemo, useCallback, Suspense, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import {
  Loader2,
  MapPin,
  Navigation,
  Bus,
  RefreshCw,
  Crosshair,
  Edit3,
  X,
  AlertTriangle,
  Footprints,
  Clock,
  TrendingUp,
  Star,
  ChevronRight,
  Maximize2,
  Minimize2,
  Search,
  Filter,
  Zap,
  Users,
  MessageCircle,
  Share2,
  Bookmark,
  History,
  Route,
  ArrowRight,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

// Dynamic import for Leaflet
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

// Distance threshold for "at stage"
const STAGE_PROXIMITY_THRESHOLD = 500 // 500m = at/near stage
const NEARBY_VEHICLE_RADIUS = 5000 // 5km for showing nearby vehicles
const VERY_CLOSE_THRESHOLD = 500 // vehicles within 500m
const CLOSE_THRESHOLD = 1500 // vehicles within 1.5km

interface LiveMapViewProps {
  isFullScreen?: boolean
  onToggleFullScreen?: () => void
}

// Vehicle reliability score based on historical data (mock for now)
function calculateReliabilityScore(vehicleId: string): number {
  // In production, this would be based on:
  // - Punctuality history
  // - Completion rate
  // - User ratings
  // For now, return random score between 3-5
  return 3.5 + Math.random() * 1.5
}

// Estimate ETA based on distance and average speed
function calculateETA(distanceMeters: number, currentSpeed: number): number {
  if (currentSpeed < 5) return Math.ceil(distanceMeters / (20 * 1000 / 60)) // Assume 20 km/h if stationary
  return Math.ceil(distanceMeters / (currentSpeed * 1000 / 60))
}

export function LiveMapView({ isFullScreen = false, onToggleFullScreen }: LiveMapViewProps) {
  // ═══════════════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  // Origin state - GPS or manual
  const [manualOrigin, setManualOrigin] = useState("")
  const [isEditingOrigin, setIsEditingOrigin] = useState(false)
  const [showOriginDropdown, setShowOriginDropdown] = useState(false)

  // Destination state
  const [destination, setDestination] = useState("")
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false)

  // Route & map state
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

  // UI state
  const [showNearbyVehicles, setShowNearbyVehicles] = useState(false)
  const [showRouteSheet, setShowRouteSheet] = useState(false)
  const [showVehicleDetails, setShowVehicleDetails] = useState(false)
  const [filterBySpeed, setFilterBySpeed] = useState<"all" | "moving" | "stopped">("all")
  const [showOnlyReliable, setShowOnlyReliable] = useState(false)

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

  // All stages from routes
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

  // Filter stages for autocomplete
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

  // Find nearest stage to GPS
  const nearestStageToGPS = useMemo(() => {
    if (!userLocation || allStages.length === 0) return null
    const stagesWithCoords = allStages.map(s => ({ ...s, latitude: s.lat, longitude: s.lng }))
    const nearest = findNearest(userLocation.latitude, userLocation.longitude, stagesWithCoords)
    return nearest?.location || null
  }, [userLocation, allStages])

  // Distance to nearest stage
  const distanceToNearestStage = useMemo(() => {
    if (!userLocation || !nearestStageToGPS) return null
    return calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      nearestStageToGPS.latitude,
      nearestStageToGPS.longitude
    )
  }, [userLocation, nearestStageToGPS])

  // Is user near a stage?
  const isUserNearStage = distanceToNearestStage !== null && distanceToNearestStage <= STAGE_PROXIMITY_THRESHOLD

  // Origin stage (manual or GPS-based)
  const originStage = useMemo(() => {
    if (manualOrigin) {
      return allStages.find(s => s.name.toLowerCase() === manualOrigin.toLowerCase()) || null
    }
    if (nearestStageToGPS) {
      return { ...nearestStageToGPS, lat: nearestStageToGPS.latitude, lng: nearestStageToGPS.longitude } as MapStage
    }
    return null
  }, [manualOrigin, nearestStageToGPS, allStages])

  // Destination stage
  const destinationStage = useMemo(() => {
    return allStages.find(s => s.name.toLowerCase() === destination.toLowerCase()) || null
  }, [destination, allStages])

  // Suggested routes connecting origin to destination
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

      // Calculate average reliability
      const vehiclesOnRoute = allPositions.filter(p => p.routes.some(r => r.id === route.id))
      const avgReliability = vehiclesOnRoute.length > 0
        ? vehiclesOnRoute.reduce((sum, v) => sum + calculateReliabilityScore(v.vehicleId), 0) / vehiclesOnRoute.length
        : 0

      return { ...route, vehicleCount, activeVehicleCount, avgReliability }
    }).sort((a, b) => {
      // Sort by: 1) active vehicles, 2) total vehicles, 3) reliability
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

  // Reset route on origin/dest change
  useEffect(() => {
    setSelectedRouteId(null)
  }, [originStage?.name, destinationStage?.name])

  // ═══════════════════════════════════════════════════════════════════
  // VEHICLE FILTERING & SORTING
  // ═══════════════════════════════════════════════════════════════════

  const activeVehicles = useMemo(() => {
    let filtered = allPositions

    // Filter by route if selected
    if (selectedRouteId) {
      filtered = filtered.filter(p => p.routes.some(r => r.id === selectedRouteId))
    }
    // If no route selected but user has location, show nearby vehicles
    else if (userLocation) {
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

    // Filter by speed
    if (filterBySpeed === "moving") {
      filtered = filtered.filter(v => v.position.speed > 5)
    } else if (filterBySpeed === "stopped") {
      filtered = filtered.filter(v => v.position.speed <= 5)
    }

    // Filter by reliability
    if (showOnlyReliable) {
      filtered = filtered.filter(v => calculateReliabilityScore(v.vehicleId) >= 4.0)
    }

    return filtered
  }, [selectedRouteId, allPositions, userLocation, filterBySpeed, showOnlyReliable])

  // Transform vehicles for map - include origin, dest, distance, ETA
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

        // Find next stage based on vehicle position
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

      if (userLocation) {
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
      }
    })
  }, [activeVehicles, routes, userLocation])

  // Nearby vehicles sorted by distance
  const nearbyVehiclesSorted = useMemo(() => {
    return mapVehicles
      .filter(v => v.distanceFromUser !== undefined)
      .sort((a, b) => (a.distanceFromUser || 999999) - (b.distanceFromUser || 999999))
  }, [mapVehicles])

  // Very close vehicles (< 500m)
  const veryCloseVehicles = useMemo(() => {
    return nearbyVehiclesSorted.filter(v =>
      v.distanceFromUser !== undefined && v.distanceFromUser < VERY_CLOSE_THRESHOLD
    )
  }, [nearbyVehiclesSorted])

  // Map routes
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
        order: s.order,
      })),
    }))
  }, [routes, selectedRouteId])

  // Nearest stage data for guidance path
  const nearestStage: NearestStageData | null = useMemo(() => {
    if (!userLocation || !nearestStageToGPS) return null
    const distance = distanceToNearestStage || 0
    const walkingTime = Math.ceil(distance / 80) // ~80m per minute
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

  // Selected vehicle details
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

  // Origin display text
  const originDisplayText = useMemo(() => {
    if (manualOrigin) return manualOrigin
    if (locationLoading) return "Detecting..."
    if (locationError) return "Tap to set"
    if (nearestStageToGPS) return nearestStageToGPS.name
    return "Your location"
  }, [manualOrigin, locationLoading, locationError, nearestStageToGPS])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ═══════════════════════════════════════════════════════════════════
          COMPACT MOBILE-FIRST HEADER
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">

        {/* Search Bar - Collapsible on mobile */}
        <div className="px-3 py-2 space-y-2">
          {/* FROM / TO */}
          <div className="grid grid-cols-2 gap-2">
            {/* FROM */}
            <div className="relative">
              <div
                onClick={() => { setIsEditingOrigin(true); setShowOriginDropdown(true) }}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors h-11 active:scale-95",
                  locationError ? "bg-destructive/5 border-destructive/30" : "bg-primary/5 border-primary/20",
                  "hover:bg-primary/10"
                )}
              >
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none">From</p>
                  <p className="text-sm font-medium truncate">{originDisplayText}</p>
                </div>
              </div>
              {showOriginDropdown && isEditingOrigin && (
                <div className="absolute left-0 right-0 top-full mt-1 z-[10000] rounded-lg border border-border bg-card shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                  <div className="p-2 border-b border-border sticky top-0 bg-card">
                    <Input
                      placeholder="Search stage..."
                      value={manualOrigin}
                      onChange={(e) => setManualOrigin(e.target.value)}
                      autoFocus
                      className="h-8 text-sm"
                    />
                  </div>
                  <ScrollArea className="max-h-40">
                    {filteredOriginStages.map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => handleSelectOrigin(stage)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted text-sm active:bg-muted/80"
                      >
                        <MapPin className="h-3 w-3 text-primary" />
                        <span>{stage.name}</span>
                      </button>
                    ))}
                  </ScrollArea>
                  <button
                    onClick={() => { setIsEditingOrigin(false); setShowOriginDropdown(false) }}
                    className="flex w-full items-center justify-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:bg-muted border-t sticky bottom-0 bg-card"
                  >
                    <X className="h-3 w-3" /> Cancel
                  </button>
                </div>
              )}
            </div>

            {/* TO */}
            <div className="relative">
              <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted border-border h-11">
                <div className="h-7 w-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Navigation className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-none">To</p>
                  <Input
                    placeholder="Destination..."
                    value={destination}
                    onChange={(e) => { setDestination(e.target.value); setShowDestinationDropdown(true) }}
                    onFocus={() => setShowDestinationDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDestinationDropdown(false), 200)}
                    className="border-0 p-0 h-5 text-sm font-medium bg-transparent focus-visible:ring-0"
                  />
                </div>
                {destination && (
                  <button onClick={() => setDestination("")} className="p-1 active:scale-90">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              {showDestinationDropdown && filteredDestStages.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-[10000] rounded-lg border border-border bg-card shadow-xl overflow-hidden max-h-48">
                  <ScrollArea className="max-h-48">
                    {filteredDestStages.map((stage) => (
                      <button
                        key={stage.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectDest(stage)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted text-sm active:bg-muted/80"
                      >
                        <Navigation className="h-3 w-3 text-accent" />
                        <span>{stage.name}</span>
                      </button>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions - Mobile */}
          <div className="flex items-center gap-2">
            {(manualOrigin || destination) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="h-7 text-xs gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRouteSheet(true)}
              className="h-7 text-xs gap-1"
            >
              <Filter className="h-3 w-3" />
              Filter
            </Button>
          </div>
        </div>

        {/* Stage Guidance - Show if user is FAR from nearest stage */}
        {userLocation && nearestStageToGPS && !isUserNearStage && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-sm active:scale-95 cursor-pointer transition-transform"
            onClick={() => nearestStage && setFlyToLocation({ lat: nearestStage.stage.lat, lng: nearestStage.stage.lng, zoom: 16 })}>
            <div className="relative flex-shrink-0">
              <Footprints className="h-4 w-4 text-blue-500" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-blue-700 dark:text-blue-400 truncate block">
                Walk to <strong>{nearestStageToGPS.name}</strong>
              </span>
              <span className="text-blue-600/70 dark:text-blue-400/70 text-xs">
                {distanceToNearestStage ? `${(distanceToNearestStage / 1000).toFixed(1)}km` : "—"} •
                {nearestStage?.walkingTime || "—"} min walk
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-blue-500 flex-shrink-0" />
          </div>
        )}

        {/* At Stage Confirmation */}
        {userLocation && nearestStageToGPS && isUserNearStage && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm">
            <div className="h-4 w-4 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <span className="text-green-700 dark:text-green-400 flex-1">
              You're at <strong>{nearestStageToGPS.name}</strong> ✓
            </span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROUTE SUGGESTIONS - Horizontal Scroll
      ═══════════════════════════════════════════════════════════════════ */}
      {suggestedRoutes.length > 0 && (
        <div className="flex-shrink-0 border-b border-border bg-card/50 px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-medium text-muted-foreground">
              🚌 {suggestedRoutes.length} Route{suggestedRoutes.length > 1 ? "s" : ""} Available
            </p>
            {suggestedRoutes.some(r => r.activeVehicleCount > 0) && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
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
                    "flex flex-col items-start gap-1 px-3 py-2 rounded-lg border transition-all text-xs min-w-[140px] active:scale-95",
                    selectedRouteId === route.id
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-1.5 w-full">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: route.color }} />
                    <span className="font-semibold truncate flex-1">{route.name}</span>
                  </div>
                  <div className="flex items-center gap-2 w-full text-[10px]">
                    <Badge variant={selectedRouteId === route.id ? "secondary" : "outline"} className="text-[9px] h-4 px-1">
                      <Bus className="h-2.5 w-2.5 mr-0.5" />
                      {route.vehicleCount}
                    </Badge>
                    {route.activeVehicleCount > 0 && (
                      <Badge variant="default" className="text-[9px] h-4 px-1 bg-green-500">
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
        <div className="flex-shrink-0 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <p className="flex-1">No direct routes found. Try nearby stages.</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          NEARBY VEHICLES - Show when GPS active & no route selected
      ═══════════════════════════════════════════════════════════════════ */}
      {userLocation && !selectedRouteId && nearbyVehiclesSorted.length > 0 && (
        <div className="flex-shrink-0 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5 px-3 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-medium text-muted-foreground">
              📍 Vehicles Near You
            </p>
            {veryCloseVehicles.length > 0 && (
              <Badge variant="default" className="text-[9px] h-4 px-1 bg-green-500 animate-pulse">
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
                      "flex flex-col items-start gap-1 px-3 py-2 rounded-lg border transition-all text-xs min-w-[130px] active:scale-95",
                      isVeryClose
                        ? "bg-green-500/10 border-green-500/40 shadow-sm"
                        : isClose
                          ? "bg-blue-500/10 border-blue-500/30"
                          : "bg-card border-border"
                    )}
                  >
                    <div className="flex items-center gap-1.5 w-full">
                      <div className="h-2 w-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: vehicle.color }} />
                      <span className="font-semibold truncate flex-1">{vehicle.plateNumber}</span>
                      {vehicle.speed > 5 && (
                        <Zap className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 w-full text-[10px] text-muted-foreground">
                      <span className="truncate">{vehicle.routeName}</span>
                      <div className="flex items-center gap-1">
                        <span className={cn(
                          "font-medium",
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
          MAP SECTION - Maximum space, mobile optimized
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 relative min-h-0 touch-pan-y touch-pan-x">
        <Suspense fallback={
          <div className="flex h-full items-center justify-center bg-muted/30">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <LeafletMap
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
            showDistanceRings={!!userLocation}
          />
        </Suspense>

        {/* ───────────────────────────────────────────────────────────────
             FLOATING ACTION BUTTONS - Mobile Optimized
        ─────────────────────────────────────────────────────────────── */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
          {/* My Location - Primary FAB */}
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg active:scale-95"
            onClick={handleCenterOnUser}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Crosshair className="h-5 w-5" />
            )}
          </Button>

          {/* Full Screen Toggle */}
          {onToggleFullScreen && (
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full shadow-md active:scale-95"
              onClick={onToggleFullScreen}
            >
              {isFullScreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Connection Status & Stats - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <Badge variant={isRealtime ? "default" : "secondary"} className="shadow-sm text-[10px] bg-card/95 backdrop-blur">
            {isRealtime ? "🟢 Live" : "📡 Connecting"}
          </Badge>
          {mapVehicles.length > 0 && (
            <Badge variant="secondary" className="shadow-sm text-[10px] bg-card/95 backdrop-blur">
              <Bus className="h-3 w-3 mr-1" />
              {mapVehicles.length}
            </Badge>
          )}
        </div>

        {/* Quick Info Panel - Bottom Left, collapsible on mobile */}
        {selectedRouteId && mapVehicles.length > 0 && (
          <div className="absolute bottom-4 left-4 z-10 max-w-[200px]">
            <div className="bg-card/95 backdrop-blur rounded-lg border border-border shadow-lg p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{
                  backgroundColor: routes.find(r => r.id === selectedRouteId)?.color
                }} />
                <span className="font-semibold truncate">
                  {routes.find(r => r.id === selectedRouteId)?.name}
                </span>
              </div>
              <div className="space-y-1 text-[10px] text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Active vehicles:</span>
                  <span className="font-medium text-foreground">
                    {mapVehicles.filter(v => v.speed > 5).length}/{mapVehicles.length}
                  </span>
                </div>
                {nearbyVehiclesSorted.length > 0 && nearbyVehiclesSorted[0].distanceFromUser && (
                  <div className="flex items-center justify-between">
                    <span>Nearest:</span>
                    <span className="font-medium text-foreground">
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

      {/* ═══════════════════════════════════════════════════════════════════
          VEHICLE DETAILS DRAWER - Mobile Bottom Sheet
      ═══════════════════════════════════════════════════════════════════ */}
      <Drawer open={showVehicleDetails} onOpenChange={setShowVehicleDetails}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full animate-pulse" style={{
                backgroundColor: selectedVehicle?.color
              }} />
              {selectedVehicle?.plateNumber}
              {selectedVehicle?.nickname && (
                <span className="text-sm text-muted-foreground">({selectedVehicle.nickname})</span>
              )}
            </DrawerTitle>
            <DrawerDescription>
              {selectedVehicle?.routeName}
            </DrawerDescription>
          </DrawerHeader>

          {selectedVehicle && (
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* Live Status */}
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Live • {Math.round(selectedVehicle.speed)} km/h
                </span>
              </div>

              {/* Distance & ETA */}
              {selectedVehicle.distanceFromUser !== undefined && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-card border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Distance</p>
                    <p className="text-lg font-bold">
                      {selectedVehicle.distanceFromUser < 1000
                        ? `${Math.round(selectedVehicle.distanceFromUser)}m`
                        : `${(selectedVehicle.distanceFromUser / 1000).toFixed(1)}km`}
                    </p>
                  </div>
                  {selectedVehicle.etaMinutes !== undefined && (
                    <div className="p-3 bg-card border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">ETA</p>
                      <p className="text-lg font-bold flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {selectedVehicle.etaMinutes} min
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Route Info */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Route Information</p>
                <div className="p-3 bg-card border rounded-lg space-y-2">
                  {selectedVehicle.originStageName && selectedVehicle.destinationStageName && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="truncate">{selectedVehicle.originStageName}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <Navigation className="h-4 w-4 text-accent flex-shrink-0" />
                      <span className="truncate">{selectedVehicle.destinationStageName}</span>
                    </div>
                  )}
                  {selectedVehicle.nextStageName && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Next stop:</span>
                      <span className="font-medium text-foreground">{selectedVehicle.nextStageName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reliability Score */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Reliability</p>
                <div className="p-3 bg-card border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i < Math.floor(calculateReliabilityScore(selectedVehicle.id))
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {calculateReliabilityScore(selectedVehicle.id).toFixed(1)}/5.0
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Based on punctuality and user ratings
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" className="gap-2">
                  <Bookmark className="h-4 w-4" />
                  Save
                </Button>
              </div>

              {/* Center on Map */}
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setFlyToLocation({ lat: selectedVehicle.lat, lng: selectedVehicle.lng, zoom: 16 })
                  setShowVehicleDetails(false)
                }}
              >
                <MapPin className="h-4 w-4" />
                Center on Map
              </Button>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* ═══════════════════════════════════════════════════════════════════
          FILTER SHEET - Mobile Bottom Sheet
      ═══════════════════════════════════════════════════════════════════ */}
      <Drawer open={showRouteSheet} onOpenChange={setShowRouteSheet}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filter Vehicles</DrawerTitle>
            <DrawerDescription>Customize what you see on the map</DrawerDescription>
          </DrawerHeader>

          <div className="p-4 space-y-4">
            {/* Speed Filter */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Vehicle Status</p>
              <div className="grid grid-cols-3 gap-2">
                {(["all", "moving", "stopped"] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={filterBySpeed === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterBySpeed(filter)}
                    className="capitalize"
                  >
                    {filter === "moving" && <Zap className="h-3 w-3 mr-1" />}
                    {filter}
                  </Button>
                ))}
              </div>
            </div>

            {/* Reliability Filter */}
            <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium">Show only reliable vehicles</span>
              </div>
              <Button
                variant={showOnlyReliable ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyReliable(!showOnlyReliable)}
              >
                {showOnlyReliable ? "On" : "Off"}
              </Button>
            </div>

            {/* Stats */}
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Vehicles shown:</span>
                <span className="font-medium text-foreground">{mapVehicles.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Active (moving):</span>
                <span className="font-medium text-foreground">
                  {mapVehicles.filter(v => v.speed > 5).length}
                </span>
              </div>
              {nearbyVehiclesSorted.length > 0 && (
                <div className="flex justify-between">
                  <span>Near you (&lt;5km):</span>
                  <span className="font-medium text-foreground">{nearbyVehiclesSorted.length}</span>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={() => setShowRouteSheet(false)}
            >
              Apply Filters
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}