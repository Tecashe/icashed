"use client"

import { useMemo } from "react"
import { useAdminStats, useRoutes } from "@/hooks/use-data"
import { useRealtimePositions } from "@/hooks/use-realtime-positions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Route,
  Bus,
  AlertTriangle,
  Activity,
  Clock,
  Loader2,
  ChevronRight,
  Building2,
  TrendingUp,
  TrendingDown,
  Star,
  Shield,
  Zap,
  CheckCircle2,
  UserPlus,
  Map as MapIcon,
  Gauge,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-3))",
  "hsl(var(--accent))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const REPORT_STATUS_COLORS: Record<string, string> = {
  PENDING: "hsl(var(--chart-4))",
  REVIEWED: "hsl(var(--chart-1))",
  RESOLVED: "hsl(var(--primary))",
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  MATATU: "Matatu",
  BUS: "Bus",
  BODA: "Boda Boda",
  TUK_TUK: "Tuk Tuk",
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  SAFETY: "Safety",
  ROUTE_ISSUE: "Route",
  VEHICLE_ISSUE: "Vehicle",
  GENERAL: "General",
}

const ROLE_LABELS: Record<string, string> = {
  COMMUTER: "Commuters",
  OPERATOR: "Operators",
  SACCO_ADMIN: "SACCO Admins",
  ADMIN: "Admins",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DonutChart({ data, colors, innerLabel }: { data: { name: string; value: number }[]; colors?: string[]; innerLabel?: string }) {
  const chartColors = colors || DONUT_COLORS
  const total = data.reduce((a, b) => a + b.value, 0)
  if (total === 0) return <p className="py-8 text-center text-xs text-muted-foreground">No data yet</p>

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            dataKey="value"
            strokeWidth={2}
            stroke="hsl(var(--card))"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={chartColors[i % chartColors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number, name: string) => [value, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      {innerLabel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{total}</p>
            <p className="text-[10px] text-muted-foreground">{innerLabel}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function DonutLegend({ data, colors, labelMap }: { data: { name: string; value: number }[]; colors?: string[]; labelMap?: Record<string, string> }) {
  const chartColors = colors || DONUT_COLORS
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
      {data.map((d, i) => (
        <div key={d.name} className="flex items-center gap-1.5 text-xs">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
          <span className="text-muted-foreground">{labelMap?.[d.name] || d.name}</span>
          <span className="font-medium text-foreground">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminStats()
  const { positions: allPositions, isRealtime } = useRealtimePositions()
  const { data: routesData } = useRoutes({ limit: 100 })
  const routes = routesData?.routes || []

  // Live fleet calculations
  const fleetSummary = useMemo(() => {
    const total = allPositions.length
    const moving = allPositions.filter((p) => p.position.speed > 5).length
    const avgSpeed = total > 0 ? Math.round(allPositions.reduce((s, p) => s + p.position.speed, 0) / total) : 0

    const byRoute = new Map<string, { name: string; color: string; count: number }>()
    allPositions.forEach((p) => {
      p.routes.forEach((r) => {
        const e = byRoute.get(r.id)
        if (e) e.count++
        else byRoute.set(r.id, { name: r.name, color: r.color || '#10B981', count: 1 })
      })
    })

    return {
      total,
      moving,
      stopped: total - moving,
      avgSpeed,
      topRoutes: Array.from(byRoute.values()).sort((a, b) => b.count - a.count).slice(0, 6),
    }
  }, [allPositions])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const kpi = data?.kpi

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform overview, KPIs, and management controls.
        </p>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              {kpi && kpi.userGrowthPercent !== 0 && (
                <Badge variant="secondary" className={`text-xs gap-1 ${kpi.userGrowthPercent > 0 ? "text-primary" : "text-destructive"}`}>
                  {kpi.userGrowthPercent > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {kpi.userGrowthPercent > 0 ? "+" : ""}{kpi.userGrowthPercent}%
                </Badge>
              )}
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{data?.totalUsers || 0}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-primary/40 to-primary/0" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-1/10">
                <Route className="h-5 w-5 text-chart-1" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{data?.totalRoutes || 0}</p>
            <p className="text-xs text-muted-foreground">Total Routes</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[hsl(var(--chart-1))]/40 to-transparent" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <Bus className="h-5 w-5 text-accent" />
              </div>
              <Badge variant="secondary" className="text-xs text-primary gap-1">
                <Activity className="h-3 w-3" />
                {data?.activeVehicles || 0} active
              </Badge>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{data?.totalVehicles || 0}</p>
            <p className="text-xs text-muted-foreground">Total Vehicles</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[hsl(var(--accent))]/40 to-transparent" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10">
                <Building2 className="h-5 w-5 text-chart-2" />
              </div>
              <Badge variant="secondary" className="text-xs text-primary gap-1">
                {data?.activeSaccos || 0} active
              </Badge>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{data?.totalSaccos || 0}</p>
            <p className="text-xs text-muted-foreground">Total SACCOs</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[hsl(var(--chart-2))]/40 to-transparent" />
        </Card>
      </div>

      {/* Quick Engagement KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{kpi?.newUsersThisWeek || 0}</p>
              <p className="text-[11px] text-muted-foreground">New This Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-1/10">
              <UserPlus className="h-4 w-4 text-chart-1" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{kpi?.newUsersThisMonth || 0}</p>
              <p className="text-[11px] text-muted-foreground">New This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <Star className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{kpi?.avgRating || "–"}</p>
              <p className="text-[11px] text-muted-foreground">Avg Rating</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-3/10">
              <CheckCircle2 className="h-4 w-4 text-chart-3" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{kpi?.resolutionRate || 0}%</p>
              <p className="text-[11px] text-muted-foreground">Resolution Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-4/10">
              <Zap className="h-4 w-4 text-chart-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{kpi?.premiumVehicles || 0}</p>
              <p className="text-[11px] text-muted-foreground">Premium Vehicles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Donut Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Vehicle Type Distribution */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 font-display text-sm">
              <Bus className="h-4 w-4 text-chart-1" />
              Vehicle Types
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <DonutChart
              data={(kpi?.vehicleTypeDistribution || []).map((d: { name: string; value: number }) => ({
                ...d,
                name: VEHICLE_TYPE_LABELS[d.name] || d.name,
              }))}
              innerLabel="Total"
            />
            <DonutLegend
              data={(kpi?.vehicleTypeDistribution || []).map((d: { name: string; value: number }) => ({
                ...d,
                name: VEHICLE_TYPE_LABELS[d.name] || d.name,
              }))}
            />
          </CardContent>
        </Card>

        {/* User Roles Distribution */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 font-display text-sm">
              <Users className="h-4 w-4 text-primary" />
              User Roles
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <DonutChart
              data={(kpi?.roleDistribution || []).map((d: { name: string; value: number }) => ({
                ...d,
                name: ROLE_LABELS[d.name] || d.name,
              }))}
              innerLabel="Users"
            />
            <DonutLegend
              data={(kpi?.roleDistribution || []).map((d: { name: string; value: number }) => ({
                ...d,
                name: ROLE_LABELS[d.name] || d.name,
              }))}
            />
          </CardContent>
        </Card>

        {/* Report Status Breakdown */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 font-display text-sm">
              <AlertTriangle className="h-4 w-4 text-chart-4" />
              Report Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <DonutChart
              data={kpi?.reportStatusDistribution || []}
              colors={
                (kpi?.reportStatusDistribution || []).map(
                  (d: { name: string }) => REPORT_STATUS_COLORS[d.name] || DONUT_COLORS[0]
                )
              }
              innerLabel="Reports"
            />
            <DonutLegend
              data={kpi?.reportStatusDistribution || []}
              colors={
                (kpi?.reportStatusDistribution || []).map(
                  (d: { name: string }) => REPORT_STATUS_COLORS[d.name] || DONUT_COLORS[0]
                )
              }
            />
          </CardContent>
        </Card>

        {/* Premium vs Regular */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 font-display text-sm">
              <Shield className="h-4 w-4 text-accent" />
              Premium Adoption
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <DonutChart
              data={[
                { name: "Premium", value: kpi?.premiumVehicles || 0 },
                { name: "Regular", value: kpi?.regularVehicles || 0 },
              ]}
              colors={["hsl(var(--accent))", "hsl(var(--muted-foreground))"]}
              innerLabel="Vehicles"
            />
            <DonutLegend
              data={[
                { name: "Premium", value: kpi?.premiumVehicles || 0 },
                { name: "Regular", value: kpi?.regularVehicles || 0 },
              ]}
              colors={["hsl(var(--accent))", "hsl(var(--muted-foreground))"]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sentiment & Report Type Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Review Sentiment Tags */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-sm">
              <Star className="h-4 w-4 text-accent" />
              Review Sentiment Tags
              {kpi?.totalReviews ? (
                <Badge variant="secondary" className="ml-auto text-xs">{kpi.totalReviews} reviews</Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpi?.reviewTags && kpi.reviewTags.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={kpi.reviewTags.map((t: { tag: string; count: number }) => ({
                    tag: t.tag.replace(/_/g, " "),
                    count: t.count,
                  }))}
                  layout="vertical"
                  margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="tag"
                    width={100}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No review tags yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Report Type Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-sm">
              <AlertTriangle className="h-4 w-4 text-chart-3" />
              Report Categories
              <Badge variant="secondary" className="ml-auto text-xs">
                {data?.pendingReports || 0} pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kpi?.reportTypeDistribution && kpi.reportTypeDistribution.length > 0 ? (
              <>
                <DonutChart
                  data={kpi.reportTypeDistribution.map((d: { name: string; value: number }) => ({
                    ...d,
                    name: REPORT_TYPE_LABELS[d.name] || d.name,
                  }))}
                  colors={["hsl(var(--destructive))", "hsl(var(--chart-1))", "hsl(var(--chart-3))", "hsl(var(--muted-foreground))"]}
                  innerLabel="Reports"
                />
                <DonutLegend
                  data={kpi.reportTypeDistribution.map((d: { name: string; value: number }) => ({
                    ...d,
                    name: REPORT_TYPE_LABELS[d.name] || d.name,
                  }))}
                  colors={["hsl(var(--destructive))", "hsl(var(--chart-1))", "hsl(var(--chart-3))", "hsl(var(--muted-foreground))"]}
                />
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No reports yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Fleet Status */}
      <Card className="relative overflow-hidden border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <MapIcon className="h-4 w-4 text-primary-foreground" />
            </div>
            Live Fleet Status
            <Badge
              variant={isRealtime ? "default" : "secondary"}
              className={cn(
                "text-[10px] ml-2",
                isRealtime && "bg-green-500/15 text-green-600 border-green-500/30"
              )}
            >
              <span className={cn(
                "w-1.5 h-1.5 rounded-full mr-1",
                isRealtime ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
              )} />
              {isRealtime ? "Live" : "Connecting"}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/admin/map" className="flex items-center gap-1 text-xs">
              Open Map <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-4">
            <div className="rounded-xl border border-border/50 bg-card p-3 relative overflow-hidden">
              <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 opacity-10 blur-md" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Bus className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Tracked</p>
                  <p className="text-lg font-bold">{fleetSummary.total}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-3 relative overflow-hidden">
              <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 opacity-10 blur-md" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Moving</p>
                  <p className="text-lg font-bold">{fleetSummary.moving}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-3 relative overflow-hidden">
              <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 opacity-10 blur-md" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Stopped</p>
                  <p className="text-lg font-bold">{fleetSummary.stopped}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-3 relative overflow-hidden">
              <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 opacity-10 blur-md" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Gauge className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Avg Speed</p>
                  <p className="text-lg font-bold">{fleetSummary.avgSpeed} <span className="text-xs font-normal text-muted-foreground">km/h</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Top routes */}
          {fleetSummary.topRoutes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Top Active Routes</p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                {fleetSummary.topRoutes.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="text-xs font-medium truncate flex-1">{r.name}</span>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      <Bus className="h-2.5 w-2.5 mr-0.5" />
                      {r.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fleetSummary.total === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No vehicles are currently being tracked
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="font-display text-base">
            Recent Users
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/dashboard/admin/users"
              className="flex items-center gap-1 text-xs"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data?.recentUsers && data.recentUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 font-medium text-foreground">
                        {user.name || "No name"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-xs">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No users yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Button variant="outline" className="h-auto flex-col gap-1 py-4" asChild>
          <Link href="/dashboard/admin/users">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-xs">Manage Users</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1 py-4" asChild>
          <Link href="/dashboard/admin/routes">
            <Route className="h-5 w-5 text-chart-1" />
            <span className="text-xs">Manage Routes</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1 py-4" asChild>
          <Link href="/dashboard/admin/vehicles">
            <Bus className="h-5 w-5 text-accent" />
            <span className="text-xs">Manage Vehicles</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col gap-1 py-4" asChild>
          <Link href="/dashboard/admin/reports">
            <Clock className="h-5 w-5 text-chart-4" />
            <span className="text-xs">Manage Reports</span>
          </Link>
        </Button>
      </div>
    </div>
  )
}
