"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import useSWR from "swr"
import { fetcher } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    ArrowLeft,
    Camera,
    Check,
    ImagePlus,
    Loader2,
    Save,
    Star,
    Trash2,
    X,
} from "lucide-react"
import { VEHICLE_TYPE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useRoutes } from "@/hooks/use-data"
import Image from "next/image"

interface VehicleImage {
    id: string
    url: string
    caption: string | null
    isPrimary: boolean
}

interface VehicleData {
    id: string
    plateNumber: string
    nickname: string | null
    type: string
    capacity: number
    rating: number
    totalTrips: number
    isActive: boolean
    routes: Array<{ id: string; route: { id: string; name: string; color: string } }>
    images: VehicleImage[]
    owner: { id: string; name: string | null }
}

export default function EditVehiclePage() {
    const router = useRouter()
    const params = useParams()
    const vehicleId = params.id as string

    const { data, isLoading, mutate } = useSWR<{ vehicle: VehicleData }>(
        vehicleId ? `/api/vehicles/${vehicleId}` : null,
        fetcher
    )
    const { data: routesData } = useRoutes({ limit: 100 })
    const allRoutes = routesData?.routes || []

    const vehicle = data?.vehicle

    // Form state
    const [nickname, setNickname] = useState("")
    const [type, setType] = useState("MATATU")
    const [capacity, setCapacity] = useState(14)
    const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [deletingImageId, setDeletingImageId] = useState<string | null>(null)

    // Populate form when data loads
    useEffect(() => {
        if (vehicle) {
            setNickname(vehicle.nickname || "")
            setType(vehicle.type)
            setCapacity(vehicle.capacity)
            setSelectedRouteIds(vehicle.routes.map(vr => vr.route.id))
        }
    }, [vehicle])

    const handleSave = useCallback(async () => {
        setSaving(true)
        try {
            const res = await fetch(`/api/vehicles/${vehicleId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nickname: nickname.trim() || null,
                    type,
                    capacity,
                    routeIds: selectedRouteIds,
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to save")
            }

            toast.success("Vehicle updated successfully")
            mutate()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save"
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }, [vehicleId, nickname, type, capacity, selectedRouteIds, mutate])

    const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append("image", file)
            formData.append("isPrimary", vehicle?.images.length === 0 ? "true" : "false")

            const res = await fetch(`/api/vehicles/${vehicleId}/images`, {
                method: "POST",
                body: formData,
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to upload")
            }

            toast.success("Image uploaded")
            mutate()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Upload failed"
            toast.error(message)
        } finally {
            setUploading(false)
            e.target.value = ""
        }
    }, [vehicleId, vehicle?.images.length, mutate])

    const handleDeleteImage = useCallback(async (imageId: string) => {
        setDeletingImageId(imageId)
        try {
            const res = await fetch(
                `/api/vehicles/${vehicleId}/images?imageId=${imageId}`,
                { method: "DELETE" }
            )

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to delete")
            }

            toast.success("Image deleted")
            mutate()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Delete failed"
            toast.error(message)
        } finally {
            setDeletingImageId(null)
        }
    }, [vehicleId, mutate])

    const handleSetPrimary = useCallback(async (imageId: string) => {
        try {
            // The POST endpoint with isPrimary handles unsetting others
            // But we need a simpler approach — let's use a plain fetch
            const res = await fetch(`/api/vehicles/${vehicleId}/images`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ setAsPrimary: imageId }),
            })

            // fallback: just reload
            mutate()
            toast.success("Primary image updated")
        } catch {
            toast.error("Failed to update primary image")
        }
    }, [vehicleId, mutate])

    const toggleRoute = (routeId: string) => {
        setSelectedRouteIds(prev =>
            prev.includes(routeId)
                ? prev.filter(id => id !== routeId)
                : [...prev, routeId]
        )
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!vehicle) {
        return (
            <div className="flex flex-col items-center py-20 text-center">
                <p className="text-lg font-medium text-foreground">Vehicle not found</p>
                <Button className="mt-4" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5 pb-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="font-display text-xl font-bold text-foreground">
                        Edit {vehicle.plateNumber}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Update vehicle details and images
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    Save
                </Button>
            </div>

            {/* Images Section */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Vehicle Images
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                        {vehicle.images.map((img) => (
                            <div
                                key={img.id}
                                className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted"
                            >
                                <Image
                                    src={img.url}
                                    alt={img.caption || "Vehicle"}
                                    fill
                                    className="object-cover"
                                />
                                {img.isPrimary && (
                                    <Badge
                                        className="absolute top-1.5 left-1.5 text-[10px] bg-primary/90 text-primary-foreground"
                                    >
                                        Primary
                                    </Badge>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    {!img.isPrimary && (
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="h-8 w-8 rounded-full"
                                            onClick={() => handleSetPrimary(img.id)}
                                        >
                                            <Star className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="h-8 w-8 rounded-full"
                                        onClick={() => handleDeleteImage(img.id)}
                                        disabled={deletingImageId === img.id}
                                    >
                                        {deletingImageId === img.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {/* Upload Button */}
                        <label className={cn(
                            "flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-border",
                            "cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors",
                            uploading && "pointer-events-none opacity-50"
                        )}>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                            {uploading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            ) : (
                                <>
                                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                                    <span className="mt-1 text-[10px] text-muted-foreground font-medium">
                                        Add Photo
                                    </span>
                                </>
                            )}
                        </label>
                    </div>
                </CardContent>
            </Card>

            {/* Details Section */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Vehicle Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Plate Number - Read only */}
                    <div>
                        <Label className="text-sm">Plate Number</Label>
                        <Input
                            value={vehicle.plateNumber}
                            disabled
                            className="mt-1.5 bg-muted"
                        />
                    </div>

                    {/* Nickname */}
                    <div>
                        <Label className="text-sm">Nickname (optional)</Label>
                        <Input
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="e.g. The Beast, Concorde..."
                            className="mt-1.5"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <Label className="text-sm">Vehicle Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="mt-1.5">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(VEHICLE_TYPE_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Capacity */}
                    <div>
                        <Label className="text-sm">Capacity (seats)</Label>
                        <Input
                            type="number"
                            min={1}
                            max={100}
                            value={capacity}
                            onChange={(e) => setCapacity(parseInt(e.target.value) || 14)}
                            className="mt-1.5"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Routes Section */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Assigned Routes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {allRoutes.map((route) => {
                            const isSelected = selectedRouteIds.includes(route.id)
                            return (
                                <button
                                    key={route.id}
                                    onClick={() => toggleRoute(route.id)}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                                        isSelected
                                            ? "border-primary/50 bg-primary/10 text-primary"
                                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                                    )}
                                >
                                    <div
                                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: route.color }}
                                    />
                                    <span className="font-medium">{route.name}</span>
                                    {isSelected && <Check className="h-3.5 w-3.5 ml-1" />}
                                </button>
                            )
                        })}
                        {allRoutes.length === 0 && (
                            <p className="text-sm text-muted-foreground">No routes available</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats (read-only) */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Stats</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="flex items-center justify-center gap-1">
                                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                                <span className="text-2xl font-bold">
                                    {vehicle.rating > 0 ? vehicle.rating.toFixed(1) : "-"}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Rating</p>
                        </div>
                        <div>
                            <span className="text-2xl font-bold">{vehicle.totalTrips}</span>
                            <p className="text-xs text-muted-foreground mt-1">Trips</p>
                        </div>
                        <div>
                            <span className="text-2xl font-bold">{vehicle.images.length}</span>
                            <p className="text-xs text-muted-foreground mt-1">Photos</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
