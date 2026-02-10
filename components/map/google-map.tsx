"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { loadGoogleMaps } from "@/lib/google-maps-loader"
import { cn } from "@/lib/utils"

// ============================================================================
// TYPES
// ============================================================================

export interface MapVehicle {
    id: string
    plateNumber: string
    nickname?: string | null
    type: string
    lat: number
    lng: number
    speed: number
    heading: number
    color: string
    routeName: string
    isLive?: boolean
    progress?: number
    etaMinutes?: number
    nextStageName?: string
    originStageName?: string
    destinationStageName?: string
    distanceFromUser?: number
}

export interface MapStage {
    id?: string
    name: string
    lat: number
    lng: number
    isTerminal: boolean
    order?: number
}

export interface MapRoute {
    id: string
    name: string
    color: string
    stages: MapStage[]
    isActive?: boolean
}

export interface UserLocationData {
    latitude: number
    longitude: number
    accuracy?: number
}

export interface NearestStageData {
    stage: MapStage
    distance: number
    walkingTime: number
    direction: string
}

interface GoogleMapProps {
    vehicles: MapVehicle[]
    routes?: MapRoute[]
    selectedVehicleId?: string | null
    selectedRouteId?: string | null
    onVehicleClick?: (vehicle: MapVehicle) => void
    onStageClick?: (stage: MapStage, routeId: string) => void
    center?: { lat: number; lng: number }
    zoom?: number
    className?: string
    showRouteLines?: boolean
    showStageLabels?: boolean
    enableAnimation?: boolean
    highlightActiveRoute?: boolean
    userLocation?: UserLocationData | null
    nearestStage?: NearestStageData | null
    showUserLocation?: boolean
    showGuidancePath?: boolean
    flyToLocation?: { lat: number; lng: number; zoom?: number } | null
    showDistanceRings?: boolean
    showTrafficLayer?: boolean
    mapStyle?: "dark" | "light" | "satellite" | "terrain"
    onMapReady?: (map: google.maps.Map) => void
}

// ============================================================================
// PREMIUM DARK MAP STYLE
// ============================================================================

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#0f0f1a" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f0f1a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
    {
        featureType: "administrative",
        elementType: "geometry",
        stylers: [{ color: "#1f2937" }],
    },
    {
        featureType: "administrative.country",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca3af" }],
    },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d1d5db" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b7280" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#0d1f12" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#4ade80" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#1e293b" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#0f172a" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#334155" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1e293b" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f9fafb" }],
    },
    {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#1e293b" }],
    },
    {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d1d5db" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#0c1929" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#4b5563" }],
    },
]

const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#ffffff" }],
    },
    {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#e2e8f0" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#fef3c7" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#dbeafe" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#dcfce7" }],
    },
]

// ============================================================================
// VEHICLE MARKER HTML GENERATOR
// ============================================================================

function createVehicleMarkerHtml(vehicle: MapVehicle, isSelected: boolean): string {
    const size = isSelected ? 52 : 44
    const isLive = vehicle.isLive !== false
    const isMoving = vehicle.speed > 5

    // Vehicle type emoji/icon
    const vehicleEmoji = {
        MATATU: "🚐",
        BUS: "🚌",
        BODA: "🏍️",
        TUK_TUK: "🛺",
    }[vehicle.type] || "🚐"

    return `
    <div class="gmap-vehicle-marker ${isLive ? 'gmap-vehicle-live' : ''} ${isSelected ? 'gmap-vehicle-selected' : ''}" 
         style="--vehicle-color: ${vehicle.color}; transform: rotate(${vehicle.heading}deg);">
      <div class="gmap-vehicle-pulse-ring"></div>
      <div class="gmap-vehicle-pulse-ring gmap-vehicle-pulse-ring-2"></div>
      <div class="gmap-vehicle-body" style="width: ${size}px; height: ${size}px; background: linear-gradient(135deg, ${vehicle.color}, ${adjustColor(vehicle.color, -20)});">
        <span class="gmap-vehicle-emoji">${vehicleEmoji}</span>
      </div>
      ${isMoving ? `<div class="gmap-vehicle-speed">${Math.round(vehicle.speed)}</div>` : ''}
      ${isSelected ? '<div class="gmap-vehicle-selected-ring"></div>' : ''}
      <div class="gmap-vehicle-glow" style="background: ${vehicle.color};"></div>
    </div>
  `
}

