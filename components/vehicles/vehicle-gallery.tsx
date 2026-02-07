"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { toast } from "sonner"
import {
    Camera,
    Upload,
    X,
    Star,
    Trash2,
    Loader2,
    ImagePlus,
    ChevronLeft,
    ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import useSWR, { mutate } from "swr"
import { fetcher } from "@/lib/api-client"

interface VehicleImage {
    id: string
    vehicleId: string
    url: string
    caption: string | null
    isPrimary: boolean
    createdAt: string
}

interface ImageGalleryProps {
    vehicleId: string
    editable?: boolean
}

export function VehicleImageGallery({ vehicleId, editable = false }: ImageGalleryProps) {
    const { data, isLoading } = useSWR<{ images: VehicleImage[] }>(
        `/api/vehicles/${vehicleId}/images`,
        fetcher
    )
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const images = data?.images || []
    const hasImages = images.length > 0
    const primaryImage = images.find((img) => img.isPrimary) || images[0]

    const handlePrevious = () => {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    }

    const handleNext = () => {
        setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    }

    if (isLoading) {
        return (
            <div className="flex h-48 items-center justify-center rounded-xl bg-muted">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!hasImages && !editable) {
        return (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl bg-muted/50">
                <Camera className="h-10 w-10 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">No photos available</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Main Image */}
            {hasImages && (
                <div className="relative overflow-hidden rounded-xl bg-muted">
                    <div
                        className="relative aspect-video cursor-pointer"
                        onClick={() => setIsFullscreen(true)}
                    >
                        <Image
                            src={images[selectedIndex]?.url || "/placeholder-vehicle.png"}
                            alt={images[selectedIndex]?.caption || "Vehicle photo"}
                            fill
                            className="object-cover"
                        />
                        {images[selectedIndex]?.isPrimary && (
                            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-1 text-xs font-medium text-white">
                                <Star className="h-3 w-3" />
                                Primary
                            </div>
                        )}
                    </div>

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handlePrevious()
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 backdrop-blur-sm transition hover:bg-black/70"
                            >
                                <ChevronLeft className="h-5 w-5 text-white" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleNext()
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 backdrop-blur-sm transition hover:bg-black/70"
                            >
                                <ChevronRight className="h-5 w-5 text-white" />
                            </button>
                        </>
                    )}

                    {/* Image Counter */}
                    {images.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                            {selectedIndex + 1} / {images.length}
                        </div>
                    )}
                </div>
            )}

            {/* Thumbnail Strip */}
            {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((image, index) => (
                        <button
                            key={image.id}
                            onClick={() => setSelectedIndex(index)}
                            className={cn(
                                "relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg transition-all",
                                selectedIndex === index
                                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                                    : "opacity-60 hover:opacity-100"
                            )}
                        >
                            <Image
                                src={image.url}
                                alt={image.caption || "Thumbnail"}
                                fill
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Editable: Upload Section */}
            {editable && <ImageUploader vehicleId={vehicleId} />}

            {/* Fullscreen Modal */}
            {isFullscreen && hasImages && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                    onClick={() => setIsFullscreen(false)}
                >
                    <button
                        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 backdrop-blur-sm"
                        onClick={() => setIsFullscreen(false)}
                    >
                        <X className="h-6 w-6 text-white" />
                    </button>
                    <div className="relative h-[80vh] w-[90vw]">
                        <Image
                            src={images[selectedIndex]?.url || ""}
                            alt={images[selectedIndex]?.caption || "Vehicle photo"}
                            fill
                            className="object-contain"
                        />
                    </div>
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handlePrevious()
                                }}
                                className="absolute left-4 rounded-full bg-white/10 p-3 backdrop-blur-sm"
                            >
                                <ChevronLeft className="h-8 w-8 text-white" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleNext()
                                }}
                                className="absolute right-4 rounded-full bg-white/10 p-3 backdrop-blur-sm"
                            >
                                <ChevronRight className="h-8 w-8 text-white" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// Image Uploader Component
function ImageUploader({ vehicleId }: { vehicleId: string }) {
    const [isUploading, setIsUploading] = useState(false)
    const [caption, setCaption] = useState("")
    const [isPrimary, setIsPrimary] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (file: File) => {
        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append("image", file)
            if (caption) formData.append("caption", caption)
            formData.append("isPrimary", isPrimary.toString())

            const response = await fetch(`/api/vehicles/${vehicleId}/images`, {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Upload failed")
            }

            toast.success("Image uploaded!")
            mutate(`/api/vehicles/${vehicleId}/images`)
            setCaption("")
            setIsPrimary(false)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Upload failed")
        } finally {
            setIsUploading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleUpload(file)
        }
    }

    return (
        <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
            />

            <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                    </>
                ) : (
                    <>
                        <ImagePlus className="h-4 w-4" />
                        Add Photo
                    </>
                )}
            </Button>

            <div className="flex gap-2">
                <Input
                    placeholder="Caption (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="flex-1"
                />
                <Button
                    variant={isPrimary ? "default" : "outline"}
                    size="icon"
                    onClick={() => setIsPrimary(!isPrimary)}
                    title="Set as primary"
                >
                    <Star className={cn("h-4 w-4", isPrimary && "fill-current")} />
                </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
                JPEG, PNG, or WebP • Max 5MB
            </p>
        </div>
    )
}
