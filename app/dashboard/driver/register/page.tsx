"use client"

import React from "react"
import { useState } from "react"
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
import { Bus, Loader2, CheckCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

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

  const toggleRoute = (routeId: string) => {
    setForm((prev) => ({
      ...prev,
      routeIds: prev.routeIds.includes(routeId)
        ? prev.routeIds.filter((id) => id !== routeId)
        : [...prev.routeIds, routeId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await apiPost("/api/driver/vehicles", form)
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

  return (
    <div className="flex flex-col gap-5">
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

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Bus className="h-5 w-5 text-primary" />
            Vehicle Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Plate Number - Full width on mobile */}
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

            {/* Type & Capacity - Side by side */}
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

            {/* Route selection */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Assign Routes *</Label>
              <p className="text-xs text-muted-foreground">
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
                <div className="mt-2 flex flex-col gap-2 max-h-[300px] overflow-y-auto">
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
            </div>

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
        </CardContent>
      </Card>
    </div>
  )
}
