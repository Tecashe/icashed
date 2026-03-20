"use client"

import { useState, useMemo } from "react"
import { LiveMapView } from "@/components/map/google-live-map-view"
import { useRealtimePositions } from "@/hooks/use-realtime-positions"
import { useRoutes } from "@/hooks/use-data"
import { calculateDistance } from "@/lib/geo-utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bus,
  Zap,
  Route as RouteIcon,
  Gauge,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Activity,
  Users,
  MapPin,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function AdminMapPage() {
  const [showPanel, setShowPanel] = useState(true)
  const { positions: allPositions, isRealtime } = useRealtimePositions()
  const { data: routesData } = useRoutes({ limit: 100 })
  const routes = routesData?.routes || []

  // Fleet statistics
  const fleetStats = useMemo(() => {
    const totalActive = allPositions.length
    const moving = allPositions.filter((p) => p.position.speed > 5).length
    const stopped = totalActive - moving
    const avgSpeed =
      totalActive > 0
        ? Math.round(
          allPositions.reduce((s, p) => s + p.position.speed, 0) /
          totalActive
        )
        : 0

    // Vehicles by route
    const routeMap = new Map<string, { name: string; color: string; count: number; moving: number }>()
    allPositions.forEach((p) => {
      p.routes.forEach((r) => {
        const existing = routeMap.get(r.id)
        if (existing) {
          existing.count++
          if (p.position.speed > 5) existing.moving++
        } else {
          routeMap.set(r.id, {
            name: r.name,
            color: r.color || "#10B981",
            count: 1,
            moving: p.position.speed > 5 ? 1 : 0,
          })
        }
      })
    })

    // Vehicle types
    const typeMap = new Map<string, number>()
    allPositions.forEach((p) => {
      typeMap.set(p.type, (typeMap.get(p.type) || 0) + 1)
    })

    // Speed distribution
    const speedBuckets = { slow: 0, medium: 0, fast: 0 }
    allPositions.forEach((p) => {
      if (p.position.speed <= 5) speedBuckets.slow++
      else if (p.position.speed <= 40) speedBuckets.medium++
      else speedBuckets.fast++
    })

    return {
      totalActive,
      moving,
      stopped,
      avgSpeed,
      routeBreakdown: Array.from(routeMap.values()).sort(
        (a, b) => b.count - a.count
      ),
      typeBreakdown: Array.from(typeMap.entries()).map(([type, count]) => ({
        type,
        count,
      })),
      speedBuckets,
    }
  }, [allPositions])

  return (
    <div className="-m-4 lg:-m-6 flex h-[calc(100vh-4rem)]">
      {/* Admin Fleet Panel */}
      <div
        className={cn(
          "relative flex-shrink-0 border-r border-border/50 bg-gradient-to-b from-card to-card/95 transition-all duration-300 z-20",
          showPanel ? "w-80" : "w-0"
        )}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="absolute -right-4 top-4 z-30 bg-card border border-border rounded-full p-1.5 shadow-lg hover:bg-muted transition-colors"
        >
          {showPanel ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {showPanel && (
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">Fleet Command</h2>
                  <p className="text-[10px] text-muted-foreground">
                    Real-time overview
                  </p>
                </div>
              </div>
              <Badge
                variant={isRealtime ? "default" : "secondary"}
                className={cn(
                  "mt-2 text-[10px]",
                  isRealtime && "bg-green-500/15 text-green-600 border-green-500/30"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mr-1.5",
                    isRealtime ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
                  )}
                />
                {isRealtime ? "Live Connected" : "Connecting..."}
              </Badge>
            </div>

            {/* Quick Stats Grid */}
            <div className="p-3 grid grid-cols-2 gap-2 border-b border-border/50">
              <StatMiniCard
                icon={Bus}
                label="Total Active"
                value={fleetStats.totalActive}
                color="from-blue-500 to-blue-600"
              />
              <StatMiniCard
                icon={Zap}
                label="Moving"
                value={fleetStats.moving}
                color="from-green-500 to-green-600"
              />
              <StatMiniCard
                icon={Activity}
                label="Stopped"
                value={fleetStats.stopped}
                color="from-amber-500 to-amber-600"
              />
              <StatMiniCard
                icon={Gauge}
                label="Avg Speed"
                value={`${fleetStats.avgSpeed} km/h`}
                color="from-purple-500 to-purple-600"
              />
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                {/* Speed Distribution */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Speed Distribution
                  </h3>
                  <div className="space-y-1.5">
                    <SpeedBar
                      label="Stopped (0–5 km/h)"
                      count={fleetStats.speedBuckets.slow}
                      total={fleetStats.totalActive}
                      color="bg-amber-500"
                    />
                    <SpeedBar
                      label="Cruising (5–40 km/h)"
                      count={fleetStats.speedBuckets.medium}
                      total={fleetStats.totalActive}
                      color="bg-blue-500"
                    />
                    <SpeedBar
                      label="Fast (40+ km/h)"
                      count={fleetStats.speedBuckets.fast}
                      total={fleetStats.totalActive}
                      color="bg-green-500"
                    />
                  </div>
                </div>

                {/* Vehicle Types */}
                {fleetStats.typeBreakdown.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      Vehicle Types
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {fleetStats.typeBreakdown.map((t) => (
                        <Badge
                          key={t.type}
                          variant="secondary"
                          className="text-[10px] gap-1"
                        >
                          {TYPE_EMOJI[t.type] || "🚌"} {t.type.replace("_", " ")}
                          <span className="font-bold ml-0.5">{t.count}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Routes Breakdown */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Vehicles by Route
                  </h3>
                  {fleetStats.routeBreakdown.length > 0 ? (
                    <div className="space-y-1.5">
                      {fleetStats.routeBreakdown.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div
                            className="h-3 w-3 rounded-full flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: r.color }}
                          />
                          <span className="text-xs font-medium truncate flex-1">
                            {r.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 text-[10px]"
                            >
                              <Bus className="h-2.5 w-2.5 mr-0.5" />
                              {r.count}
                            </Badge>
                            {r.moving > 0 && (
                              <Badge className="h-5 px-1.5 text-[10px] bg-green-500/15 text-green-600 border-green-500/30">
                                <Zap className="h-2.5 w-2.5 mr-0.5" />
                                {r.moving}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No active vehicles tracked
                    </p>
                  )}
                </div>

                {/* Total Routes */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
                  <div className="flex items-center gap-2 text-xs">
                    <RouteIcon className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">
                      Total routes registered
                    </span>
                    <span className="font-bold ml-auto">{routes.length}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative min-w-0">
        <LiveMapView />
      </div>
    </div>
  )
}

// --- Sub-components ---

const TYPE_EMOJI: Record<string, string> = {
  MATATU: "🚐",
  BUS: "🚌",
  BODA: "🏍️",
  TUK_TUK: "🛺",
}

function StatMiniCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-2.5">
      <div className={`absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br ${color} opacity-10 blur-md`} />
      <div className="flex items-center gap-2">
        <div
          className={`h-7 w-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground leading-none">
            {label}
          </p>
          <p className="text-sm font-bold mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  )
}

function SpeedBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
