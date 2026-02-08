"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

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
  progress?: number // 0-100% along route
  etaMinutes?: number // ETA to terminus
  nextStageName?: string // Name of next stage
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
  isActive?: boolean // Highlight this route
}

export interface VehicleProgressOverlay {
  vehicleId: string
  routeId: string
  progress: number // 0-100
  traveledPath: [number, number][] // Already traveled portion
}

interface LeafletMapProps {
  vehicles: MapVehicle[]
  routes?: MapRoute[]
  selectedVehicleId?: string | null
  selectedRouteId?: string | null
  onVehicleClick?: (vehicle: MapVehicle) => void
  onStageClick?: (stage: MapStage, routeId: string) => void
  center?: [number, number]
  zoom?: number
  className?: string
  showRouteLines?: boolean
  showStageLabels?: boolean
  enableAnimation?: boolean
  highlightActiveRoute?: boolean
  vehicleProgress?: Map<string, VehicleProgressOverlay>
}

// ============================================================================
// VEHICLE ICONS
// ============================================================================

const VEHICLE_ICONS: Record<string, string> = {
  MATATU: `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10V5c0-1.1-.9-2-2-2H8C6.9 3 6 3.9 6 5v5l-2.5 1.1c-.8.2-1.5 1-1.5 1.9v3c0 .6.4 1 1 1h2" fill="currentColor"/><circle cx="7" cy="17" r="2" fill="white"/><circle cx="17" cy="17" r="2" fill="white"/>`,
  BUS: `<rect x="3" y="3" width="18" height="14" rx="2" fill="currentColor"/><rect x="5" y="5" width="4" height="4" rx="1" fill="white" opacity="0.8"/><rect x="10" y="5" width="4" height="4" rx="1" fill="white" opacity="0.8"/><rect x="15" y="5" width="4" height="4" rx="1" fill="white" opacity="0.8"/><circle cx="7" cy="19" r="2" fill="currentColor"/><circle cx="17" cy="19" r="2" fill="currentColor"/>`,
  BODA: `<circle cx="12" cy="12" r="8" fill="currentColor"/><circle cx="12" cy="12" r="4" fill="white"/>`,
  TUK_TUK: `<path d="M17 10l2.5 1c.8.3 1.5 1 1.5 1.9V16c0 .6-.4 1-1 1h-1" fill="currentColor"/><rect x="4" y="6" width="13" height="9" rx="2" fill="currentColor"/><circle cx="7" cy="17" r="2" fill="white"/><circle cx="14" cy="17" r="2" fill="white"/>`,
}

