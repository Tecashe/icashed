"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { toast } from "sonner"
import { useMyVehicles } from "@/hooks/use-data"
import useSWR from "swr"
import { apiPost, fetcher } from "@/lib/api-client"
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
  Loader2,
  Power,
  PowerOff,
  MapPin,
  Bus,
  Gauge,
  Users,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import type { MapVehicle } from "@/components/map/leaflet-map"
import { cn } from "@/lib/utils"

const LeafletMap = dynamic(
  () => import("@/components/map/leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

interface WaitingStage {
  id: string
  name: string
  latitude: number
  longitude: number
  waitingCount: number
  route: { name: string; color: string }
}

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
  const [showPanel, setShowPanel] = useState(true)
  const watchRef = useRef<number | null>(null)

  // Get waiting passengers for driver's routes
  const { data: waitingData } = useSWR<{ stages: WaitingStage[] }>(
    tracking ? "/api/driver/stages/waiting" : null,
    fetcher,
    { refreshInterval: 30000 }
  )

  const stagesWithWaiting = waitingData?.stages?.filter((s) => s.waitingCount > 0) || []
  const totalWaiting = stagesWithWaiting.reduce((sum, s) => sum + s.waitingCount, 0)

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
    <div className="relative -m-4 -mb-24 flex h-[calc(100vh-4rem)] flex-col lg:-m-6 lg:-mb-6 lg:h-[calc(100vh-4rem)]">
      {/* Full-screen Map */}
      <div className="absolute inset-0">
        <LeafletMap
          vehicles={mapVehicles}
          center={position ? [position.lat, position.lng] : [-1.2921, 36.8219]}
          zoom={position ? 15 : 12}
          showRouteLines={false}
          enableAnimation={true}
        />
      </div>

      {/* Floating Status Badges (when tracking) */}
      {tracking && (
        <>
          {/* LIVE Badge */}
          <div className="absolute left-4 top-4 z-20">
            <Badge className="gap-2 bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
              </span>
              LIVE
            </Badge>
          </div>

          {/* Speed Badge */}
          {position && (
            <div className="absolute right-4 top-4 z-20">
              <div className="flex items-center gap-2 rounded-xl bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
                <Gauge className="h-5 w-5 text-primary" />
                <span className="text-xl font-bold text-foreground">{position.speed}</span>
                <span className="text-sm text-muted-foreground">km/h</span>
              </div>
            </div>
          )}

          {/* Waiting Passengers Badge */}
          {totalWaiting > 0 && (
            <div className="absolute left-4 top-14 z-20">
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/90 px-3 py-2 shadow-lg">
                <Users className="h-5 w-5 text-white" />
                <span className="text-sm font-semibold text-white">
                  {totalWaiting} waiting
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Bottom Control Panel */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300",
          "pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0",
          !showPanel && !tracking && "translate-y-[calc(100%-60px)]"
        )}
      >
        {/* Toggle Panel Button */}
        {!tracking && (
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="absolute -top-4 left-1/2 z-10 flex h-8 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-card shadow-lg border border-border"
          >
            {showPanel ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        )}

        <div className="rounded-t-3xl border-t border-border bg-card/95 p-4 shadow-2xl backdrop-blur-lg">
          {/* Vehicle Selector - Only when not tracking */}
          {!tracking && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Select Vehicle
              </label>
              <Select
                value={selectedVehicleId}
                onValueChange={setSelectedVehicleId}
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
            </div>
          )}

          {/* Status when tracking */}
          {tracking && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-3">
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
            </div>
          )}

          {/* BIG START/STOP BUTTON */}
          <div className="flex justify-center">
            {tracking ? (
              <Button
                onClick={stopTracking}
                size="lg"
                variant="destructive"
                className="h-16 w-full gap-3 text-lg font-bold shadow-lg shadow-destructive/25 sm:w-auto sm:px-12"
              >
                <PowerOff className="h-6 w-6" />
                STOP TRACKING
              </Button>
            ) : (
              <Button
                onClick={startTracking}
                disabled={!selectedVehicleId}
                size="lg"
                className="h-16 w-full gap-3 text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-xl sm:w-auto sm:px-12"
              >
                <Power className="h-6 w-6" />
                GO LIVE
              </Button>
            )}
          </div>

          {/* Empty State Hint */}
          {!tracking && !selectedVehicleId && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Select a vehicle above to start tracking
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
