"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useRoutes } from "@/hooks/use-data"
import { apiPost } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, MapPin, Navigation, Bookmark, Loader2, Route } from "lucide-react"
import { KENYAN_COUNTIES } from "@/lib/constants"
import Link from "next/link"

export default function PassengerRoutesPage() {
  const [search, setSearch] = useState("")
  const [county, setCounty] = useState("all")
  const [savingId, setSavingId] = useState<string | null>(null)

  const { data, isLoading } = useRoutes({
    query: search || undefined,
    county: county !== "all" ? county : undefined,
  })

  const routes = data?.routes || []

  const handleSave = async (routeId: string) => {
    setSavingId(routeId)
    try {
      await apiPost("/api/passenger/saved-routes", { routeId })
      toast.success("Route saved to your favorites")
    } catch (err) {
      toast.error("Failed to save route", {
        description: err instanceof Error ? err.message : "Please try again",
      })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Browse Routes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find and save your daily commute routes.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search routes, stages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={county} onValueChange={setCounty}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="County" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Counties</SelectItem>
            {KENYAN_COUNTIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Routes grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : routes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {routes.map((route) => (
            <Card key={route.id} className="overflow-hidden">
              <div
                className="h-1.5"
                style={{ backgroundColor: route.color }}
              />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {route.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {route.code}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {route.county}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="text-xs text-foreground">
                    {route.origin}
                  </span>
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                  <span className="text-xs text-foreground">
                    {route.destination}
                  </span>
                  <MapPin className="h-3 w-3 text-accent" />
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Route className="h-3 w-3" />
                      {route.stages.length} stages
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      {route._count.vehicles} vehicles
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleSave(route.id)}
                      disabled={savingId === route.id}
                    >
                      {savingId === route.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/routes/${route.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <Route className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No routes found</p>
        </div>
      )}
    </div>
  )
}
