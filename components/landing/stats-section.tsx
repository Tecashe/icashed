"use client"

import { usePlatformStats } from "@/hooks/use-data"
import { Route, Bus, MapPin, Users } from "lucide-react"

export function StatsSection() {
  const { data } = usePlatformStats()

  const stats = [
    {
      label: "Active Routes",
      value: data?.activeRoutes ?? data?.totalRoutes ?? 0,
      icon: Route,
    },
    {
      label: "Vehicles Tracked",
      value: data?.totalVehicles ?? 0,
      icon: Bus,
    },
    {
      label: "Stages Mapped",
      value: data?.totalStages ?? 0,
      icon: MapPin,
    },
    {
      label: "Commuters",
      value: data?.totalUsers ?? 0,
      icon: Users,
    },
  ]

  return (
    <section className="border-y border-border bg-card py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <p className="font-display text-3xl font-bold text-primary md:text-4xl">
                {stat.value > 0 ? `${stat.value.toLocaleString()}+` : "--"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
