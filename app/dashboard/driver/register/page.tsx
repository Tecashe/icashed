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
import { Bus, Loader2, CheckCircle } from "lucide-react"

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
      toast.success("Vehicle registered", {
        description: `${form.plateNumber} has been added to your fleet`,
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Register Vehicle
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new vehicle to your fleet. Must have a valid Kenyan plate.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Bus className="h-4 w-4 text-primary" />
            Vehicle Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="plate">Plate Number</Label>
                <Input
                  id="plate"
                  placeholder="KAA 123A"
                  value={form.plateNumber}
                  onChange={(e) =>
                    setForm({ ...form, plateNumber: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Format: KXX 123X (e.g. KBA 456J)
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nickname">Nickname (optional)</Label>
                <Input
                  id="nickname"
                  placeholder="e.g. Speed Governor"
                  value={form.nickname}
                  onChange={(e) =>
                    setForm({ ...form, nickname: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="type">Vehicle Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MATATU">Matatu (14-seater)</SelectItem>
                    <SelectItem value="BUS">Bus (50-seater)</SelectItem>
                    <SelectItem value="BODA">Boda Boda</SelectItem>
                    <SelectItem value="TUK_TUK">Tuk Tuk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="capacity">Capacity</Label>
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
                />
              </div>
            </div>

            {/* Route selection */}
            <div className="flex flex-col gap-2">
              <Label>Assign Routes</Label>
              <p className="text-xs text-muted-foreground">
                Select at least one route this vehicle operates on.
              </p>
              {routesLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">
                    Loading routes...
                  </span>
                </div>
              ) : (
                <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {routes.map((route) => (
                    <label
                      key={route.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                    >
                      <Checkbox
                        checked={form.routeIds.includes(route.id)}
                        onCheckedChange={() => toggleRoute(route.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {route.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {route.code} -- {route.county}
                        </p>
                      </div>
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: route.color }}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || form.routeIds.length === 0}
              className="self-start"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Register Vehicle
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
