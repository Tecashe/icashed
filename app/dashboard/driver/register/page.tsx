"use client"

import React from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useRoutes } from "@/hooks/use-data"
import { apiPost } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Bus,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Camera,
  ImageIcon,
  X,
  Upload,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface VehicleImage {
  file: File
  preview: string
  type: "front" | "side" | "interior" | "other"
}

export default function RegisterVehiclePage() {
  const router = useRouter()
  const { data: routesData, isLoading: routesLoading } = useRoutes({ limit: 50 })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    plateNumber: "",
    nickname: "",
    type: "MATATU",
    capacity: 14,
    routeIds: [] as string[],
  })

  // Vehicle images state
  const [images, setImages] = useState<VehicleImage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImageType, setSelectedImageType] = useState<VehicleImage["type"]>("front")

  const toggleRoute = (routeId: string) => {
    setForm((prev) => ({
      ...prev,
      routeIds: prev.routeIds.includes(routeId)
        ? prev.routeIds.filter((id) => id !== routeId)
        : [...prev.routeIds, routeId],
    }))
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }

    // Create preview URL
    const preview = URL.createObjectURL(file)

    // Replace existing image of same type or add new
    setImages(prev => {
      const filtered = prev.filter(img => img.type !== selectedImageType)
      return [...filtered, { file, preview, type: selectedImageType }]
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeImage = (type: VehicleImage["type"]) => {
    setImages(prev => {
      const img = prev.find(i => i.type === type)
      if (img) {
        URL.revokeObjectURL(img.preview)
      }
      return prev.filter(i => i.type !== type)
    })
  }

  const openImagePicker = (type: VehicleImage["type"]) => {
    setSelectedImageType(type)
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // First, upload images if any
      let imageUrls: { type: string; url: string }[] = []

      if (images.length > 0) {
        const formData = new FormData()
        images.forEach((img, index) => {
          formData.append(`image_${index}`, img.file)
          formData.append(`type_${index}`, img.type)
        })
        formData.append("imageCount", images.length.toString())

        // For now, we'll skip actual upload and just register the vehicle
        // In production, you'd upload to Cloudinary/S3 here
        // const uploadRes = await fetch("/api/upload/vehicle-images", { method: "POST", body: formData })
        // imageUrls = await uploadRes.json()
      }

      await apiPost("/api/driver/vehicles", {
        ...form,
        // images: imageUrls, // Uncomment when image upload endpoint is ready
      })

      toast.success("Vehicle registered!", {
        description: `${form.plateNumber} has been added`,
      })
      router.push("/dashboard/driver/vehicles")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to register vehicle"
      setError(msg)
      toast.error("Registration failed", { description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const routes = routesData?.routes || []

  const imageTypes: { type: VehicleImage["type"]; label: string; icon: React.ReactNode }[] = [
    { type: "front", label: "Front View", icon: <Camera className="h-5 w-5" /> },
    { type: "side", label: "Side View", icon: <Camera className="h-5 w-5" /> },
    { type: "interior", label: "Interior", icon: <Camera className="h-5 w-5" /> },
  ]

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
        capture="environment"
      />

      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0">
          <Link href="/dashboard/driver/vehicles">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            Register Vehicle
          </h1>
          <p className="text-sm text-muted-foreground">
            Add a new vehicle to your fleet
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Vehicle Details Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Bus className="h-5 w-5 text-primary" />
              Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {/* Plate Number */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="plate" className="text-sm font-medium">
                Plate Number *
              </Label>
              <Input
                id="plate"
                placeholder="KAA 123A"
                value={form.plateNumber}
                onChange={(e) =>
                  setForm({ ...form, plateNumber: e.target.value.toUpperCase() })
                }
                required
                className="h-12 text-base uppercase"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Format: KXX 123X (e.g. KBA 456J)
              </p>
            </div>

            {/* Nickname */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="nickname" className="text-sm font-medium">
                Nickname (optional)
              </Label>
              <Input
                id="nickname"
                placeholder="e.g. Speed Governor"
                value={form.nickname}
                onChange={(e) =>
                  setForm({ ...form, nickname: e.target.value })
                }
                className="h-12 text-base"
              />
            </div>

            {/* Type & Capacity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="type" className="text-sm font-medium">
                  Type *
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger id="type" className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MATATU" className="py-3">Matatu</SelectItem>
                    <SelectItem value="BUS" className="py-3">Bus</SelectItem>
                    <SelectItem value="BODA" className="py-3">Boda Boda</SelectItem>
                    <SelectItem value="TUK_TUK" className="py-3">Tuk Tuk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="capacity" className="text-sm font-medium">
                  Seats *
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={100}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: Number(e.target.value) })
                  }
                  required
                  className="h-12 text-base"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Photos Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <ImageIcon className="h-5 w-5 text-primary" />
              Vehicle Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add photos of your vehicle to help passengers identify it
            </p>

            <div className="grid grid-cols-3 gap-3">
              {imageTypes.map(({ type, label, icon }) => {
                const existingImage = images.find(img => img.type === type)

                return (
                  <div key={type} className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => openImagePicker(type)}
                      className={cn(
                        "relative aspect-square rounded-xl border-2 border-dashed transition-colors overflow-hidden",
                        existingImage
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      {existingImage ? (
                        <>
                          <img
                            src={existingImage.preview}
                            alt={label}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeImage(type)
                            }}
                            className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
                          {icon}
                          <Upload className="h-4 w-4 opacity-50" />
                        </div>
                      )}
                    </button>
                    <p className="text-xs text-center text-muted-foreground">
                      {label}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Routes Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Bus className="h-5 w-5 text-primary" />
              Assign Routes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Select at least one route this vehicle operates on
            </p>
            {routesLoading ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading routes...
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {routes.map((route) => (
                  <label
                    key={route.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted active:bg-muted"
                  >
                    <Checkbox
                      checked={form.routeIds.includes(route.id)}
                      onCheckedChange={() => toggleRoute(route.id)}
                      className="h-5 w-5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {route.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {route.code} — {route.county}
                      </p>
                    </div>
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: route.color }}
                    />
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={submitting || form.routeIds.length === 0}
          size="lg"
          className="h-14 w-full text-base font-semibold"
        >
          {submitting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle className="mr-2 h-5 w-5" />
          )}
          Register Vehicle
        </Button>
      </form>
    </div>
  )
}
