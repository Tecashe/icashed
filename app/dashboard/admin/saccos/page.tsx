"use client"

import { useState } from "react"
import { useAdminSaccos } from "@/hooks/use-data"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
    Building2,
    Search,
    Loader2,
    Plus,
    Users,
    Bus,
    Wallet,
    MapPin,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function AdminSaccosPage() {
    const [query, setQuery] = useState("")
    const [page, setPage] = useState(1)
    const [createOpen, setCreateOpen] = useState(false)
    const [createLoading, setCreateLoading] = useState(false)
    const [form, setForm] = useState({
        name: "",
        code: "",
        county: "",
        town: "",
        phone: "",
        email: "",
        chairman: "",
        secretary: "",
        description: "",
    })

    const { data, isLoading, mutate } = useAdminSaccos({ query, page })
    const saccos = data?.saccos || []
    const pagination = data?.pagination

    async function handleCreate() {
        if (!form.name || !form.code || !form.county || !form.town) return
        setCreateLoading(true)
        try {
            const res = await fetch("/api/sacco", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })

            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || "Failed to create SACCO")
                return
            }

            toast.success("SACCO created!")
            setCreateOpen(false)
            setForm({ name: "", code: "", county: "", town: "", phone: "", email: "", chairman: "", secretary: "", description: "" })
            mutate()
        } catch {
            toast.error("Failed to create SACCO")
        } finally {
            setCreateLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">
                        SACCO Management
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Platform-wide SACCO registration and oversight.
                    </p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Register SACCO
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Register New SACCO</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[60vh] space-y-3 overflow-y-auto pt-2">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">Name *</label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="mt-1"
                                        placeholder="Nairobi Matatu SACCO"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Code *</label>
                                    <Input
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                                        className="mt-1"
                                        placeholder="NMS"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">County *</label>
                                    <Input
                                        value={form.county}
                                        onChange={(e) => setForm({ ...form, county: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Town *</label>
                                    <Input
                                        value={form.town}
                                        onChange={(e) => setForm({ ...form, town: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">Phone</label>
                                    <Input
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Email</label>
                                    <Input
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">Chairman</label>
                                    <Input
                                        value={form.chairman}
                                        onChange={(e) => setForm({ ...form, chairman: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Secretary</label>
                                    <Input
                                        value={form.secretary}
                                        onChange={(e) => setForm({ ...form, secretary: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                                    rows={2}
                                />
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={createLoading || !form.name || !form.code || !form.county || !form.town}
                                className="w-full"
                            >
                                {createLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Register SACCO
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by name, code, or county..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1) }}
                    className="pl-10"
                />
            </div>

            {/* SACCO Cards */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : saccos.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {saccos.map(
                        (s: {
                            id: string
                            name: string
                            code: string
                            county: string
                            town: string
                            isActive: boolean
                            chairman: string | null
                            _count: { memberships: number; vehicles: number; collections: number }
                        }) => (
                            <Card key={s.id} className="overflow-hidden transition-shadow hover:shadow-md">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                                <Building2 className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <Link
                                                    href={`/dashboard/admin/saccos/${s.id}`}
                                                    className="font-display font-bold text-foreground hover:text-primary"
                                                >
                                                    {s.name}
                                                </Link>
                                                <p className="text-xs text-muted-foreground">
                                                    {s.code}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant={s.isActive ? "default" : "secondary"}
                                            className="text-xs"
                                        >
                                            {s.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>

                                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        {s.town}, {s.county}
                                    </div>

                                    {s.chairman && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Chairman: {s.chairman}
                                        </p>
                                    )}

                                    <div className="mt-3 flex gap-3 border-t border-border/50 pt-3">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Users className="h-3 w-3" />
                                            {s._count.memberships}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Bus className="h-3 w-3" />
                                            {s._count.vehicles}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Wallet className="h-3 w-3" />
                                            {s._count.collections}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    )}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center py-16 text-center">
                        <Building2 className="h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-3 text-sm text-muted-foreground">No SACCOs found</p>
                    </CardContent>
                </Card>
            )}

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
