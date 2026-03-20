"use client"

import { useAdminAnalytics } from "@/hooks/use-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, Bus, Building2, Wallet, BarChart3 } from "lucide-react"
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
} from "recharts"

const PIE_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-1))",
    "hsl(var(--chart-3))",
    "hsl(var(--accent))",
    "hsl(var(--chart-4))",
]

export default function AdminAnalyticsPage() {
    const { data, isLoading } = useAdminAnalytics()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
                Unable to load analytics
            </div>
        )
    }

    const userGrowth = (data.userGrowth || []).map(
        (d: { month: string; count: number }) => ({
            month: new Date(d.month).toLocaleDateString("en-KE", { month: "short" }),
            count: d.count,
        })
    )

    const vehicleGrowth = (data.vehicleGrowth || []).map(
        (d: { month: string; count: number }) => ({
            month: new Date(d.month).toLocaleDateString("en-KE", { month: "short" }),
            count: d.count,
        })
    )

    const collectionTrends = (data.collectionTrends || []).map(
        (d: { month: string; total: number; count: number }) => ({
            month: new Date(d.month).toLocaleDateString("en-KE", { month: "short" }),
            total: Number(d.total),
            count: d.count,
        })
    )

    const roleDistribution = (data.roleDistribution || []).map(
        (r: { role: string; count: number }) => ({
            name: r.role,
            value: r.count,
        })
    )

    const topSaccos = data.topSaccos || []

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                    Platform Analytics
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Comprehensive insights and trends across the entire platform.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card>
                    <CardContent className="flex flex-col items-center p-4 text-center">
                        <Users className="h-6 w-6 text-primary" />
                        <p className="mt-1 text-xl font-bold">
                            {userGrowth.reduce(
                                (a: number, b: { count: number }) => a + b.count,
                                0
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            New Users (12mo)
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex flex-col items-center p-4 text-center">
                        <Bus className="h-6 w-6 text-chart-1" />
                        <p className="mt-1 text-xl font-bold">
                            {vehicleGrowth.reduce(
                                (a: number, b: { count: number }) => a + b.count,
                                0
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            New Vehicles (12mo)
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex flex-col items-center p-4 text-center">
                        <Building2 className="h-6 w-6 text-chart-3" />
                        <p className="mt-1 text-xl font-bold">{topSaccos.length}</p>
                        <p className="text-xs text-muted-foreground">Active SACCOs</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex flex-col items-center p-4 text-center">
                        <Wallet className="h-6 w-6 text-accent" />
                        <p className="mt-1 text-xl font-bold">
                            KES {Number(data.totalRevenue || 0).toLocaleString("en-KE")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Total Collections
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* User Growth */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 font-display text-base">
                            <Users className="h-4 w-4 text-primary" />
                            User Growth (12 months)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {userGrowth.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={userGrowth}>
                                    <defs>
                                        <linearGradient id="ugGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                        }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#ugGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-12 text-center text-sm text-muted-foreground">No data available</p>
                        )}
                    </CardContent>
                </Card>

                {/* Vehicle Growth */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 font-display text-base">
                            <Bus className="h-4 w-4 text-chart-1" />
                            Vehicle Registrations (12 months)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {vehicleGrowth.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={vehicleGrowth}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                        }}
                                    />
                                    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-12 text-center text-sm text-muted-foreground">No data available</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* Collections Trend */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 font-display text-base">
                            <BarChart3 className="h-4 w-4 text-accent" />
                            SACCO Collections (6 months)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {collectionTrends.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={collectionTrends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                        }}
                                        formatter={(value: number) => [`KES ${value.toLocaleString("en-KE")}`, "Revenue"]}
                                    />
                                    <Bar dataKey="total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-12 text-center text-sm text-muted-foreground">No collections yet</p>
                        )}
                    </CardContent>
                </Card>

                {/* Role Distribution Pie */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="font-display text-base">User Roles</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {roleDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={roleDistribution}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({ name, percent }: { name: string; percent: number }) =>
                                            `${name} ${(percent * 100).toFixed(0)}%`
                                        }
                                        labelLine={false}
                                    >
                                        {roleDistribution.map((_: { name: string; value: number }, i: number) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="py-12 text-center text-sm text-muted-foreground">No data</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top SACCOs */}
            {topSaccos.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 font-display text-base">
                            <Building2 className="h-4 w-4 text-primary" />
                            Top SACCOs by Fleet Size
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <th className="px-4 py-2 font-medium text-muted-foreground">SACCO</th>
                                        <th className="px-4 py-2 font-medium text-muted-foreground">County</th>
                                        <th className="px-4 py-2 font-medium text-muted-foreground">Vehicles</th>
                                        <th className="px-4 py-2 font-medium text-muted-foreground">Members</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topSaccos.map(
                                        (s: {
                                            id: string
                                            name: string
                                            code: string
                                            county: string
                                            _count: { vehicles: number; memberships: number }
                                        }) => (
                                            <tr key={s.id} className="border-b border-border/50 last:border-0">
                                                <td className="px-4 py-3">
                                                    <span className="font-medium text-foreground">{s.name}</span>
                                                    <span className="ml-1 text-xs text-muted-foreground">({s.code})</span>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{s.county}</td>
                                                <td className="px-4 py-3 font-semibold text-foreground">{s._count.vehicles}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{s._count.memberships}</td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