function createStageMarkerHtml(
    stage: MapStage,
    index: number,
    totalStages: number,
    routeColor: string
): string {
    const isTerminal = stage.isTerminal || index === 0 || index === totalStages - 1
    const size = isTerminal ? 32 : 20
    const label = index === 0 ? "A" : index === totalStages - 1 ? "B" : ""

    return `
    <div class="gmap-stage-marker ${isTerminal ? 'gmap-stage-terminal' : ''}" 
         style="--stage-color: ${routeColor}; width: ${size}px; height: ${size}px;">
      ${isTerminal
            ? `<span class="gmap-stage-label">${label}</span>`
            : '<div class="gmap-stage-dot"></div>'}
      ${isTerminal ? '<div class="gmap-stage-pulse"></div>' : ''}
    </div>
  `
}

function createUserLocationMarkerHtml(): string {
    return `
    <div class="gmap-user-location">
      <div class="gmap-user-pulse"></div>
      <div class="gmap-user-pulse gmap-user-pulse-2"></div>
      <div class="gmap-user-dot"></div>
      <div class="gmap-user-heading"></div>
    </div>
  `
}

// Utility to adjust color brightness
function adjustColor(color: string, amount: number): string {
    const hex = color.replace("#", "")
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount))
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount))
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount))
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GoogleMap({
    vehicles,
    routes = [],
    selectedVehicleId,
    selectedRouteId,
    onVehicleClick,
    onStageClick,
    center = { lat: -1.2921, lng: 36.8219 }, // Nairobi CBD
    zoom = 13,
    className = "",
    showRouteLines = true,
    showStageLabels = true,
    enableAnimation = true,
    highlightActiveRoute = true,
    userLocation,
    nearestStage,
    showUserLocation = true,
    showGuidancePath = true,
    flyToLocation,
    showDistanceRings = false,
    showTrafficLayer = false,
    mapStyle = "dark",
    onMapReady,
}: GoogleMapProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)

    // Refs for map objects
    const vehicleMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
    const vehiclePositionsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map())
    const stageMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
    const routePolylinesRef = useRef<google.maps.Polyline[]>([])
    const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
    const accuracyCircleRef = useRef<google.maps.Circle | null>(null)
    const distanceRingsRef = useRef<google.maps.Circle[]>([])
    const guidancePathRef = useRef<google.maps.Polyline | null>(null)
    const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null)
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

    // Initialize map
    useEffect(() => {
        if (!mapRef.current) return

        let mounted = true

        async function initMap() {
            try {
                await loadGoogleMaps()

                if (!mounted || !mapRef.current) return

                const styles = mapStyle === "dark" ? DARK_MAP_STYLE : mapStyle === "light" ? LIGHT_MAP_STYLE : []

                // NOTE: When using mapId (required for AdvancedMarkerElement),
                // we cannot use the 'styles' property. Styling must be done in Cloud Console.
                // styles, 
                const map = new google.maps.Map(mapRef.current, {
                    center,
                    zoom,
                    mapId: "premium_transport_map", // Required for Advanced Markers
                    // styles, // Conflicting property removed
                    disableDefaultUI: true,
                    zoomControl: false,
                    mapTypeControl: false,
                    scaleControl: true,
                    streetViewControl: false,
                    rotateControl: false,
                    fullscreenControl: false,
                    clickableIcons: false,
                    gestureHandling: "greedy",
                    restriction: {
                        latLngBounds: {
                            north: 5,
                            south: -5,
                            west: 33,
                            east: 42,
                        },
                        strictBounds: false,
                    },
                })

                mapInstanceRef.current = map
                infoWindowRef.current = new google.maps.InfoWindow()

                setIsLoaded(true)
                onMapReady?.(map)
            } catch (error) {
                console.error("Failed to load Google Maps:", error)
                setLoadError("Failed to load map. Please check your connection.")
            }
        }

        initMap()

        return () => {
            mounted = false

            // Cleanup markers on unmount to prevent weird state
            if (vehicleMarkersRef.current) {
                vehicleMarkersRef.current.forEach((marker) => {
                    try { marker.map = null } catch (e) { }
                })
                vehicleMarkersRef.current.clear()
            }
            if (stageMarkersRef.current) {
                stageMarkersRef.current.forEach((marker) => {
                    try { marker.map = null } catch (e) { }
                })
                stageMarkersRef.current = []
            }
            if (userLocationMarkerRef.current) {
                try { userLocationMarkerRef.current.map = null } catch (e) { }
            }
        }
    }, [])

    // Handle traffic layer
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return

        if (showTrafficLayer) {
            if (!trafficLayerRef.current) {
                trafficLayerRef.current = new google.maps.TrafficLayer()
            }
            trafficLayerRef.current.setMap(mapInstanceRef.current)
        } else {
            trafficLayerRef.current?.setMap(null)
        }
    }, [showTrafficLayer, isLoaded])

    // Handle fly to location
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded || !flyToLocation) return

        mapInstanceRef.current.panTo({ lat: flyToLocation.lat, lng: flyToLocation.lng })
        if (flyToLocation.zoom) {
            mapInstanceRef.current.setZoom(flyToLocation.zoom)
        }
    }, [flyToLocation, isLoaded])

    // Draw routes
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded || !showRouteLines) return

        // Clear existing polylines
        routePolylinesRef.current.forEach((p) => p.setMap(null))
        routePolylinesRef.current = []

        // Clear existing stage markers
        stageMarkersRef.current.forEach((m) => {
            try {
                m.map = null
            } catch (e) {
                console.warn("Error removing stage marker:", e)
            }
        })
        stageMarkersRef.current = []

        routes.forEach((route) => {
            if (route.stages.length < 2) return

            const isSelected = route.id === selectedRouteId
            const isActive = route.isActive || isSelected

            const path = route.stages.map((s) => ({ lat: s.lat, lng: s.lng }))

            // Glow effect polyline
            if (isActive) {
                const glowLine = new google.maps.Polyline({
                    path,
                    geodesic: true,
                    strokeColor: route.color,
                    strokeOpacity: 0.3,
                    strokeWeight: 14,
                    map: mapInstanceRef.current!,
                })
                routePolylinesRef.current.push(glowLine)
            }

            // Main route line
            const mainLine = new google.maps.Polyline({
                path,
                geodesic: true,
                strokeColor: route.color,
                strokeOpacity: isActive ? 1 : 0.6,
                strokeWeight: isActive ? 6 : 3,
                map: mapInstanceRef.current!,
                icons: isActive ? [{
                    icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 3,
                        fillColor: "#ffffff",
                        fillOpacity: 1,
                        strokeColor: route.color,
                        strokeWeight: 1,
                    },
                    offset: "0",
                    repeat: "100px",
                }] : undefined,
            })
            routePolylinesRef.current.push(mainLine)

            // Stage markers
            if (showStageLabels) {
                route.stages.forEach((stage, index) => {
                    const markerContent = document.createElement("div")
                    markerContent.innerHTML = createStageMarkerHtml(stage, index, route.stages.length, route.color)

                    const marker = new google.maps.marker.AdvancedMarkerElement({
                        map: mapInstanceRef.current!,
                        position: { lat: stage.lat, lng: stage.lng },
                        content: markerContent,
                        title: stage.name,
                    })

                    marker.addListener("gmp-click", () => {
                        if (infoWindowRef.current) {
                            infoWindowRef.current.setContent(`
                <div style="padding: 8px; font-family: system-ui;">
                  <strong style="font-size: 14px;">${stage.name}</strong>
                  ${stage.isTerminal ? '<span style="margin-left: 8px; background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Terminal</span>' : ''}
                </div>
              `)
                            infoWindowRef.current.open(mapInstanceRef.current!, marker)
                        }
                        onStageClick?.(stage, route.id)
                    })

                    stageMarkersRef.current.push(marker)
                })
            }
        })
    }, [routes, selectedRouteId, showRouteLines, showStageLabels, isLoaded])

    // Update vehicle markers
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return

        const currentIds = new Set(vehicles.map((v) => v.id))

        // Remove markers for vehicles no longer present
        vehicleMarkersRef.current.forEach((marker, id) => {
            if (!currentIds.has(id)) {
                try {
                    marker.map = null
                } catch (e) {
                    console.warn("Error removing marker:", e)
                }
                vehicleMarkersRef.current.delete(id)
                vehiclePositionsRef.current.delete(id)
            }
        })

        // Update or add vehicle markers
        vehicles.forEach((vehicle) => {
            const isSelected = selectedVehicleId === vehicle.id
            const existingMarker = vehicleMarkersRef.current.get(vehicle.id)
            const prevPos = vehiclePositionsRef.current.get(vehicle.id)

            const markerContent = document.createElement("div")
            markerContent.innerHTML = createVehicleMarkerHtml(vehicle, isSelected)

            if (existingMarker) {
                // Update position with animation
                if (enableAnimation && prevPos) {
                    animateMarker(existingMarker, prevPos, { lat: vehicle.lat, lng: vehicle.lng })
                } else {
                    existingMarker.position = { lat: vehicle.lat, lng: vehicle.lng }
                }
                existingMarker.content = markerContent
            } else {
                // Create new marker
                const marker = new google.maps.marker.AdvancedMarkerElement({
                    map: mapInstanceRef.current!,
                    position: { lat: vehicle.lat, lng: vehicle.lng },
                    content: markerContent,
                    title: vehicle.plateNumber,
                    zIndex: 1000,
                })

                marker.addListener("gmp-click", () => {
                    const distanceText = vehicle.distanceFromUser !== undefined
                        ? vehicle.distanceFromUser < 1000
                            ? `${Math.round(vehicle.distanceFromUser)}m away`
                            : `${(vehicle.distanceFromUser / 1000).toFixed(1)}km away`
                        : ""

                    if (infoWindowRef.current) {
                        infoWindowRef.current.setContent(`
              <div style="padding: 12px; font-family: system-ui; min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <div style="width: 12px; height: 12px; border-radius: 50%; background: ${vehicle.color};"></div>
                  <strong style="font-size: 16px;">${vehicle.plateNumber}</strong>
                  ${vehicle.isLive ? '<span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 1.5s infinite;"></span>' : ''}
                </div>
                ${vehicle.originStageName && vehicle.destinationStageName ? `
                  <div style="margin-bottom: 8px; color: #6b7280; font-size: 13px;">
                    ${vehicle.originStageName} → ${vehicle.destinationStageName}
                  </div>
                ` : ''}
                <div style="display: flex; gap: 16px; font-size: 12px; color: #9ca3af;">
                  <span>⚡ ${Math.round(vehicle.speed)} km/h</span>
                  ${distanceText ? `<span>📍 ${distanceText}</span>` : ''}
                  ${vehicle.etaMinutes ? `<span>🕐 ${vehicle.etaMinutes} min</span>` : ''}
                </div>
              </div>
            `)
                        infoWindowRef.current.open(mapInstanceRef.current!, marker)
                    }
                    onVehicleClick?.(vehicle)
                })

                vehicleMarkersRef.current.set(vehicle.id, marker)
            }

            vehiclePositionsRef.current.set(vehicle.id, { lat: vehicle.lat, lng: vehicle.lng })
        })
    }, [vehicles, selectedVehicleId, onVehicleClick, enableAnimation, isLoaded])

    // User location marker
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return

        // Clear existing
        if (userLocationMarkerRef.current) {
            try {
                userLocationMarkerRef.current.map = null
            } catch (e) {
                console.warn("Error removing user marker:", e)
            }
        }
        accuracyCircleRef.current?.setMap(null)
        distanceRingsRef.current.forEach((r) => r.setMap(null))
        distanceRingsRef.current = []

        if (!showUserLocation || !userLocation) return

        // User marker
        const markerContent = document.createElement("div")
        markerContent.innerHTML = createUserLocationMarkerHtml()

        userLocationMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: { lat: userLocation.latitude, lng: userLocation.longitude },
            content: markerContent,
            zIndex: 2000,
        })

        // Accuracy circle
        if (userLocation.accuracy && userLocation.accuracy > 0) {
            accuracyCircleRef.current = new google.maps.Circle({
                map: mapInstanceRef.current,
                center: { lat: userLocation.latitude, lng: userLocation.longitude },
                radius: userLocation.accuracy,
                fillColor: "#3b82f6",
                fillOpacity: 0.1,
                strokeColor: "#3b82f6",
                strokeOpacity: 0.3,
                strokeWeight: 1,
            })
        }

        // Distance rings
        if (showDistanceRings) {
            const ringDistances = [500, 1000, 2000] // meters
            const ringColors = ["#22c55e", "#eab308", "#ef4444"]

            ringDistances.forEach((distance, i) => {
                const ring = new google.maps.Circle({
                    map: mapInstanceRef.current!,
                    center: { lat: userLocation.latitude, lng: userLocation.longitude },
                    radius: distance,
                    fillColor: "transparent",
                    strokeColor: ringColors[i],
                    strokeOpacity: 0.4,
                    strokeWeight: 2,
                    clickable: false,
                })
                distanceRingsRef.current.push(ring)
            })
        }
    }, [userLocation, showUserLocation, showDistanceRings, isLoaded])

    // Walking guidance path
    useEffect(() => {
        if (!mapInstanceRef.current || !isLoaded) return

        guidancePathRef.current?.setMap(null)

        if (!showGuidancePath || !userLocation || !nearestStage) return

        const path = [
            { lat: userLocation.latitude, lng: userLocation.longitude },
            { lat: nearestStage.stage.lat, lng: nearestStage.stage.lng },
        ]

        guidancePathRef.current = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: "#3b82f6",
            strokeOpacity: 0,
            strokeWeight: 4,
            map: mapInstanceRef.current,
            icons: [{
                icon: {
                    path: "M 0,-1 0,1",
                    strokeOpacity: 1,
                    strokeColor: "#3b82f6",
                    scale: 3,
                },
                offset: "0",
                repeat: "15px",
            }],
        })
    }, [userLocation, nearestStage, showGuidancePath, isLoaded])

    // Animation helper
    function animateMarker(
        marker: google.maps.marker.AdvancedMarkerElement,
        from: { lat: number; lng: number },
        to: { lat: number; lng: number },
        duration: number = 800
    ) {
        const startTime = performance.now()

        function animate(currentTime: number) {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)

            const lat = from.lat + (to.lat - from.lat) * eased
            const lng = from.lng + (to.lng - from.lng) * eased

            marker.position = { lat, lng }

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }

    if (loadError) {
        return (
            <div className={cn("flex items-center justify-center bg-muted/30", className)}>
                <div className="text-center p-4">
                    <p className="text-destructive font-medium">{loadError}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Please check your internet connection and try again.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <>
            <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           PREMIUM GOOGLE MAPS STYLES
        ═══════════════════════════════════════════════════════════════════ */

        .gmap-vehicle-marker {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .gmap-vehicle-marker:hover {
          transform: scale(1.1) rotate(var(--rotation, 0deg)) !important;
        }

        .gmap-vehicle-body {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.95);
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.4),
            0 0 30px var(--vehicle-color, #10b981),
            inset 0 -2px 10px rgba(0, 0, 0, 0.2);
          position: relative;
          z-index: 2;
        }

        .gmap-vehicle-emoji {
          font-size: 20px;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }

        .gmap-vehicle-glow {
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          opacity: 0.4;
          filter: blur(20px);
          z-index: 0;
        }

        .gmap-vehicle-live .gmap-vehicle-pulse-ring {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid var(--vehicle-color, #10b981);
          animation: gmap-pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          z-index: 0;
        }

        .gmap-vehicle-live .gmap-vehicle-pulse-ring-2 {
          animation-delay: 1s;
        }

        @keyframes gmap-pulse-ring {
          0% {
            transform: scale(0.5);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .gmap-vehicle-speed {
          position: absolute;
          bottom: -8px;
          right: -8px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          border: 2px solid #22c55e;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 700;
          color: #22c55e;
          font-family: system-ui;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          z-index: 3;
        }

        .gmap-vehicle-selected-ring {
          position: absolute;
          width: 64px;
          height: 64px;
          border: 3px solid #ffffff;
          border-radius: 50%;
          animation: gmap-selected-pulse 1.5s ease-in-out infinite;
          z-index: 1;
        }

        @keyframes gmap-selected-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.6;
          }
        }

        /* Stage Markers */
        .gmap-stage-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--stage-color, #10b981), color-mix(in srgb, var(--stage-color) 70%, black));
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .gmap-stage-marker:hover {
          transform: scale(1.2);
        }

        .gmap-stage-terminal {
          box-shadow: 
            0 2px 16px rgba(0, 0, 0, 0.5),
            0 0 20px var(--stage-color, #10b981);
        }

        .gmap-stage-label {
          font-size: 12px;
          font-weight: 700;
          color: white;
          font-family: system-ui;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .gmap-stage-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
        }

        .gmap-stage-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid var(--stage-color, #10b981);
          animation: gmap-pulse-ring 3s ease-in-out infinite;
        }

        /* User Location */
        .gmap-user-location {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
        }

        .gmap-user-dot {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border: 3px solid white;
          box-shadow: 
            0 2px 12px rgba(59, 130, 246, 0.5),
            0 0 20px rgba(59, 130, 246, 0.3);
          z-index: 2;
        }

        .gmap-user-pulse {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
          animation: gmap-user-pulse 2s ease-out infinite;
        }

        .gmap-user-pulse-2 {
          animation-delay: 1s;
        }

        @keyframes gmap-user-pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .gmap-user-heading {
          position: absolute;
          top: -4px;
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 12px solid #3b82f6;
          z-index: 3;
        }

        /* InfoWindow Styles */
        .gmap-info-window {
          padding: 0;
        }

        .gmap-info-window .gm-style-iw {
          padding: 0 !important;
        }

        /* Hide default Google Maps controls styling */
        .gm-style .gm-style-iw-c {
          padding: 0 !important;
          border-radius: 16px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        }

        .gm-style .gm-style-iw-d {
          overflow: hidden !important;
        }

        .gm-style .gm-style-iw-tc {
          display: none !important;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
            `}</style>

            <div className={cn("relative w-full h-full isolate", className)}>
                {/* Map Container - Managed by Google Maps */}
                <div
                    ref={mapRef}
                    id="google-map-container"
                    className="absolute inset-0 w-full h-full"
                    style={{ background: mapStyle === 'dark' ? '#0f0f1a' : '#f8fafc' }}
                />

                {/* Loading Grid - Managed by React */}
                {!isLoaded && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <p className="text-sm font-medium text-muted-foreground animate-pulse">Initializing Map...</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
