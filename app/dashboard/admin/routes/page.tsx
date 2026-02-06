"use client"

import { useState } from "react"
import { useRoutes } from "@/hooks/use-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Route, Search, Loader2, MapPin, Bus } from "lucide-react"
import Link from "next/link"

export default function AdminRoutesPage() {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useRoutes({ query: search || undefined, limit: 50 })
  const routes = data?.routes || []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Route Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View all routes and their statistics.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search routes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Route</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">County</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">Stages</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Vehicles</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: route.color }} />
                      <div>
                        <p className="font-medium text-foreground">{route.name}</p>
                        <p className="text-xs text-muted-foreground">{route.origin} to {route.destination}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{route.code}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{route.county}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {route.stages.length}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Bus className="h-3 w-3" />
                      {route._count.vehicles}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {route.isActive ? (
                      <Badge className="bg-primary/10 text-primary text-xs">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {routes.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <Route className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No routes found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
