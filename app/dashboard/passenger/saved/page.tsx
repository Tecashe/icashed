"use client"

import { useSavedRoutes } from "@/hooks/use-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bookmark, MapPin, Navigation, Loader2, Route } from "lucide-react"
import Link from "next/link"

export default function PassengerSavedPage() {
  const { data, isLoading } = useSavedRoutes()
  const savedRoutes = data?.savedRoutes || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Saved Routes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your bookmarked routes for quick access.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : savedRoutes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {savedRoutes.map((sr) => (
            <Card key={sr.id} className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: sr.route.color }} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {sr.route.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{sr.route.code}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{sr.route.county}</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-primary" />
                  <span className="text-xs text-foreground">{sr.route.origin}</span>
                  <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
                  <span className="text-xs text-foreground">{sr.route.destination}</span>
                  <MapPin className="h-3 w-3 text-accent" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Navigation className="h-3 w-3" />
                    {sr.route._count.vehicles} vehicles
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/routes/${sr.route.id}`}>View Details</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <Bookmark className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">No saved routes yet</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Browse routes and tap the bookmark icon to save them here.</p>
          <Button variant="outline" size="sm" className="mt-4 bg-transparent" asChild>
            <Link href="/dashboard/passenger/routes">Browse Routes</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
