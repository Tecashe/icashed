import type { Metadata } from "next"
import { VehiclesGallery } from "@/components/vehicles/vehicles-gallery"

export const metadata: Metadata = {
  title: "Vehicle Gallery",
  description:
    "Browse the vehicle gallery. See photos, ratings, routes, and live activity for matatus, buses, and more.",
}

export default function VehiclesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Vehicle Gallery
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse vehicles, check ratings, and recognize your ride before you
          board. Building familiarity builds confidence.
        </p>
      </div>

      <VehiclesGallery />
    </div>
  )
}
