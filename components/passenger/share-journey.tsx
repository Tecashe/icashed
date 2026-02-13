"use client"

import { useState, useCallback, useEffect } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import {
    Share2,
    Copy,
    Check,
    StopCircle,
    Loader2,
    MapPin,
    ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

interface ShareJourneyProps {
    vehicleId: string
    vehiclePlate: string
    routeId?: string
    routeName?: string
}

interface ActiveJourney {
    id: string
    shareCode: string
    expiresAt: string
    label: string | null
    vehicle: {
        plateNumber: string
        nickname: string | null
    }
}

export function ShareJourney({ vehicleId, vehiclePlate, routeId, routeName }: ShareJourneyProps) {
    const [open, setOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [stopping, setStopping] = useState(false)
    const [copied, setCopied] = useState(false)
    const [label, setLabel] = useState("")

    // Fetch user's active shares
    const { data, mutate } = useSWR<{ journeys: ActiveJourney[] }>(
        open ? "/api/journey/share" : null,
        fetcher
    )

    const activeJourney = data?.journeys?.[0]

    const getShareUrl = useCallback((code: string) => {
        if (typeof window !== "undefined") {
            return `${window.location.origin}/journey/${code}`
        }
        return `/journey/${code}`
    }, [])

    const handleCreate = useCallback(async () => {
        setCreating(true)
        try {
            const res = await fetch("/api/journey/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleId,
                    routeId: routeId || null,
                    label: label.trim() || null,
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || "Failed to create share")
                return
            }

            const result = await res.json()
            toast.success("Journey shared! 🔗", {
                description: "Copy the link and send it to your family",
            })

            // Try native share on mobile
            const shareUrl = getShareUrl(result.journey.shareCode)
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: "Track my journey on Radaa",
                        text: `I'm on ${vehiclePlate}${routeName ? ` (${routeName})` : ""}. Follow my ride live!`,
                        url: shareUrl,
                    })
                } catch {
                    // User cancelled native share — that's fine
                }
            }

            mutate()
            setLabel("")
        } catch {
            toast.error("Network error — could not share journey")
        } finally {
            setCreating(false)
        }
    }, [vehicleId, routeId, label, vehiclePlate, routeName, getShareUrl, mutate])

    const handleStop = useCallback(async () => {
        if (!activeJourney) return
        setStopping(true)
        try {
            await fetch(`/api/journey/share?id=${activeJourney.id}`, { method: "DELETE" })
            toast.info("Journey sharing stopped")
            mutate()
        } catch {
            toast.error("Failed to stop sharing")
        } finally {
            setStopping(false)
        }
    }, [activeJourney, mutate])

    const handleCopy = useCallback(async (code: string) => {
        const url = getShareUrl(code)
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            toast.success("Link copied!")
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error("Could not copy link")
        }
    }, [getShareUrl])

    // Countdown timer for expiry
    const [timeLeft, setTimeLeft] = useState("")
    useEffect(() => {
        if (!activeJourney) return

        const update = () => {
            const remaining = new Date(activeJourney.expiresAt).getTime() - Date.now()
            if (remaining <= 0) {
                setTimeLeft("Expired")
                return
            }
            const h = Math.floor(remaining / 3600000)
            const m = Math.floor((remaining % 3600000) / 60000)
            setTimeLeft(`${h}h ${m}m left`)
        }

        update()
        const interval = setInterval(update, 60000)
        return () => clearInterval(interval)
    }, [activeJourney])

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                >
                    <Share2 className="h-4 w-4" />
                    Share Journey
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                    <SheetTitle className="font-display">Share My Journey</SheetTitle>
                    <SheetDescription>
                        Let family & friends follow your ride in real-time
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-4 flex flex-col gap-4">
                    {activeJourney ? (
                        /* ── Active share ── */
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    Sharing {activeJourney.vehicle.plateNumber}
                                </span>
                                <Badge variant="secondary" className="ml-auto text-xs">
                                    {timeLeft}
                                </Badge>
                            </div>

                            {activeJourney.label && (
                                <p className="text-xs text-muted-foreground italic">
                                    "{activeJourney.label}"
                                </p>
                            )}

                            {/* Share link */}
                            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                                <code className="flex-1 truncate text-xs text-foreground">
                                    {getShareUrl(activeJourney.shareCode)}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => handleCopy(activeJourney.shareCode)}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: "Track my journey",
                                                url: getShareUrl(activeJourney.shareCode),
                                            })
                                        }
                                    }}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            </div>

                            <Button
                                variant="destructive"
                                size="sm"
                                className="gap-2"
                                onClick={handleStop}
                                disabled={stopping}
                            >
                                {stopping ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <StopCircle className="h-4 w-4" />
                                )}
                                Stop Sharing
                            </Button>
                        </div>
                    ) : (
                        /* ── New share form ── */
                        <div className="flex flex-col gap-3">
                            <div className="rounded-lg border bg-muted/30 p-3">
                                <p className="text-sm font-medium text-foreground">{vehiclePlate}</p>
                                {routeName && (
                                    <p className="text-xs text-muted-foreground">{routeName}</p>
                                )}
                            </div>

                            <Input
                                placeholder="Label (optional) — e.g. 'Heading home'"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                className="text-sm"
                            />

                            <Button
                                className="gap-2"
                                onClick={handleCreate}
                                disabled={creating}
                            >
                                {creating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Share2 className="h-4 w-4" />
                                )}
                                Create Share Link
                            </Button>

                            <p className="text-center text-xs text-muted-foreground">
                                Link expires in 2 hours · Anyone with the link can see the vehicle's location
                            </p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
