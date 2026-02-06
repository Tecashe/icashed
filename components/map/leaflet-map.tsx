"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix default marker icon issue with webpack/next
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function createVehicleIcon(color: string, isSelected: boolean) {
  const size = isSelected ? 36 : 28
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" strokeWidth="2"/>
      <path d="M12 2L15 9H9L12 2Z" fill="white" stroke="none" transform="rotate(0 12 12)"/>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: "vehicle-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function createStageIcon(isTerminal: boolean) {
  const size = isTerminal ? 16 : 10
  const color = isTerminal ? "hsl(160, 84%, 39%)" : "hsl(220, 10%, 46%)"
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
    className: "stage-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

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
}

export function LeafletMap({
  vehicles,
  routes = [],
  selectedVehicleId,
  onVehicleClick,
  center = [-1.2921, 36.8219], // Nairobi CBD
  zoom = 12,
  className = "",
  showRouteLines = true,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const vehicleMarkersRef = useRef<Map<string, L.Marker>>(new Map())
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

    // Use CartoDB dark theme tile layer -- free, no API key
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
        weight: 3,
        opacity: 0.6,
        dashArray: "8 4",
      }).addTo(routeLayersRef.current!)

      // Stage markers
      route.stages.forEach((stage) => {
        L.marker([stage.lat, stage.lng], {
          icon: createStageIcon(stage.isTerminal),
        })
          .bindTooltip(stage.name, {
            direction: "top",
            offset: [0, -8],
            className: "stage-tooltip",
          })
          .addTo(routeLayersRef.current!)
      })
    })
  }, [routes, showRouteLines])

  // Update vehicle markers
  useEffect(() => {
    if (!mapRef.current || !mounted) return

    const currentIds = new Set(vehicles.map((v) => v.id))

    // Remove markers for vehicles no longer present
    vehicleMarkersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove()
        vehicleMarkersRef.current.delete(id)
      }
    })

    // Update or add vehicle markers
    vehicles.forEach((vehicle) => {
      const isSelected = selectedVehicleId === vehicle.id
      const icon = createVehicleIcon(vehicle.color || "#10B981", isSelected)
      const existingMarker = vehicleMarkersRef.current.get(vehicle.id)

      if (existingMarker) {
        existingMarker.setLatLng([vehicle.lat, vehicle.lng])
        existingMarker.setIcon(icon)
      } else {
        const marker = L.marker([vehicle.lat, vehicle.lng], { icon })
          .bindTooltip(
            `<strong>${vehicle.plateNumber}</strong><br/>${vehicle.routeName}<br/>${Math.round(vehicle.speed)} km/h`,
            { direction: "top", offset: [0, -16] }
          )
          .addTo(mapRef.current!)

        marker.on("click", () => {
          onVehicleClick?.(vehicle)
        })

        vehicleMarkersRef.current.set(vehicle.id, marker)
      }
    })
  }, [vehicles, selectedVehicleId, onVehicleClick, mounted])

  // Pan to selected vehicle
  useEffect(() => {
    if (!mapRef.current || !selectedVehicleId) return
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId)
    if (vehicle) {
      mapRef.current.panTo([vehicle.lat, vehicle.lng], { animate: true })
    }
  }, [selectedVehicleId, vehicles])

  return (
    <>
      <style jsx global>{`
        .vehicle-marker {
          background: none !important;
          border: none !important;
        }
        .stage-marker {
          background: none !important;
          border: none !important;
        }
        .stage-tooltip {
          font-size: 11px;
          font-weight: 500;
          background: hsl(220, 18%, 10%);
          color: hsl(0, 0%, 96%);
          border: 1px solid hsl(220, 14%, 18%);
          border-radius: 6px;
          padding: 4px 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        .stage-tooltip::before {
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
