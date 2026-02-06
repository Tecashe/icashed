import type { Metadata } from "next"
import { RoutesList } from "@/components/routes/routes-list"

export const metadata: Metadata = {
  title: "Routes",
  description:
    "Browse all public transport routes across Kenya. Filter by county, search by name or stage.",
}

export default function RoutesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Routes
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse active public transport routes across Kenya. Click any route to
          see stages, vehicles, and live activity.
        </p>
      </div>

      <RoutesList />
    </div>
  )
}
