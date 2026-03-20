"use client"

import { useState } from "react"
import { useMySacco, useSaccoCollections, useSaccoVehicles } from "@/hooks/use-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Wallet,
    Search,
    Loader2,
    Plus,
    CalendarDays,
    TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts"

export default function SaccoCollectionsPage() {
    const { data: mySacco } = useMySacco()
    const saccoId = mySacco?.saccoId || null

    const [vehicleFilter, setVehicleFilter] = useState("")
    const [fromDate, setFromDate] = useState("")
    const [toDate, setToDate] = useState("")
    const [page, setPage] = useState(1)
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [addVehicleId, setAddVehicleId] = useState("")
    const [addAmount, setAddAmount] = useState("")
    const [addDate, setAddDate] = useState("")
    const [addDescription, setAddDescription] = useState("")
    const [addLoading, setAddLoading] = useState(false)

    const { data, isLoading, mutate } = useSaccoCollections(saccoId, {
        vehicleId: vehicleFilter || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
    })
    const { data: vehiclesData } = useSaccoVehicles(saccoId, { page: 1 })

    const collections = data?.collections || []
    const totalAmount = data?.totalAmount || 0
    const pagination = data?.pagination
    const saccoVehicles = vehiclesData?.vehicles || []

    // Build daily aggregate for chart from current filtered collections
    const dailyMap = new Map<string, number>()
    collections.forEach((c: { date: string; amount: number }) => {
        const day = new Date(c.date).toLocaleDateString("en-KE", {
            month: "short",
            day: "numeric",
        })
        dailyMap.set(day, (dailyMap.get(day) || 0) + c.amount)
    })
    const dailyData = Array.from(dailyMap.entries()).map(([day, total]) => ({
        day,
        total,
    }))

    async function handleRecord() {
        if (!addVehicleId || !addAmount || !saccoId) return
        setAddLoading(true)
        try {
            const res = await fetch(`/api/sacco/${saccoId}/collections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleId: addVehicleId,
                    amount: addAmount,
                    date: addDate || undefined,
                    description: addDescription || undefined,
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || "Failed to record collection")
                return
            }

            toast.success("Collection recorded!")
            setAddDialogOpen(false)
            setAddVehicleId("")
            setAddAmount("")
            setAddDate("")
            setAddDescription("")
            mutate()
        } catch {
            toast.error("Failed to record collection")
        } finally {
            setAddLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">
                        Collections
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Track daily vehicle revenue and collections.
                    </p>
                </div>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Record Collection
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Record Daily Collection</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    Vehicle
                                </label>
                                <Select value={addVehicleId} onValueChange={setAddVehicleId}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {saccoVehicles.map(
                                            (v: { id: string; plateNumber: string; nickname: string | null }) => (
                                                <SelectItem key={v.id} value={v.id}>
                                                    {v.plateNumber}
                                                    {v.nickname ? ` (${v.nickname})` : ""}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    Amount (KES)
                                </label>
                                <Input
                                    type="number"
                                    placeholder="5000"
                                    value={addAmount}
                                    onChange={(e) => setAddAmount(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    Date (optional, defaults to today)
                                </label>
                                <Input
                                    type="date"
                                    value={addDate}
                                    onChange={(e) => setAddDate(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    Description (optional)
                                </label>
                                <Input
                                    placeholder="Morning collection"
                                    value={addDescription}
                                    onChange={(e) => setAddDescription(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <Button
                                onClick={handleRecord}
                                disabled={addLoading || !addVehicleId || !addAmount}
                                className="w-full"
                            >
                                {addLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Record Collection
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Card */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                            <Wallet className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Filtered Total</p>
                            <p className="text-xl font-bold text-foreground">
                                KES {totalAmount.toLocaleString("en-KE")}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-1/10">
                            <TrendingUp className="h-6 w-6 text-chart-1" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Entries</p>
                            <p className="text-xl font-bold text-foreground">
                                {pagination?.total || 0}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Chart */}
            {dailyData.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 font-display text-base">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            Daily Collections
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={dailyData}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="hsl(var(--border))"
                                />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                                />
                                <YAxis
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
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
                                        "Total",
                                    ]}
                                />
                                <Bar
                                    dataKey="total"
                                    fill="hsl(var(--primary))"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row">
                <Select
                    value={vehicleFilter || "all"}
                    onValueChange={(v) => {
                        setVehicleFilter(v === "all" ? "" : v)
                        setPage(1)
                    }}
                >
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="All Vehicles" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Vehicles</SelectItem>
                        {saccoVehicles.map(
                            (v: { id: string; plateNumber: string }) => (
                                <SelectItem key={v.id} value={v.id}>
                                    {v.plateNumber}
                                </SelectItem>
                            )
                        )}
                    </SelectContent>
                </Select>
                <Input
                    type="date"
                    placeholder="From"
                    value={fromDate}
                    onChange={(e) => {
                        setFromDate(e.target.value)
                        setPage(1)
                    }}
                    className="w-full sm:w-40"
                />
                <Input
                    type="date"
                    placeholder="To"
                    value={toDate}
                    onChange={(e) => {
                        setToDate(e.target.value)
                        setPage(1)
                    }}
                    className="w-full sm:w-40"
                />
            </div>

            {/* Collections Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : collections.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <th className="px-4 py-3 font-medium text-muted-foreground">
                                            Vehicle
                                        </th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">
                                            Amount
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">
                                            Description
                                        </th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {collections.map(
                                        (c: {
                                            id: string
                                            amount: number
                                            description: string | null
                                            date: string
                                            vehicle: {
                                                id: string
                                                plateNumber: string
                                                nickname: string | null
                                            }
                                        }) => (
                                            <tr
                                                key={c.id}
                                                className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                                            >
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {c.vehicle.plateNumber}
                                                    {c.vehicle.nickname && (
                                                        <span className="ml-1 text-xs text-muted-foreground">
                                                            ({c.vehicle.nickname})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-primary">
                                                    KES {c.amount.toLocaleString("en-KE")}
                                                </td>
                                                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                                                    {c.description || "—"}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {new Date(c.date).toLocaleDateString("en-KE")}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-16 text-center">
                            <Wallet className="h-10 w-10 text-muted-foreground/40" />
                            <p className="mt-3 text-sm text-muted-foreground">
                                No collections found
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {pagination.pages}
                    </span>
                    <button
                        onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                        disabled={page >= pagination.pages}
                        className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}
