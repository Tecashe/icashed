"use client"

import { useState } from "react"
import { useMySacco, useSaccoVehicles } from "@/hooks/use-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Bus,
    Search,
    Loader2,
    Plus,
    Star,
    XCircle,
} from "lucide-react"
import { toast } from "sonner"

const TYPE_COLORS: Record<string, string> = {
    MATATU: "bg-primary/10 text-primary",
    BUS: "bg-chart-1/10 text-chart-1",
    BODA: "bg-chart-3/10 text-chart-3",
    TUK_TUK: "bg-accent/10 text-accent",
}

export default function SaccoVehiclesPage() {
    const { data: mySacco } = useMySacco()
    const [query, setQuery] = useState("")
    const [page, setPage] = useState(1)
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [plateNumber, setPlateNumber] = useState("")
    const [addLoading, setAddLoading] = useState(false)

    const saccoId = mySacco?.saccoId || null
    const { data, isLoading, mutate } = useSaccoVehicles(saccoId, { query, page })

    const vehicles = data?.vehicles || []
    const pagination = data?.pagination

    async function handleAssignVehicle() {
        if (!plateNumber || !saccoId) return
        setAddLoading(true)
        try {
            // Look up vehicle by plate number
            const lookupRes = await fetch(
                `/api/vehicles?query=${encodeURIComponent(plateNumber)}&limit=1`
            )
            const lookupData = await lookupRes.json()
            if (!lookupData.vehicles?.length) {
                toast.error("No vehicle found with that plate number")
                return
            }
            const vehicleId = lookupData.vehicles[0].id

            const res = await fetch(`/api/sacco/${saccoId}/vehicles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vehicleId }),
            })

            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || "Failed to assign vehicle")
                return
            }

            toast.success("Vehicle assigned to SACCO")
            setAddDialogOpen(false)
            setPlateNumber("")
            mutate()
        } catch {
            toast.error("Failed to assign vehicle")
        } finally {
            setAddLoading(false)
        }
    }

    async function handleRemoveVehicle(vehicleId: string) {
        if (!saccoId || !confirm("Remove this vehicle from the SACCO?")) return
        try {
            await fetch(`/api/vehicles/${vehicleId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ saccoId: null }),
            })
            toast.success("Vehicle removed from SACCO")
            mutate()
        } catch {
            toast.error("Failed to remove vehicle")
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">
                        Vehicles
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage SACCO fleet. Assign and unassign vehicles.
                    </p>
                </div>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Assign Vehicle
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Assign Vehicle to SACCO</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    Vehicle Plate Number
                                </label>
                                <Input
                                    placeholder="KCA 123A"
                                    value={plateNumber}
                                    onChange={(e) => setPlateNumber(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <Button
                                onClick={handleAssignVehicle}
                                disabled={addLoading || !plateNumber}
                                className="w-full"
                            >
                                {addLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Assign Vehicle
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by plate number..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setPage(1)
                    }}
                    className="pl-10"
                />
            </div>

            {/* Vehicles Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : vehicles.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {vehicles.map(
                        (v: {
                            id: string
                            plateNumber: string
                            nickname: string | null
                            type: string
                            capacity: number
                            isActive: boolean
                            rating: number
                            owner: { name: string | null; phone: string | null }
                            routes: { route: { name: string; code: string } }[]
                            images: { url: string }[]
                        }) => (
                            <Card key={v.id} className="overflow-hidden">
                                {v.images?.[0] && (
                                    <div className="h-32 w-full overflow-hidden bg-muted">
                                        <img
                                            src={v.images[0].url}
                                            alt={v.plateNumber}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-display text-lg font-bold text-foreground">
                                                {v.plateNumber}
                                            </p>
                                            {v.nickname && (
                                                <p className="text-xs text-muted-foreground">
                                                    {v.nickname}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Badge
                                                className={`text-xs ${TYPE_COLORS[v.type] || ""}`}
                                            >
                                                {v.type}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Star className="h-3 w-3 text-yellow-500" />
                                            {v.rating.toFixed(1)}
                                        </span>
                                        <span>Capacity: {v.capacity}</span>
                                        <Badge
                                            variant={v.isActive ? "default" : "secondary"}
                                            className="text-xs"
                                        >
                                            {v.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>

                                    {v.routes.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {v.routes.map(
                                                (r: { route: { name: string; code: string } }, i: number) => (
                                                    <Badge
                                                        key={i}
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        {r.route.code}
                                                    </Badge>
                                                )
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                                        <p className="text-xs text-muted-foreground">
                                            Owner: {v.owner?.name || "Unknown"}
                                        </p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemoveVehicle(v.id)}
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    )}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center py-16 text-center">
                        <Bus className="h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-3 text-sm text-muted-foreground">
                            No vehicles assigned to this SACCO
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {pagination.pages}
                    </span>
                    <button
                        onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                        disabled={page >= pagination.pages}
                        className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}
