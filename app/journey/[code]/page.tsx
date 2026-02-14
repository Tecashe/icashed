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
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    Timer,
    Route,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { loadGoogleMaps } from "@/lib/google-maps-loader"

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

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
    progress?: {
        nearestStageName: string
        destinationName: string
        etaMinutes: number
        progressPercent: number
        distanceRemainingKm: number
        isInTraffic: boolean
        isOnRoute: boolean
        nextStageName: string | null
    } | null
}

// ═══════════════════════════════════════════════════════════════════
// VEHICLE MARKER HTML
// ═══════════════════════════════════════════════════════════════════

function createJourneyVehicleMarkerHtml(
    vehicle: JourneyData["vehicle"],
    routeColor: string,
    heading: number
): string {
    const vehicleEmoji: Record<string, string> = {
        MATATU: "🚐", BUS: "🚌", BODA: "🏍️", TUK_TUK: "🛺",
    }
    const emoji = vehicleEmoji[vehicle.type || "MATATU"] || "🚐"

    return `
    <div class="journey-marker" style="--heading: ${heading}deg; --route-color: ${routeColor};">
      <div class="journey-marker-pulse"></div>
      <div class="journey-marker-pulse journey-marker-pulse-2"></div>
      <div class="journey-marker-body">
        <div class="journey-marker-arrow"></div>
        <div class="journey-marker-icon">${emoji}</div>
      </div>
      <div class="journey-marker-plate">${vehicle.plateNumber}</div>
    </div>
  `
}

