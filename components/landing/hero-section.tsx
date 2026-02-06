"use client"

import Link from "next/link"
import { ArrowRight, MapPin, Navigation, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 lg:px-6 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
            <Radio className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Live Transport Visibility for Kenya
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-balance font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Know what{"'"}s moving{" "}
            <span className="text-primary">before you move</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Radaa makes public transport observable. See live routes, track
            vehicles, and make informed decisions based on real movement across
            Nairobi, Mombasa, and beyond.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="gap-2 px-6" asChild>
              <Link href="/routes">
                Explore Routes
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 bg-transparent px-6"
              asChild
            >
              <Link href="/map">Open Live Map</Link>
            </Button>
          </div>
        </div>

        {/* Live Activity Indicator */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <span className="text-sm font-medium text-foreground">
                  Live Activity
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Nairobi, Kenya
              </span>
            </div>

            {/* Simulated Route Rows */}
            <div className="flex flex-col gap-3">
              {[
                {
                  route: "CBD - Rongai",
                  code: "NRB-101",
                  vehicles: 24,
                  color: "#10B981",
                },
                {
                  route: "CBD - Thika Road",
                  code: "NRB-103",
                  vehicles: 32,
                  color: "#F59E0B",
                },
                {
                  route: "CBD - Westlands",
                  code: "NRB-102",
                  vehicles: 18,
                  color: "#3B82F6",
                },
              ].map((item) => (
                <div
                  key={item.code}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.route}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {item.vehicles} vehicles
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
