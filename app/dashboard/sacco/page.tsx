"use client"

import { useMySacco, useSaccoStats } from "@/hooks/use-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Users,
    Bus,
    Activity,
    Wallet,
    TrendingUp,
    Loader2,
    ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts"

export default function SaccoDashboardPage() {
    const { data: mySacco, isLoading: saccoLoading } = useMySacco()
    const { data: stats, isLoading: statsLoading } = useSaccoStats(
        mySacco?.saccoId || null
    )

    if (saccoLoading || statsLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!mySacco) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-lg font-semibold text-foreground">No SACCO Found</p>
                <p className="mt-2 text-sm text-muted-foreground">
                    Your account is not linked to any SACCO. Please contact the platform
                    administrator.
                </p>
            </div>
        )
    }

    const monthlyData = (stats?.monthlyTrend || []).map(
        (m: { month: string; total: number; count: number }) => ({
            month: new Date(m.month).toLocaleDateString("en-KE", {
                month: "short",
            }),
            total: m.total,
            count: m.count,
        })
    )

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="font-display text-2xl font-bold text-foreground">
                        {mySacco.sacco.name}
                    </h1>
                    <Badge
                        variant="secondary"
                        className="bg-primary/10 text-xs text-primary"
                    >
                        {mySacco.sacco.code}
                    </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                    {mySacco.sacco.town}, {mySacco.sacco.county} • Your role:{" "}
                    <span className="font-medium text-foreground">{mySacco.role}</span>
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card>
                    <CardContent className="flex flex-col items-center p-4 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                            {stats?.totalMembers || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Members</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex flex-col items-center p-4 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-1/10">
                            <Bus className="h-5 w-5 text-chart-1" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                            {stats?.totalVehicles || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Total Vehicles</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex flex-col items-center p-4 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10">
                            <Activity className="h-5 w-5 text-chart-3" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                            {stats?.activeVehicles || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Active Now</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex flex-col items-center p-4 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                            <Wallet className="h-5 w-5 text-accent" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-foreground">
                            KES{" "}
                            {(stats?.collectionsToday?.total || 0).toLocaleString("en-KE")}
                        </p>
                        <p className="text-xs text-muted-foreground">Today&apos;s Collections</p>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Revenue + Collections This Month */}
            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 font-display text-base">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Monthly Revenue Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={monthlyData}>
                                    <defs>
                                        <linearGradient
                                            id="saccoRevenueGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="hsl(var(--primary))"
                                                stopOpacity={0.3}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="hsl(var(--primary))"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="hsl(var(--border))"
                                    />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                    />
                                    <YAxis
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                            color: "hsl(var(--foreground))",
                                        }}
                                        formatter={(value: number) => [
                                            `KES ${value.toLocaleString("en-KE")}`,
                                            "Revenue",
                                        ]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="hsl(var(--primary))"
                                        fill="url(#saccoRevenueGradient)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                                No collection data yet. Start recording daily collections.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="font-display text-base">
                            This Month Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-lg bg-primary/5 p-4 text-center">
                            <p className="text-xs text-muted-foreground">Total Revenue</p>
                            <p className="mt-1 text-2xl font-bold text-primary">
                                KES{" "}
                                {(stats?.collectionsMonth?.total || 0).toLocaleString("en-KE")}
                            </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-4 text-center">
                            <p className="text-xs text-muted-foreground">Total Entries</p>
                            <p className="mt-1 text-xl font-bold text-foreground">
                                {stats?.collectionsMonth?.count || 0}
                            </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-4 text-center">
                            <p className="text-xs text-muted-foreground">Active Members</p>
                            <p className="mt-1 text-xl font-bold text-foreground">
                                {stats?.activeMembers || 0}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Collections */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="font-display text-base">
                        Recent Collections
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                        <Link
                            href="/dashboard/sacco/collections"
                            className="flex items-center gap-1 text-xs"
                        >
                            View All <ChevronRight className="h-3 w-3" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {stats?.recentCollections && stats.recentCollections.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <th className="pb-2 font-medium text-muted-foreground">
                                            Vehicle
                                        </th>
                                        <th className="pb-2 font-medium text-muted-foreground">
                                            Amount
                                        </th>
                                        <th className="hidden pb-2 font-medium text-muted-foreground sm:table-cell">
                                            Description
                                        </th>
                                        <th className="pb-2 font-medium text-muted-foreground">
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentCollections.map(
                                        (c: {
                                            id: string
                                            amount: number
                                            description: string | null
                                            date: string
                                            vehicle: {
                                                plateNumber: string
                                                nickname: string | null
                                            }
                                        }) => (
                                            <tr
                                                key={c.id}
                                                className="border-b border-border/50 last:border-0"
                                            >
                                                <td className="py-3 font-medium text-foreground">
                                                    {c.vehicle.plateNumber}
                                                    {c.vehicle.nickname && (
                                                        <span className="ml-1 text-xs text-muted-foreground">
                                                            ({c.vehicle.nickname})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 font-semibold text-primary">
                                                    KES {c.amount.toLocaleString("en-KE")}
                                                </td>
                                                <td className="hidden py-3 text-muted-foreground sm:table-cell">
                                                    {c.description || "—"}
                                                </td>
                                                <td className="py-3 text-muted-foreground">
                                                    {new Date(c.date).toLocaleDateString("en-KE")}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                            No collections recorded yet
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                    <Link href="/dashboard/sacco/members">
                        <Users className="h-5 w-5" />
                        <span className="text-xs">Manage Members</span>
                    </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                    <Link href="/dashboard/sacco/vehicles">
                        <Bus className="h-5 w-5" />
                        <span className="text-xs">Manage Vehicles</span>
                    </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                    <Link href="/dashboard/sacco/collections">
                        <Wallet className="h-5 w-5" />
                        <span className="text-xs">Record Collection</span>
                    </Link>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                    <Link href="/dashboard/sacco/settings">
                        <Activity className="h-5 w-5" />
                        <span className="text-xs">SACCO Settings</span>
                    </Link>
                </Button>
            </div>
        </div>
    )
}
