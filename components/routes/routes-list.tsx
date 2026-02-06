"use client"

import { useState } from "react"
import { useRoutes } from "@/hooks/use-data"
import { RouteCard } from "@/components/routes/route-card"
import { RouteFilters } from "@/components/routes/route-filters"
import { Route as RouteIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RoutesList() {
  const [search, setSearch] = useState("")
  const [county, setCounty] = useState("all")
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useRoutes({
    query: search || undefined,
    county: county !== "all" ? county : undefined,
    page,
    limit: 12,
  })

  const routes = data?.routes || []
  const pagination = data?.pagination

  return (
    <div className="flex flex-col gap-6">
      <RouteFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        county={county}
        onCountyChange={(v) => {
          setCounty(v)
          setPage(1)
        }}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/30 py-16">
          <p className="text-sm font-medium text-destructive">
            Failed to load routes
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Make sure your database is connected and seeded.
          </p>
        </div>
      ) : routes.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {routes.map((route) => (
              <RouteCard
                key={route.id}
                id={route.id}
                name={route.name}
                code={route.code}
                description={route.description}
                origin={route.origin}
                destination={route.destination}
                county={route.county}
                isActive={route.isActive}
                color={route.color}
                vehicleCount={route._count.vehicles}
                stages={route.stages.map((s) => ({
                  name: s.name,
                  lat: s.latitude,
                  lng: s.longitude,
                  order: s.order,
                  isTerminal: s.isTerminal,
                }))}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="bg-transparent"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="bg-transparent"
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
          <RouteIcon className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No routes found
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Try adjusting your search or filter
          </p>
        </div>
      )}
    </div>
  )
}
