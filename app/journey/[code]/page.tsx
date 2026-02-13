"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
    MapPin,
    Navigation,
    Clock,
    Bus,
    Star,
    Gauge,
    Loader2,
    AlertCircle,
    Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface JourneyData {
    shareCode: string
    label: string | null
    status: "active" | "ended"
    expiresAt?: string
    endedAt?: string
    createdAt?: string
    sharerName: string
    vehicle: {
        id?: string
        plateNumber: string
        nickname: string | null
        type?: string
        isLive?: boolean
        rating?: number
        imageUrl?: string | null
        position?: {
            lat: number
            lng: number
            speed: number
            heading: number
            timestamp: string
        } | null
    }
    route?: {
        id: string
        name: string
        color: string
        origin: string
        destination: string
        stages: Array<{
            id: string
            name: string
            lat: number
            lng: number
            order: number
            isTerminal: boolean
        }>
    } | null
}

export default function JourneyTrackingPage() {
    const params = useParams<{ code: string }>()
    const [journey, setJourney] = useState<JourneyData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
    const routeLineRef = useRef<google.maps.Polyline | null>(null)

    // Fetch journey data
    const fetchJourney = useCallback(async () => {
        try {
            const res = await fetch(`/api/journey/${params.code}`)
            if (!res.ok) {
                setError("Journey not found")
                setLoading(false)
                return
            }
            const data = await res.json()
            setJourney(data.journey)
            setLoading(false)
        } catch {
            setError("Failed to load journey")
            setLoading(false)
        }
    }, [params.code])

    useEffect(() => {
        fetchJourney()
    }, [fetchJourney])

    // Poll for position updates every 10 seconds
    useEffect(() => {
        if (!journey || journey.status !== "active") return

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/journey/${params.code}`)
                if (res.ok) {
                    const data = await res.json()
                    setJourney(data.journey)
                }
            } catch {
                // Silently fail on poll
            }
        }, 10000)

        return () => clearInterval(interval)
    }, [journey?.status, params.code])

    // Initialize Google Map
    useEffect(() => {
        if (!journey || journey.status !== "active" || !mapRef.current) return
        if (mapInstanceRef.current) return // Already initialized

        const initMap = async () => {
            const { Loader } = await import("@googlemaps/js-api-loader")
            const loader = new Loader({
                apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
                version: "weekly",
                libraries: ["marker"],
            })

            const google = await loader.load()
            const pos = journey.vehicle.position

            const map = new google.maps.Map(mapRef.current!, {
                center: pos ? { lat: pos.lat, lng: pos.lng } : { lat: -1.2921, lng: 36.8219 },
                zoom: 15,
                mapId: "journey-tracking-map",
                disableDefaultUI: true,
                zoomControl: true,
                styles: [
                    { elementType: "geometry", stylers: [{ color: "#0f0f1a" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#0f0f1a" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
                    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1929" }] },
                ],
            })

            mapInstanceRef.current = map

            // Draw route stages if available
            if (journey.route && journey.route.stages.length > 1) {
                const stageCoords = journey.route.stages.map(s => ({
                    lat: s.lat,
                    lng: s.lng,
                }))

                routeLineRef.current = new google.maps.Polyline({
                    path: stageCoords,
                    geodesic: true,
                    strokeColor: journey.route.color || "#10B981",
                    strokeOpacity: 0.7,
                    strokeWeight: 4,
                    map,
                })

                // Add stage markers
                journey.route.stages.forEach((stage) => {
                    const el = document.createElement("div")
                    el.innerHTML = stage.isTerminal
                        ? `<div style="width:12px;height:12px;background:${journey.route!.color};border:2px solid white;border-radius:50%;"></div>`
                        : `<div style="width:6px;height:6px;background:#6b7280;border-radius:50%;"></div>`

                    new google.maps.marker.AdvancedMarkerElement({
                        position: { lat: stage.lat, lng: stage.lng },
                        map,
                        content: el,
                        title: stage.name,
                    })
                })
            }

            // Add vehicle marker
            if (pos) {
                const el = document.createElement("div")
                el.innerHTML = `
          <div style="position:relative;">
            <div style="
              width: 40px; height: 40px;
              background: linear-gradient(135deg, #10B981, #059669);
              border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 0 20px rgba(16,185,129,0.5);
              border: 3px solid white;
              animation: pulse 2s infinite;
            ">
              <span style="font-size:20px;">🚐</span>
            </div>
            <div style="
              position: absolute; top: -8px; right: -8px;
              width: 16px; height: 16px;
              background: #22c55e;
              border-radius: 50%;
              border: 2px solid white;
              animation: ping 1.5s infinite;
            "></div>
          </div>
        `

                markerRef.current = new google.maps.marker.AdvancedMarkerElement({
                    position: { lat: pos.lat, lng: pos.lng },
                    map,
                    content: el,
                    title: journey.vehicle.plateNumber,
                })
            }
        }

        initMap()
    }, [journey])

    // Update marker position when journey data changes
    useEffect(() => {
        if (!markerRef.current || !journey?.vehicle.position) return

        const pos = journey.vehicle.position
        markerRef.current.position = { lat: pos.lat, lng: pos.lng }

        // Pan map to follow
        if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo({ lat: pos.lat, lng: pos.lng })
        }
    }, [journey?.vehicle.position?.lat, journey?.vehicle.position?.lng])

    // Countdown timer
    const [timeLeft, setTimeLeft] = useState("")
    useEffect(() => {
        if (!journey?.expiresAt) return
        const update = () => {
            const remaining = new Date(journey.expiresAt!).getTime() - Date.now()
            if (remaining <= 0) {
                setTimeLeft("Expired")
                return
            }
            const h = Math.floor(remaining / 3600000)
            const m = Math.floor((remaining % 3600000) / 60000)
            setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m`)
        }
        update()
        const interval = setInterval(update, 30000)
        return () => clearInterval(interval)
    }, [journey?.expiresAt])

    // ─── Loading state ───
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading journey...</p>
                </div>
            </div>
        )
    }

    // ─── Error state ───
    if (error || !journey) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="flex flex-col items-center gap-4 text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
                    <h1 className="text-xl font-semibold text-foreground">Journey Not Found</h1>
                    <p className="text-sm text-muted-foreground">
                        This link may be invalid or the journey has expired.
                    </p>
                    <Button asChild>
                        <Link href="/">Go to Radaa</Link>
                    </Button>
                </div>
            </div>
        )
    }

    // ─── Ended state ───
    if (journey.status === "ended") {
        return (
            <div className="flex min-h-screen flex-col bg-background">
                {/* Header */}
                <header className="flex items-center justify-between border-b px-4 py-3">
                    <Link href="/" className="font-display text-xl font-bold text-primary">
                        Radaa
                    </Link>
                    <Badge variant="secondary">Journey Ended</Badge>
                </header>

                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
                    <div className="rounded-full bg-muted p-4">
                        <MapPin className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h1 className="text-xl font-semibold text-foreground">Journey has ended</h1>
                    <p className="text-sm text-muted-foreground">
                        {journey.sharerName}'s ride on {journey.vehicle.plateNumber} is no longer being shared.
                    </p>
                    <Button asChild className="mt-4">
                        <Link href="/">
                            Explore Radaa
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    // ─── Active journey ───
    const pos = journey.vehicle.position
    const speed = pos ? Math.round(pos.speed) : 0

    return (
        <div className="flex h-screen flex-col bg-background">
            {/* Header */}
            <header className="flex items-center justify-between border-b px-4 py-3">
                <Link href="/" className="font-display text-xl font-bold text-primary">
                    Radaa
                </Link>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">LIVE</span>
                </div>
            </header>

            {/* Info bar */}
            <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-2.5">
                <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                        {journey.sharerName}'s ride
                        {journey.label && (
                            <span className="ml-1 text-muted-foreground">— {journey.label}</span>
                        )}
                    </p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Bus className="h-3 w-3" />
                            {journey.vehicle.plateNumber}
                        </span>
                        {journey.route && (
                            <span className="flex items-center gap-1">
                                <Navigation className="h-3 w-3" />
                                {journey.route.origin} → {journey.route.destination}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeLeft}
                        </span>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="relative flex-1">
                <div ref={mapRef} className="h-full w-full" />

                {/* Speed + stats overlay */}
                {pos && (
                    <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                        <div className="flex items-center gap-3 rounded-2xl border bg-background/90 px-4 py-3 shadow-lg backdrop-blur-sm">
                            <div className="flex items-center gap-1.5">
                                <Gauge className="h-4 w-4 text-primary" />
                                <span className="text-lg font-bold text-foreground">{speed}</span>
                                <span className="text-xs text-muted-foreground">km/h</span>
                            </div>

                            {journey.vehicle.rating !== undefined && journey.vehicle.rating > 0 && (
                                <>
                                    <div className="h-6 w-px bg-border" />
                                    <div className="flex items-center gap-1">
                                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                        <span className="text-sm font-medium text-foreground">
                                            {journey.vehicle.rating.toFixed(1)}
                                        </span>
                                    </div>
                                </>
                            )}

                            {journey.vehicle.isLive === false && (
                                <>
                                    <div className="h-6 w-px bg-border" />
                                    <Badge variant="secondary" className="text-xs">Offline</Badge>
                                </>
                            )}
                        </div>

                        {/* CTA */}
                        <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className={cn(
                                "ml-auto shrink-0 gap-1.5 bg-background/90 backdrop-blur-sm"
                            )}
                        >
                            <Link href="/">
                                <Share2 className="h-3.5 w-3.5" />
                                Get Radaa
                            </Link>
                        </Button>
                    </div>
                )}
            </div>

            {/* CSS for marker animation */}
            <style jsx global>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
        </div>
    )
}
