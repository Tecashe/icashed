"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { useMyVehicles } from "@/hooks/use-data"
import { apiPost } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Navigation,
  Loader2,
  Power,
  PowerOff,
  MapPin,
  Clock,
  Bus,
  Gauge,
  Wifi,
  WifiOff,
} from "lucide-react"
import type { MapVehicle } from "@/components/map/leaflet-map"
import { cn } from "@/lib/utils"

const LeafletMap = dynamic(
  () => import("@/components/map/leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

export default function DriverTrackingPage() {
  const { data } = useMyVehicles()
  const vehicles = data?.vehicles || []

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("")
  const [tracking, setTracking] = useState(false)
  const [position, setPosition] = useState<{
    lat: number
    lng: number
    speed: number
    heading: number
    accuracy: number
  } | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [updateCount, setUpdateCount] = useState(0)
  const watchRef = useRef<number | null>(null)

  // Auto-select first vehicle
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id)
    }
  }, [vehicles, selectedVehicleId])

  const sendPosition = useCallback(
    async (pos: GeolocationPosition) => {
      if (!selectedVehicleId) return
      const { latitude, longitude, speed, heading, accuracy } = pos.coords
      const spd = speed ? Math.round(speed * 3.6) : 0
      const hdg = heading ?? 0

      setPosition({ lat: latitude, lng: longitude, speed: spd, heading: hdg, accuracy: accuracy ?? 0 })

      try {
        await apiPost("/api/driver/position", {
          vehicleId: selectedVehicleId,
          latitude,
          longitude,
          speed: spd,
          heading: Math.round(hdg),
        })
        setLastUpdate(new Date())
        setUpdateCount((c) => c + 1)
      } catch {
        // Silent retry next tick
      }
    },
    [selectedVehicleId]
  )

  const startTracking = useCallback(() => {
    if (!selectedVehicleId) {
      toast.error("Select a vehicle first")
      return
    }
    if (!navigator.geolocation) {
      toast.error("GPS not supported on this device")
      return
    }

    setTracking(true)
    setUpdateCount(0)

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)
    toast.success("You're now LIVE!", {
      description: `Passengers can see ${selectedVehicle?.plateNumber}`,
    })

    watchRef.current = navigator.geolocation.watchPosition(
      sendPosition,
      (err) => {
        toast.error("GPS Error", { description: err.message })
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )
  }, [selectedVehicleId, vehicles, sendPosition])

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

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)

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
        color: "#10B981",
        routeName: "You",
        isLive: true,
      },
    ]
    : []

  return (
    <div className="flex flex-col gap-6">
      {/* Header - Simple */}
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Live Tracking
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Let passengers find you on the map
        </p>
      </div>

      {/* Vehicle Selector */}
      {!tracking && (
        <Card>
          <CardContent className="p-4">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Select Vehicle
            </label>
            <Select
              value={selectedVehicleId}
              onValueChange={setSelectedVehicleId}
              disabled={tracking}
            >
              <SelectTrigger className="h-14 text-base">
                <SelectValue placeholder="Choose your vehicle..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="py-3">
                    <div className="flex items-center gap-2">
                      <Bus className="h-5 w-5" />
                      <span className="font-medium">{v.plateNumber}</span>
                      {v.nickname && (
                        <span className="text-muted-foreground">- {v.nickname}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* BIG START/STOP BUTTON */}
      <div className="flex flex-col items-center gap-4">
        {tracking ? (
          <button
            type="button"
            onClick={stopTracking}
            className="group relative flex h-40 w-40 items-center justify-center rounded-full bg-destructive shadow-lg shadow-destructive/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-destructive/40 active:scale-95"
          >
            <PowerOff className="h-16 w-16 text-destructive-foreground" />
            <span className="absolute -bottom-8 text-sm font-semibold text-destructive">
              TAP TO STOP
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={startTracking}
            disabled={!selectedVehicleId}
            className={cn(
              "group relative flex h-40 w-40 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95",
              selectedVehicleId
                ? "bg-primary shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                : "bg-muted cursor-not-allowed"
            )}
          >
            <Power className={cn(
              "h-16 w-16",
              selectedVehicleId ? "text-primary-foreground" : "text-muted-foreground"
            )} />
            <span className={cn(
              "absolute -bottom-8 text-sm font-semibold",
              selectedVehicleId ? "text-primary" : "text-muted-foreground"
            )}>
              {selectedVehicleId ? "TAP TO START" : "SELECT VEHICLE"}
            </span>
          </button>
        )}
      </div>

      {/* Status when tracking */}
      {tracking && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
              </span>
              <div>
                <p className="font-semibold text-primary">Broadcasting LIVE</p>
                <p className="text-sm text-muted-foreground">
                  {selectedVehicle?.plateNumber}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {updateCount} updates
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Live Stats - Only when tracking */}
      {tracking && position && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center p-4 text-center">
              <Gauge className="h-8 w-8 text-primary" />
              <p className="mt-2 text-3xl font-bold text-foreground">
                {position.speed}
              </p>
              <p className="text-sm text-muted-foreground">km/h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-4 text-center">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-xl font-bold text-foreground">
                {lastUpdate?.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                }) ?? "--:--"}
              </p>
              <p className="text-sm text-muted-foreground">Last Update</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="relative h-[300px] md:h-[400px]">
          {tracking && position && (
            <Badge className="absolute left-3 top-3 z-20 gap-2 bg-primary text-primary-foreground hover:bg-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
              </span>
              LIVE
            </Badge>
          )}
          <LeafletMap
            vehicles={mapVehicles}
            center={position ? [position.lat, position.lng] : [-1.2921, 36.8219]}
            zoom={position ? 15 : 12}
            showRouteLines={false}
            enableAnimation={true}
          />
        </div>
      </div>

      {/* Empty State */}
      {!tracking && !position && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-8 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-base font-medium text-muted-foreground">
            {selectedVehicleId
              ? "Tap the green button to go live"
              : "Select a vehicle above to start"}
          </p>
        </div>
      )}
    </div>
  )
}