function createVehicleIcon(
  vehicle: MapVehicle,
  isSelected: boolean
): L.DivIcon {
  const size = isSelected ? 44 : 36
  const isLive = vehicle.isLive !== false
  const speedIntensity = Math.min(1, vehicle.speed / 60) // Max brightness at 60 km/h
  const opacity = isLive ? 0.9 + speedIntensity * 0.1 : 0.5

  // Rotate based on heading
  const rotation = vehicle.heading || 0

  // Get vehicle-specific icon or default
  const iconPath = VEHICLE_ICONS[vehicle.type] || VEHICLE_ICONS.MATATU

  const html = `
    <div class="vehicle-icon-container ${isLive ? 'vehicle-pulse' : ''}" style="transform: rotate(${rotation}deg);">
      <div class="vehicle-icon-bg" style="background: ${vehicle.color}; opacity: ${opacity};">
        <svg xmlns="http://www.w3.org/2000/svg" width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="${vehicle.color}" stroke="white" stroke-width="0">
          ${iconPath}
        </svg>
      </div>
      ${isSelected ? '<div class="vehicle-selected-ring"></div>' : ''}
      ${vehicle.speed > 0 && isLive ? `
        <div class="vehicle-speed-badge">${Math.round(vehicle.speed)}</div>
      ` : ''}
    </div>
  `

  return L.divIcon({
    html,
    className: "vehicle-marker-premium",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function createStageIcon(
  stage: MapStage,
  index: number,
  totalStages: number,
  routeColor: string,
  isPassed: boolean = false
): L.DivIcon {
  const isTerminal = stage.isTerminal || index === 0 || index === totalStages - 1
  const size = isTerminal ? 24 : 16

  // Terminal stages get special styling
  const bgColor = isTerminal
    ? routeColor
    : isPassed
      ? routeColor
      : "hsl(220, 14%, 25%)"

  const borderColor = isPassed || isTerminal ? "white" : "hsl(220, 14%, 40%)"
  const textColor = isTerminal || isPassed ? "white" : "hsl(220, 14%, 60%)"

  // Show number for terminal stages, dot for others
  const content = isTerminal
    ? `<span style="font-size: 10px; font-weight: 700; color: ${textColor};">${index === 0 ? 'A' : 'B'}</span>`
    : `<div style="width: 6px; height: 6px; border-radius: 50%; background: ${textColor};"></div>`

  const html = `
    <div class="stage-marker-premium ${isPassed ? 'stage-passed' : ''}" 
         style="width: ${size}px; height: ${size}px; background: ${bgColor}; border: 2px solid ${borderColor};">
      ${content}
    </div>
  `

  return L.divIcon({
    html,
    className: "stage-marker-container",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// ============================================================================
// ANIMATION UTILITIES
// ============================================================================

function animateMarker(
  marker: L.Marker,
  targetLat: number,
  targetLng: number,
  duration: number = 800
) {
  const start = marker.getLatLng()
  const startTime = performance.now()

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Ease out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - progress, 3)

    const lat = start.lat + (targetLat - start.lat) * eased
    const lng = start.lng + (targetLng - start.lng) * eased

    marker.setLatLng([lat, lng])

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  requestAnimationFrame(animate)
}

// ============================================================================
// ROUTE DRAWING UTILITIES
// ============================================================================

function createRoutePolyline(
  route: MapRoute,
  isActive: boolean,
  isHighlighted: boolean
): L.Polyline[] {
  const polylines: L.Polyline[] = []

  if (route.stages.length < 2) return polylines

  const coords: L.LatLngExpression[] = route.stages.map(s => [s.lat, s.lng])

  // Background glow for active routes
  if (isActive || isHighlighted) {
    const glowLine = L.polyline(coords, {
      color: route.color,
      weight: 12,
      opacity: 0.2,
      lineCap: "round",
      lineJoin: "round",
    })
    polylines.push(glowLine)
  }

  // Main route line
  const mainLine = L.polyline(coords, {
    color: route.color,
    weight: isActive ? 5 : 3,
    opacity: isActive ? 0.9 : 0.6,
    lineCap: "round",
    lineJoin: "round",
    dashArray: isActive ? undefined : "8 6",
  })
  polylines.push(mainLine)

  return polylines
}

function createDirectionArrows(
  route: MapRoute,
  map: L.Map
): L.Marker[] {
  const arrows: L.Marker[] = []

  if (route.stages.length < 2) return arrows

  // Add direction arrows every few segments
  for (let i = 0; i < route.stages.length - 1; i += 2) {
    const start = route.stages[i]
    const end = route.stages[i + 1]

    // Calculate midpoint
    const midLat = (start.lat + end.lat) / 2
    const midLng = (start.lng + end.lng) / 2

    // Calculate bearing
    const dLon = (end.lng - start.lng) * Math.PI / 180
    const lat1 = start.lat * Math.PI / 180
    const lat2 = end.lat * Math.PI / 180
    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360

    const arrowIcon = L.divIcon({
      html: `<div class="route-arrow" style="transform: rotate(${bearing}deg); color: ${route.color};">▶</div>`,
      className: "route-arrow-container",
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })

    arrows.push(L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }))
  }

  return arrows
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LeafletMap({
  vehicles,
  routes = [],
  selectedVehicleId,
  selectedRouteId,
  onVehicleClick,
  onStageClick,
  center = [-1.2921, 36.8219], // Nairobi CBD
  zoom = 12,
  className = "",
  showRouteLines = true,
  showStageLabels = true,
  enableAnimation = true,
  highlightActiveRoute = true,
  vehicleProgress,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const vehiclePositionsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map())
  // Track icon state to prevent unnecessary re-renders that break CSS animations
  const vehicleIconStateRef = useRef<Map<string, { isSelected: boolean; isLive: boolean; heading: number }>>(new Map())
  const routeLayersRef = useRef<L.LayerGroup | null>(null)
  const stageLayersRef = useRef<L.LayerGroup | null>(null)
  const progressLayersRef = useRef<L.LayerGroup | null>(null)
  const [mounted, setMounted] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    })

    // Premium dark theme tiles
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        subdomains: "abcd",
      }
    ).addTo(map)

    L.control.zoom({ position: "bottomright" }).addTo(map)
    L.control.attribution({ position: "bottomleft" }).addTo(map).addAttribution(
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
    )

    routeLayersRef.current = L.layerGroup().addTo(map)
    stageLayersRef.current = L.layerGroup().addTo(map)
    progressLayersRef.current = L.layerGroup().addTo(map)

    mapRef.current = map
    setMounted(true)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [center, zoom])

  // Draw routes
  useEffect(() => {
    if (!mapRef.current || !routeLayersRef.current || !stageLayersRef.current || !showRouteLines) return

    routeLayersRef.current.clearLayers()
    stageLayersRef.current.clearLayers()

    routes.forEach((route) => {
      if (route.stages.length < 2) return

      const isSelected = route.id === selectedRouteId
      const isActive = route.isActive || isSelected

      // Create route polylines
      const polylines = createRoutePolyline(route, isActive, highlightActiveRoute && isSelected)
      polylines.forEach(line => line.addTo(routeLayersRef.current!))

      // Add direction arrows for active routes
      if (isActive) {
        const arrows = createDirectionArrows(route, mapRef.current!)
        arrows.forEach(arrow => arrow.addTo(routeLayersRef.current!))
      }

      // Add stage markers
      route.stages.forEach((stage, index) => {
        const icon = createStageIcon(stage, index, route.stages.length, route.color)

        const marker = L.marker([stage.lat, stage.lng], { icon })

        // Tooltip with stage info
        const tooltipContent = `
          <div class="stage-tooltip-content">
            <strong>${stage.name}</strong>
            ${stage.isTerminal ? '<span class="terminal-badge">Terminal</span>' : ''}
          </div>
        `
        marker.bindTooltip(tooltipContent, {
          direction: "top",
          offset: [0, -12],
          className: "stage-tooltip",
        })

        if (onStageClick) {
          marker.on("click", () => onStageClick(stage, route.id))
        }

        marker.addTo(stageLayersRef.current!)
      })
    })
  }, [routes, selectedRouteId, showRouteLines, highlightActiveRoute, onStageClick])

  // Update vehicle markers with smooth animation
  useEffect(() => {
    if (!mapRef.current || !mounted) return

    const currentIds = new Set(vehicles.map((v) => v.id))

    // Remove markers for vehicles no longer present
    vehicleMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove()
        vehicleMarkersRef.current.delete(id)
        vehiclePositionsRef.current.delete(id)
      }
    })

    // Update or add vehicle markers
    vehicles.forEach((vehicle) => {
      const isSelected = selectedVehicleId === vehicle.id
      const isLive = vehicle.isLive !== false
      const existingMarker = vehicleMarkersRef.current.get(vehicle.id)
      const prevPos = vehiclePositionsRef.current.get(vehicle.id)
      const prevIconState = vehicleIconStateRef.current.get(vehicle.id)

      if (existingMarker) {
        // Animate to new position if enabled
        if (enableAnimation && prevPos &&
          (prevPos.lat !== vehicle.lat || prevPos.lng !== vehicle.lng)) {
          animateMarker(existingMarker, vehicle.lat, vehicle.lng, 800)
        } else {
          existingMarker.setLatLng([vehicle.lat, vehicle.lng])
        }

        // Only update icon if state changed - prevents CSS animation reset
        const needsIconUpdate = !prevIconState ||
          prevIconState.isSelected !== isSelected ||
          prevIconState.isLive !== isLive ||
          Math.abs(prevIconState.heading - (vehicle.heading || 0)) > 10 // Only update heading if changed significantly

        if (needsIconUpdate) {
          const icon = createVehicleIcon(vehicle, isSelected)
          existingMarker.setIcon(icon)
          vehicleIconStateRef.current.set(vehicle.id, { isSelected, isLive, heading: vehicle.heading || 0 })
        }
      } else {
        // Create new marker
        const icon = createVehicleIcon(vehicle, isSelected)
        const marker = L.marker([vehicle.lat, vehicle.lng], { icon, zIndexOffset: 1000 })
        vehicleIconStateRef.current.set(vehicle.id, { isSelected, isLive, heading: vehicle.heading || 0 })

        // Rich tooltip
        const tooltipHtml = `
          <div class="vehicle-tooltip-premium">
            <div class="tooltip-header">
              <strong>${vehicle.plateNumber}</strong>
              ${vehicle.isLive ? '<span class="live-dot"></span>' : ''}
            </div>
            <div class="tooltip-route">${vehicle.routeName}</div>
            <div class="tooltip-stats">
              <span class="stat"><span class="icon">⚡</span> ${Math.round(vehicle.speed)} km/h</span>
              ${vehicle.etaMinutes !== undefined ? `<span class="stat"><span class="icon">🕐</span> ${vehicle.etaMinutes} min</span>` : ''}
            </div>
            ${vehicle.nextStageName ? `<div class="tooltip-next">Next: ${vehicle.nextStageName}</div>` : ''}
          </div>
        `

        marker.bindTooltip(tooltipHtml, {
          direction: "top",
          offset: [0, -24],
          className: "vehicle-tip-premium",
        })

        marker.on("click", () => onVehicleClick?.(vehicle))
        marker.addTo(mapRef.current!)
        vehicleMarkersRef.current.set(vehicle.id, marker)
      }

      vehiclePositionsRef.current.set(vehicle.id, { lat: vehicle.lat, lng: vehicle.lng })
    })
  }, [vehicles, selectedVehicleId, onVehicleClick, mounted, enableAnimation])

  // Pan to selected vehicle
  useEffect(() => {
    if (!mapRef.current || !selectedVehicleId) return
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId)
    if (vehicle) {
      mapRef.current.flyTo([vehicle.lat, vehicle.lng], 15, {
        animate: true,
        duration: 0.8
      })
    }
  }, [selectedVehicleId, vehicles])

  // Fit map to show selected route
  useEffect(() => {
    if (!mapRef.current || !selectedRouteId) return
    const route = routes.find(r => r.id === selectedRouteId)
    if (route && route.stages.length > 0) {
      const bounds = L.latLngBounds(route.stages.map(s => [s.lat, s.lng]))
      mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: true })
    }
  }, [selectedRouteId, routes])

  return (
    <>
      <style jsx global>{`
        /* ─── Premium Vehicle Markers ─────────────────────────────── */
        .vehicle-marker-premium {
          background: none !important;
          border: none !important;
        }
        
        .vehicle-icon-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
        }
        
        .vehicle-icon-bg {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.3);
          transition: all 0.3s ease;
        }
        
        .vehicle-pulse .vehicle-icon-bg {
          animation: vehicle-pulse 2s ease-in-out infinite;
        }
        
        /* Live position indicator - prominent blinking dot */
        .vehicle-pulse::before {
          content: '';
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0) 70%);
          animation: gps-ping 1.5s ease-out infinite;
        }
        
        .vehicle-pulse::after {
          content: '';
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid rgba(16, 185, 129, 0.5);
          animation: gps-ring 2s ease-out infinite;
        }
        
        @keyframes gps-ping {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes gps-ring {
          0% { transform: scale(0.7); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 0.3; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        @keyframes vehicle-pulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.3); }
          50% { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.6); }
        }
        
        .vehicle-selected-ring {
          position: absolute;
          width: 52px;
          height: 52px;
          border: 2px solid white;
          border-radius: 50%;
          animation: selected-ring 1.5s ease-in-out infinite;
        }
        
        @keyframes selected-ring {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.5; }
        }
        
        .vehicle-speed-badge {
          position: absolute;
          bottom: -8px;
          right: -8px;
          background: hsl(220, 18%, 15%);
          border: 2px solid hsl(160, 84%, 39%);
          border-radius: 8px;
          padding: 1px 5px;
          font-size: 9px;
          font-weight: 700;
          color: hsl(160, 84%, 45%);
        }
        
        /* ─── Premium Stage Markers ───────────────────────────────── */
        .stage-marker-container {
          background: none !important;
          border: none !important;
        }
        
        .stage-marker-premium {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          transition: all 0.2s ease;
        }
        
        .stage-marker-premium:hover {
          transform: scale(1.2);
        }
        
        .stage-passed {
          opacity: 0.7;
        }
        
        /* ─── Route Arrows ────────────────────────────────────────── */
        .route-arrow-container {
          background: none !important;
          border: none !important;
        }
        
        .route-arrow {
          font-size: 10px;
          opacity: 0.6;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        /* ─── Tooltips ────────────────────────────────────────────── */
        .stage-tooltip,
        .vehicle-tip-premium {
          background: hsl(220, 18%, 10%) !important;
          border: 1px solid hsl(220, 14%, 20%) !important;
          border-radius: 12px !important;
          padding: 0 !important;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
        }
        
        .stage-tooltip .leaflet-tooltip-content,
        .vehicle-tip-premium .leaflet-tooltip-content {
          margin: 0;
        }
        
        .stage-tooltip-content {
          padding: 8px 12px;
          font-size: 12px;
          color: hsl(0, 0%, 90%);
        }
        
        .stage-tooltip-content strong {
          display: block;
          margin-bottom: 2px;
        }
        
        .terminal-badge {
          display: inline-block;
          background: hsl(160, 84%, 39%);
          color: white;
          font-size: 9px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          margin-top: 4px;
        }
        
        .vehicle-tooltip-premium {
          padding: 10px 14px;
          color: hsl(0, 0%, 90%);
        }
        
        .tooltip-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        
        .tooltip-header strong {
          font-size: 14px;
        }
        
        .live-dot {
          width: 8px;
          height: 8px;
          background: hsl(160, 84%, 45%);
          border-radius: 50%;
          animation: live-blink 1s infinite;
        }
        
        @keyframes live-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .tooltip-route {
          font-size: 11px;
          color: hsl(160, 72%, 50%);
          margin-bottom: 6px;
        }
        
        .tooltip-stats {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: hsl(220, 10%, 60%);
        }
        
        .tooltip-stats .stat {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .tooltip-stats .icon {
          font-size: 10px;
        }
        
        .tooltip-next {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid hsl(220, 14%, 20%);
          font-size: 10px;
          color: hsl(220, 10%, 50%);
        }
        
        /* ─── Map Container ───────────────────────────────────────── */
        .leaflet-container {
          background: hsl(220, 20%, 7%) !important;
          font-family: inherit;
        }
        
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        
        .leaflet-control-zoom a {
          background: hsl(220, 18%, 12%) !important;
          color: hsl(0, 0%, 90%) !important;
          border: none !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: hsl(220, 18%, 18%) !important;
        }
      `}</style>
      <div ref={containerRef} className={`h-full w-full ${className}`} />
    </>
  )
}
