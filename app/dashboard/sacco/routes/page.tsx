"use client"

import { useMySacco, useSaccoVehicles } from "@/hooks/use-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Route, MapPin } from "lucide-react"

export default function SaccoRoutesPage() {
    const { data: mySacco } = useMySacco()
    const saccoId = mySacco?.saccoId || null
    const { data, isLoading } = useSaccoVehicles(saccoId, { page: 1 })

    const vehicles = data?.vehicles || []

    // Extract unique routes from all SACCO vehicles
    const routeMap = new Map<
        string,
        {
            id: string
            name: string
            code: string
            vehicleCount: number
            vehicles: string[]
        }
    >()

    vehicles.forEach(
        (v: {
            plateNumber: string
            routes: { route: { id: string; name: string; code: string } }[]
        }) => {
            v.routes?.forEach((vr: { route: { id: string; name: string; code: string } }) => {
                const existing = routeMap.get(vr.route.id)
                if (existing) {
                    existing.vehicleCount++
                    existing.vehicles.push(v.plateNumber)
                } else {
                    routeMap.set(vr.route.id, {
                        id: vr.route.id,
                        name: vr.route.name,
                        code: vr.route.code,
                        vehicleCount: 1,
                        vehicles: [v.plateNumber],
                    })
                }
            })
        }
    )

    const routes = Array.from(routeMap.values())

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                    Routes
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Routes served by your SACCO vehicles.
                </p>
            </div>

            {routes.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {routes.map((route) => (
                        <Card key={route.id} className="overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                            <Route className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-display font-bold text-foreground">
                                                {route.name}
                                            </p>
                                            <Badge variant="outline" className="mt-1 text-xs">
                                                {route.code}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-lg bg-muted/50 p-3">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-sm font-medium text-foreground">
                                            {route.vehicleCount} Vehicle
                                            {route.vehicleCount !== 1 ? "s" : ""} on this route
                                        </p>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {route.vehicles.map((plate, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                                {plate}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center py-16 text-center">
                        <Route className="h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-3 text-sm text-muted-foreground">
                            No routes found. Assign vehicles with routes to see them here.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
