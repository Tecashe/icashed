"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { useMyVehicles } from "@/hooks/use-data"
import { apiPost } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
} from "lucide-react"
import type { MapVehicle } from "@/components/map/leaflet-map"

const LeafletMap = dynamic(
  () => import("@/components/map/leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] w-full items-center justify-center rounded-xl bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
        // silent retry next tick
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
      toast.error("Geolocation not supported on this device")
      return
    }

    setTracking(true)
    setUpdateCount(0)

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)
    toast.success("Tracking started", {
      description: `Broadcasting position for ${selectedVehicle?.plateNumber ?? "vehicle"}`,
    })

    watchRef.current = navigator.geolocation.watchPosition(
      sendPosition,
      (err) => {
        toast.error("GPS error", { description: err.message })
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
    toast.info("Tracking stopped", { description: `${updateCount} positions sent` })
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
          routeName: "Current position",
        },
      ]
    : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Live Tracking
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your vehicle position in real time with commuters
        </p>
      </div>

      {/* Controls Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedVehicleId}
              onValueChange={setSelectedVehicleId}
              disabled={tracking}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a vehicle..." />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plateNumber}
                    {v.nickname ? ` - ${v.nickname}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedVehicle && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {selectedVehicle.type}
                </Badge>
                {selectedVehicle.routes.map((vr) => (
                  <Badge key={vr.id} variant="outline" className="text-xs">
                    {vr.route.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {tracking ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-primary">Broadcasting</p>
                    <p className="text-xs text-muted-foreground">
                      {updateCount} updates sent
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Offline</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Control</CardTitle>
          </CardHeader>
          <CardContent>
            {tracking ? (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={stopTracking}
              >
                <PowerOff className="h-4 w-4" />
                Stop Tracking
              </Button>
            ) : (
              <Button
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={startTracking}
                disabled={!selectedVehicleId}
              >
                <Power className="h-4 w-4" />
                Start Tracking
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Stats */}
      {tracking && position && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <Gauge className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Speed</p>
              <p className="text-lg font-bold text-foreground">{position.speed} km/h</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <Navigation className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Heading</p>
              <p className="text-lg font-bold text-foreground">{Math.round(position.heading)}&deg;</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <MapPin className="h-5 w-5 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Accuracy</p>
              <p className="text-lg font-bold text-foreground">{Math.round(position.accuracy)}m</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Last Update</p>
              <p className="text-lg font-bold text-foreground">
                {lastUpdate?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) ?? "--"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="relative h-[400px] md:h-[500px]">
          {tracking && position && (
            <Badge className="absolute left-3 top-3 z-20 bg-primary text-primary-foreground hover:bg-primary">
              <span className="relative mr-2 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
              </span>
              Live
            </Badge>
          )}
          <LeafletMap
            vehicles={mapVehicles}
            center={position ? [position.lat, position.lng] : [-1.2921, 36.8219]}
            zoom={position ? 15 : 12}
            showRouteLines={false}
          />
        </div>
      </div>

      {/* Empty State */}
      {!tracking && !position && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-12 text-center">
          <Bus className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {selectedVehicleId
              ? "Click Start Tracking to begin broadcasting your position"
              : "Select a vehicle to start tracking"}
          </p>
        </div>
      )}
    </div>
  )
}
