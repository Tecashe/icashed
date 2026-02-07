"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// ─── Custom Vehicle Icon with Animation Support ───────────────
function createVehicleIcon(color: string, isSelected: boolean, isLive: boolean) {
  const size = isSelected ? 40 : 32
  const pulseClass = isLive ? "vehicle-pulse" : ""
  const svg = `
    <div class="vehicle-icon-wrapper ${pulseClass}">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" strokeWidth="2"/>
        <path d="M12 6L15 11H9L12 6Z" fill="white" stroke="none"/>
      </svg>
    </div>
  `
  return L.divIcon({
    html: svg,
    className: "vehicle-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function createStageIcon(isTerminal: boolean) {
  const size = isTerminal ? 18 : 12
  const color = isTerminal ? "hsl(160, 84%, 39%)" : "hsl(220, 10%, 46%)"
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
    className: "stage-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// ─── Types ────────────────────────────────────────────────────
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
}

export interface MapStage {
  name: string
  lat: number
  lng: number
  isTerminal: boolean
}

export interface MapRoute {
  id: string
  name: string
  color: string
  stages: MapStage[]
}

interface LeafletMapProps {
  vehicles: MapVehicle[]
  routes?: MapRoute[]
  selectedVehicleId?: string | null
  onVehicleClick?: (vehicle: MapVehicle) => void
  center?: [number, number]
  zoom?: number
  className?: string
  showRouteLines?: boolean
  enableAnimation?: boolean
}

// ─── Smooth Position Interpolation ────────────────────────────
function animateMarker(
  marker: L.Marker,
  targetLat: number,
  targetLng: number,
  duration: number = 500
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

// ─── Main Component ───────────────────────────────────────────
export function LeafletMap({
  vehicles,
  routes = [],
  selectedVehicleId,
  onVehicleClick,
  center = [-1.2921, 36.8219], // Nairobi CBD
  zoom = 12,
  className = "",
  showRouteLines = true,
  enableAnimation = true,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const vehiclePositionsRef = useRef<Map<string, { lat: number; lng: number }>>(new Map())
  const routeLayersRef = useRef<L.LayerGroup | null>(null)
  const [mounted, setMounted] = useState(false)

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    })

    // CartoDB dark theme tile layer
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
    mapRef.current = map
    setMounted(true)

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Draw route lines
  useEffect(() => {
    if (!mapRef.current || !routeLayersRef.current || !showRouteLines) return
    routeLayersRef.current.clearLayers()

    routes.forEach((route) => {
      if (route.stages.length < 2) return
      const latlngs: L.LatLngExpression[] = route.stages.map(
        (s) => [s.lat, s.lng] as L.LatLngExpression
      )

      // Route polyline
      L.polyline(latlngs, {
        color: route.color,
        weight: 4,
        opacity: 0.7,
        dashArray: "8 4",
      }).addTo(routeLayersRef.current!)

      // Stage markers
      route.stages.forEach((stage) => {
        L.marker([stage.lat, stage.lng], {
          icon: createStageIcon(stage.isTerminal),
        })
          .bindTooltip(stage.name, {
            direction: "top",
            offset: [0, -10],
            className: "stage-tooltip",
          })
          .addTo(routeLayersRef.current!)
      })
    })
  }, [routes, showRouteLines])

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
      const isLive = vehicle.isLive ?? true
      const icon = createVehicleIcon(vehicle.color || "#10B981", isSelected, isLive)
      const existingMarker = vehicleMarkersRef.current.get(vehicle.id)
      const prevPos = vehiclePositionsRef.current.get(vehicle.id)

      if (existingMarker) {
        // Animate to new position if enabled and position changed
        if (enableAnimation && prevPos &&
          (prevPos.lat !== vehicle.lat || prevPos.lng !== vehicle.lng)) {
          animateMarker(existingMarker, vehicle.lat, vehicle.lng, 800)
        } else {
          existingMarker.setLatLng([vehicle.lat, vehicle.lng])
        }
        existingMarker.setIcon(icon)
      } else {
        const marker = L.marker([vehicle.lat, vehicle.lng], { icon })
          .bindTooltip(
            `<div class="vehicle-tooltip">
              <strong>${vehicle.plateNumber}</strong>
              <span class="route-name">${vehicle.routeName}</span>
              <span class="speed">${Math.round(vehicle.speed)} km/h</span>
            </div>`,
            { direction: "top", offset: [0, -20], className: "vehicle-tip" }
          )
          .addTo(mapRef.current!)

        marker.on("click", () => {
          onVehicleClick?.(vehicle)
        })

        vehicleMarkersRef.current.set(vehicle.id, marker)
      }

      // Store current position for next animation
      vehiclePositionsRef.current.set(vehicle.id, { lat: vehicle.lat, lng: vehicle.lng })
    })
  }, [vehicles, selectedVehicleId, onVehicleClick, mounted, enableAnimation])

  // Pan to selected vehicle
  useEffect(() => {
    if (!mapRef.current || !selectedVehicleId) return
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId)
    if (vehicle) {
      mapRef.current.panTo([vehicle.lat, vehicle.lng], { animate: true, duration: 0.5 })
    }
  }, [selectedVehicleId, vehicles])

  return (
    <>
      <style jsx global>{`
        .vehicle-marker {
          background: none !important;
          border: none !important;
        }
        .vehicle-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .vehicle-pulse svg circle {
          animation: pulse-ring 2s ease-out infinite;
        }
        @keyframes pulse-ring {
          0% { stroke-width: 2; stroke-opacity: 1; }
          50% { stroke-width: 6; stroke-opacity: 0.5; }
          100% { stroke-width: 2; stroke-opacity: 1; }
        }
        .stage-marker {
          background: none !important;
          border: none !important;
        }
        .stage-tooltip,
        .vehicle-tip {
          font-size: 12px;
          font-weight: 500;
          background: hsl(220, 18%, 10%);
          color: hsl(0, 0%, 96%);
          border: 1px solid hsl(220, 14%, 18%);
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        .vehicle-tooltip {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .vehicle-tooltip .route-name {
          font-size: 11px;
          color: hsl(160, 72%, 45%);
        }
        .vehicle-tooltip .speed {
          font-size: 11px;
          color: hsl(220, 10%, 55%);
        }
        .stage-tooltip::before,
        .vehicle-tip::before {
          border-top-color: hsl(220, 18%, 10%) !important;
        }
        .leaflet-container {
          background: hsl(220, 20%, 7%);
        }
      `}</style>
      <div ref={containerRef} className={`h-full w-full ${className}`} />
    </>
  )
}