function createDestinationMarkerHtml(stageName: string, color: string): string {
    return `
    <div class="journey-dest-marker" style="--dest-color: ${color};">
      <div class="journey-dest-pin">🏁</div>
      <div class="journey-dest-label">${stageName}</div>
    </div>
  `
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function JourneyTrackingPage() {
    const params = useParams<{ code: string }>()
    const [journey, setJourney] = useState<JourneyData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
    const destMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null)
    const routeLineRef = useRef<google.maps.Polyline | null>(null)
    const stageMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])

    // ─── Fetch journey data ─────────────────────────────────────────
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

    // ─── Poll for position updates every 8 seconds ──────────────────
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
        }, 8000)

        return () => clearInterval(interval)
    }, [journey?.status, params.code])

    // ─── Initialize Google Map ──────────────────────────────────────
    useEffect(() => {
        if (!journey || journey.status !== "active" || !mapRef.current) return
        if (mapInstanceRef.current) return

        const initMap = async () => {
            const google = await loadGoogleMaps()
            const pos = journey.vehicle.position

            const map = new google.maps.Map(mapRef.current!, {
                center: pos ? { lat: pos.lat, lng: pos.lng } : { lat: -1.2921, lng: 36.8219 },
                zoom: 15,
                mapId: "journey-live-tracking",
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: "greedy",
                styles: [
                    { elementType: "geometry", stylers: [{ color: "#0f0f1a" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#0f0f1a" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
                    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
                    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
                    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1929" }] },
                    { featureType: "poi", stylers: [{ visibility: "off" }] },
                ],
            })

            mapInstanceRef.current = map

            const routeColor = journey.route?.color || "#10B981"

            // Draw route line
            if (journey.route && journey.route.stages.length > 1) {
                const stageCoords = journey.route.stages.map(s => ({
                    lat: s.lat, lng: s.lng,
                }))

                routeLineRef.current = new google.maps.Polyline({
                    path: stageCoords,
                    geodesic: true,
                    strokeColor: routeColor,
                    strokeOpacity: 0.6,
                    strokeWeight: 4,
                    map,
                })

                // Stage dot markers
                journey.route.stages.forEach((stage) => {
                    const content = document.createElement("div")
                    content.innerHTML = `
                        <div style="
                            width: ${stage.isTerminal ? '14px' : '8px'};
                            height: ${stage.isTerminal ? '14px' : '8px'};
                            border-radius: 50%;
                            background: ${stage.isTerminal ? routeColor : '#475569'};
                            border: 2px solid ${stage.isTerminal ? '#fff' : '#94a3b8'};
                            box-shadow: 0 0 ${stage.isTerminal ? '8px' : '4px'} ${stage.isTerminal ? routeColor + '60' : 'rgba(0,0,0,0.3)'};
                        "></div>
                    `
                    const marker = new google.maps.marker.AdvancedMarkerElement({
                        map, position: { lat: stage.lat, lng: stage.lng },
                        content, title: stage.name,
                    })
                    stageMarkersRef.current.push(marker)
                })

                // Destination flag marker (last stage)
                const lastStage = journey.route.stages[journey.route.stages.length - 1]
                const destContent = document.createElement("div")
                destContent.innerHTML = createDestinationMarkerHtml(lastStage.name, routeColor)
                destMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
                    map,
                    position: { lat: lastStage.lat, lng: lastStage.lng },
                    content: destContent,
                    title: `Destination: ${lastStage.name}`,
                    zIndex: 800,
                })
            }

            // Vehicle pulsating marker
            if (pos) {
                const markerContent = document.createElement("div")
                markerContent.innerHTML = createJourneyVehicleMarkerHtml(
                    journey.vehicle, routeColor, pos.heading || 0
                )
                markerRef.current = new google.maps.marker.AdvancedMarkerElement({
                    map,
                    position: { lat: pos.lat, lng: pos.lng },
                    content: markerContent,
                    title: journey.vehicle.plateNumber,
                    zIndex: 999,
                })
            }
        }

        initMap()
    }, [journey?.status])

    // ─── Update marker position on data change ──────────────────────
    useEffect(() => {
        if (!markerRef.current || !journey?.vehicle.position || !mapInstanceRef.current) return

        const pos = journey.vehicle.position
        const routeColor = journey.route?.color || "#10B981"

        // Update position smoothly
        markerRef.current.position = { lat: pos.lat, lng: pos.lng }

        // Update marker HTML with new heading
        const markerContent = document.createElement("div")
        markerContent.innerHTML = createJourneyVehicleMarkerHtml(
            journey.vehicle, routeColor, pos.heading || 0
        )
        markerRef.current.content = markerContent

        // Pan map to follow
        mapInstanceRef.current.panTo({ lat: pos.lat, lng: pos.lng })
    }, [journey?.vehicle.position?.lat, journey?.vehicle.position?.lng])

    // ─── Countdown timer ────────────────────────────────────────────
    const [timeLeft, setTimeLeft] = useState("")
    useEffect(() => {
        if (!journey?.expiresAt) return
        const update = () => {
            const remaining = new Date(journey.expiresAt!).getTime() - Date.now()
            if (remaining <= 0) { setTimeLeft("Expired"); return }
            const h = Math.floor(remaining / 3600000)
            const m = Math.floor((remaining % 3600000) / 60000)
            setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m`)
        }
        update()
        const interval = setInterval(update, 30000)
        return () => clearInterval(interval)
    }, [journey?.expiresAt])

    // ─── Helpers ────────────────────────────────────────────────────
    const pos = journey?.vehicle?.position
    const speed = pos ? Math.round(pos.speed) : 0
    const progress = journey?.progress
    const vehicleEmoji: Record<string, string> = {
        MATATU: "🚐", BUS: "🚌", BODA: "🏍️", TUK_TUK: "🛺",
    }
    const emoji = vehicleEmoji[journey?.vehicle?.type || "MATATU"] || "🚐"

    const trafficStatus = progress?.isInTraffic
        ? { label: "In Traffic", color: "text-amber-400", bg: "bg-amber-400/10", icon: AlertTriangle }
        : speed > 5
            ? { label: "Moving", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CheckCircle2 }
            : { label: "Stopped", color: "text-slate-400", bg: "bg-slate-400/10", icon: Clock }

    const lastUpdated = pos?.timestamp
        ? (() => {
            const diff = Date.now() - new Date(pos.timestamp).getTime()
            if (diff < 60000) return "Just now"
            if (diff < 3600000) return `${Math.round(diff / 60000)} min ago`
            return `${Math.round(diff / 3600000)}h ago`
        })()
        : null

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════

    // Loading
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
                    <p className="text-slate-400 text-sm">Loading journey...</p>
                </div>
            </div>
        )
    }

    // Error
    if (error || !journey) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] px-4">
                <div className="flex flex-col items-center gap-4 text-center">
                    <AlertCircle className="h-12 w-12 text-slate-500" />
                    <h1 className="text-xl font-semibold text-slate-200">Journey Not Found</h1>
                    <p className="text-sm text-slate-400">
                        This link may be invalid or the journey has expired.
                    </p>
                    <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/">Go to Radaa</Link>
                    </Button>
                </div>
            </div>
        )
    }

    // Ended
    if (journey.status === "ended") {
        return (
            <div className="flex min-h-screen flex-col bg-[#0f0f1a]">
                <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <Link href="/" className="text-xl font-bold text-emerald-400">Radaa</Link>
                    <Badge className="bg-slate-800 text-slate-400 border-slate-700">Journey Ended</Badge>
                </header>
                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
                    <div className="rounded-full bg-slate-800/50 p-5">
                        <MapPin className="h-10 w-10 text-slate-500" />
                    </div>
                    <h1 className="text-xl font-semibold text-slate-200">Journey has ended</h1>
                    <p className="text-sm text-slate-400">
                        {journey.sharerName}&apos;s ride on {journey.vehicle.plateNumber} is no longer being shared.
                    </p>
                    <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/">Explore Radaa</Link>
                    </Button>
                </div>
            </div>
        )
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTIVE JOURNEY
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="flex h-[100dvh] flex-col bg-[#0f0f1a]">

            {/* ─── Header ──────────────────────────────────────── */}
            <header className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5">
                <Link href="/" className="text-lg font-bold text-emerald-400">Radaa</Link>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">Live</span>
                    {timeLeft && (
                        <span className="text-[10px] text-slate-500 ml-1">• {timeLeft} left</span>
                    )}
                </div>
            </header>

            {/* ─── Live Status Banner ──────────────────────────── */}
            <div className="border-b border-slate-800/60 bg-gradient-to-b from-[#0f1520] to-[#0f0f1a]">
                {/* Human-readable status */}
                <div className="px-4 pt-3 pb-2">
                    {progress ? (
                        <p className="text-[15px] leading-snug text-slate-200">
                            <span className="font-bold text-white">{journey.sharerName}</span>
                            {" is near "}
                            <span className="font-semibold text-emerald-400">{progress.nearestStageName}</span>
                            {progress.nextStageName && progress.nextStageName !== progress.destinationName && (
                                <span className="text-slate-400">{" heading to "}<span className="font-medium text-slate-300">{progress.nextStageName}</span></span>
                            )}
                            {progress.etaMinutes > 0 && (
                                <span className="text-slate-400">
                                    {", ~"}<span className="font-semibold text-white">{progress.etaMinutes} min</span>{" to "}
                                    <span className="font-semibold text-emerald-400">{progress.destinationName}</span>
                                </span>
                            )}
                        </p>
                    ) : pos ? (
                        <p className="text-[15px] text-slate-200">
                            <span className="font-bold text-white">{journey.sharerName}</span>
                            {" is on "}
                            <span className="font-semibold text-emerald-400">{journey.vehicle.plateNumber}</span>
                            {journey.route && (
                                <span className="text-slate-400">
                                    {" on the "}<span className="text-slate-300">{journey.route.origin} → {journey.route.destination}</span>{" route"}
                                </span>
                            )}
                        </p>
                    ) : (
                        <p className="text-[15px] text-slate-400">Waiting for position data...</p>
                    )}
                </div>

                {/* Vehicle card + status chips */}
                <div className="flex items-center gap-3 px-4 pb-3">
                    {/* Vehicle image/emoji */}
                    <div
                        className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-xl border-2"
                        style={{
                            borderColor: (journey.route?.color || "#10B981") + "60",
                            background: `linear-gradient(135deg, ${(journey.route?.color || "#10B981")}15, ${(journey.route?.color || "#10B981")}30)`,
                            ...(journey.vehicle.imageUrl ? {
                                backgroundImage: `url(${journey.vehicle.imageUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                fontSize: 0,
                            } : {}),
                        }}
                    >
                        {!journey.vehicle.imageUrl && emoji}
                    </div>

                    {/* Plate + route */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white tracking-wide">{journey.vehicle.plateNumber}</span>
                            {journey.vehicle.rating !== undefined && journey.vehicle.rating > 0 && (
                                <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                                    <Star className="h-3 w-3 fill-yellow-400" />
                                    {journey.vehicle.rating.toFixed(1)}
                                </span>
                            )}
                        </div>
                        {journey.route && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: journey.route.color }} />
                                <span>{journey.route.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Status chips */}
                    <div className="flex flex-col items-end gap-1">
                        <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", trafficStatus.bg, trafficStatus.color)}>
                            <trafficStatus.icon className="h-3 w-3" />
                            {trafficStatus.label}
                        </div>
                        {lastUpdated && (
                            <span className="text-[10px] text-slate-600">{lastUpdated}</span>
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                {progress && progress.progressPercent > 0 && (
                    <div className="px-4 pb-3">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                            <span>{journey.route?.origin}</span>
                            <span>{progress.progressPercent}%</span>
                            <span>{journey.route?.destination}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{
                                    width: `${progress.progressPercent}%`,
                                    background: `linear-gradient(90deg, ${journey.route?.color || "#10B981"}, ${journey.route?.color || "#10B981"}cc)`,
                                    boxShadow: `0 0 8px ${journey.route?.color || "#10B981"}60`,
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Map ─────────────────────────────────────────── */}
            <div className="relative flex-1 min-h-0">
                <div ref={mapRef} className="h-full w-full" />

                {/* Bottom stats overlay */}
                {pos && (
                    <div className="absolute bottom-4 left-3 right-3">
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-700/60 bg-[#0f0f1a]/90 px-3 py-2.5 shadow-2xl backdrop-blur-md">

                            {/* Speed */}
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-blue-500/10">
                                <Gauge className="h-3.5 w-3.5 text-blue-400" />
                                <span className="text-sm font-bold text-blue-300">{speed}</span>
                                <span className="text-[10px] text-blue-400/60">km/h</span>
                            </div>

                            {/* ETA */}
                            {progress && progress.etaMinutes > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-500/10">
                                    <Timer className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-sm font-bold text-emerald-300">~{progress.etaMinutes}</span>
                                    <span className="text-[10px] text-emerald-400/60">min</span>
                                </div>
                            )}

                            {/* Distance remaining */}
                            {progress && progress.distanceRemainingKm > 0 && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-purple-500/10">
                                    <Route className="h-3.5 w-3.5 text-purple-400" />
                                    <span className="text-sm font-bold text-purple-300">{progress.distanceRemainingKm}</span>
                                    <span className="text-[10px] text-purple-400/60">km</span>
                                </div>
                            )}

                            <div className="flex-1" />

                            {/* Get Radaa CTA */}
                            <Button
                                asChild size="sm" variant="ghost"
                                className="h-7 px-2  text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                <Link href="/">
                                    <Share2 className="h-3 w-3 mr-1" />
                                    Radaa
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── CSS for pulsating marker + map styles ────────── */}
            <style jsx global>{`
                /* Vehicle Pulsating Marker */
                .journey-marker {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                }

                .journey-marker-body {
                    position: relative;
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--route-color, #10B981), color-mix(in srgb, var(--route-color) 70%, black));
                    border: 3px solid rgba(255, 255, 255, 0.95);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow:
                        0 4px 20px rgba(0, 0, 0, 0.4),
                        0 0 30px var(--route-color, #10B981);
                    z-index: 3;
                }

                .journey-marker-icon {
                    font-size: 22px;
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
                }

                .journey-marker-arrow {
                    position: absolute;
                    top: -8px;
                    width: 0;
                    height: 0;
                    border-left: 7px solid transparent;
                    border-right: 7px solid transparent;
                    border-bottom: 14px solid var(--route-color, #10B981);
                    transform: rotate(var(--heading, 0deg));
                    transform-origin: bottom center;
                    filter: drop-shadow(0 0 4px var(--route-color, #10B981));
                    z-index: 4;
                }

                .journey-marker-plate {
                    margin-top: 4px;
                    padding: 2px 8px;
                    border-radius: 8px;
                    background: rgba(15, 15, 26, 0.9);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    font-size: 10px;
                    font-weight: 700;
                    color: #e2e8f0;
                    letter-spacing: 0.5px;
                    white-space: nowrap;
                    z-index: 3;
                    backdrop-filter: blur(4px);
                }

                .journey-marker-pulse {
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    border: 2px solid var(--route-color, #10B981);
                    opacity: 0;
                    animation: journey-pulse-ring 2s ease-out infinite;
                    z-index: 1;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }

                .journey-marker-pulse-2 {
                    animation-delay: 1s;
                }

                @keyframes journey-pulse-ring {
                    0% {
                        transform: translate(-50%, -50%) scale(0.4);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1.6);
                        opacity: 0;
                    }
                }

                /* Destination Marker */
                .journey-dest-marker {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: default;
                }

                .journey-dest-pin {
                    font-size: 28px;
                    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
                    animation: journey-dest-bounce 3s ease-in-out infinite;
                }

                .journey-dest-label {
                    margin-top: 2px;
                    padding: 2px 8px;
                    border-radius: 6px;
                    background: rgba(15, 15, 26, 0.9);
                    border: 1px solid var(--dest-color, #10B981);
                    font-size: 10px;
                    font-weight: 700;
                    color: var(--dest-color, #10B981);
                    white-space: nowrap;
                    backdrop-filter: blur(4px);
                }

                @keyframes journey-dest-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }

                /* Dark map InfoWindow overrides */
                .gm-style .gm-style-iw-c {
                    padding: 0 !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5) !important;
                    background: transparent !important;
                }
                .gm-style .gm-style-iw-d {
                    overflow: hidden !important;
                    background: transparent !important;
                }
                .gm-style .gm-style-iw-tc { display: none !important; }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    )
}
