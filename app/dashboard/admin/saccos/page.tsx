"use client"

import { useState } from "react"
import { useAdminSaccos } from "@/hooks/use-data"
import { apiPatch, apiDelete } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Building2,
    Search,
    Loader2,
    Plus,
    Users,
    Bus,
    Wallet,
    MapPin,
    Pencil,
    Trash2,
} from "lucide-react"
import { toast } from "sonner"

interface SaccoItem {
    id: string
    name: string
    code: string
    county: string
    town: string
    phone: string | null
    email: string | null
    chairman: string | null
    secretary: string | null
    description: string | null
    isActive: boolean
    _count: { memberships: number; vehicles: number; collections: number }
}

const EMPTY_FORM = {
    name: "",
    code: "",
    county: "",
    town: "",
    phone: "",
    email: "",
    chairman: "",
    secretary: "",
    description: "",
}

export default function AdminSaccosPage() {
    const [query, setQuery] = useState("")
    const [page, setPage] = useState(1)
    const [createOpen, setCreateOpen] = useState(false)
    const [createLoading, setCreateLoading] = useState(false)
    const [form, setForm] = useState({ ...EMPTY_FORM })

    const [editSacco, setEditSacco] = useState<SaccoItem | null>(null)
    const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
    const [editLoading, setEditLoading] = useState(false)
    const [togglingId, setTogglingId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

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
            setForm({ ...EMPTY_FORM })
            mutate()
        } catch {
            toast.error("Failed to create SACCO")
        } finally {
            setCreateLoading(false)
        }
    }

    function openEdit(sacco: SaccoItem) {
        setEditSacco(sacco)
        setEditForm({
            name: sacco.name,
            code: sacco.code,
            county: sacco.county,
            town: sacco.town,
            phone: sacco.phone || "",
            email: sacco.email || "",
            chairman: sacco.chairman || "",
            secretary: sacco.secretary || "",
            description: sacco.description || "",
        })
    }

    async function handleSaveEdit() {
        if (!editSacco) return
        setEditLoading(true)
        try {
            await apiPatch(`/api/admin/saccos/${editSacco.id}`, {
                name: editForm.name,
                county: editForm.county,
                town: editForm.town,
                phone: editForm.phone || null,
                email: editForm.email || null,
                chairman: editForm.chairman || null,
                secretary: editForm.secretary || null,
                description: editForm.description || null,
            })
            toast.success("SACCO updated")
            setEditSacco(null)
            mutate()
        } catch (err) {
            toast.error("Failed to update SACCO", {
                description: err instanceof Error ? err.message : "Please try again",
            })
        } finally {
            setEditLoading(false)
        }
    }

    async function handleToggleActive(saccoId: string, currentActive: boolean) {
        setTogglingId(saccoId)
        try {
            await apiPatch(`/api/admin/saccos/${saccoId}`, { isActive: !currentActive })
            mutate()
            toast.success(currentActive ? "SACCO deactivated" : "SACCO activated")
        } catch {
            toast.error("Failed to toggle SACCO status")
        } finally {
            setTogglingId(null)
        }
    }

    async function handleDelete(saccoId: string) {
        setDeletingId(saccoId)
        try {
            await apiDelete(`/api/admin/saccos/${saccoId}`)
            toast.success("SACCO deleted")
            mutate()
        } catch (err) {
            toast.error("Failed to delete SACCO", {
                description: err instanceof Error ? err.message : "Please try again",
            })
        } finally {
            setDeletingId(null)
        }
    }

    function SaccoFormFields({
        values,
        onChange,
    }: {
        values: typeof EMPTY_FORM
        onChange: (v: typeof EMPTY_FORM) => void
    }) {
        return (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pt-2">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium">Name *</label>
                        <Input value={values.name} onChange={(e) => onChange({ ...values, name: e.target.value })} className="mt-1" placeholder="Nairobi Matatu SACCO" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Code *</label>
                        <Input value={values.code} onChange={(e) => onChange({ ...values, code: e.target.value })} className="mt-1" placeholder="NMS" />
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium">County *</label>
                        <Input value={values.county} onChange={(e) => onChange({ ...values, county: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Town *</label>
                        <Input value={values.town} onChange={(e) => onChange({ ...values, town: e.target.value })} className="mt-1" />
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium">Phone</label>
                        <Input value={values.phone} onChange={(e) => onChange({ ...values, phone: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input value={values.email} onChange={(e) => onChange({ ...values, email: e.target.value })} className="mt-1" />
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className="text-sm font-medium">Chairman</label>
                        <Input value={values.chairman} onChange={(e) => onChange({ ...values, chairman: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Secretary</label>
                        <Input value={values.secretary} onChange={(e) => onChange({ ...values, secretary: e.target.value })} className="mt-1" />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                        value={values.description}
                        onChange={(e) => onChange({ ...values, description: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        rows={2}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">SACCO Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Register, edit, toggle, or delete SACCOs.</p>
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
                        <SaccoFormFields values={form} onChange={setForm} />
                        <Button
                            onClick={handleCreate}
                            disabled={createLoading || !form.name || !form.code || !form.county || !form.town}
                            className="w-full"
                        >
                            {createLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Register SACCO
                        </Button>
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
                    {saccos.map((s: SaccoItem) => (
                        <Card key={s.id} className="overflow-hidden transition-shadow hover:shadow-md">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-display font-bold text-foreground">{s.name}</p>
                                            <p className="text-xs text-muted-foreground">{s.code}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={s.isActive}
                                            disabled={togglingId === s.id}
                                            onCheckedChange={() => handleToggleActive(s.id, s.isActive)}
                                        />
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {s.town}, {s.county}
                                </div>

                                {s.chairman && (
                                    <p className="mt-1 text-xs text-muted-foreground">Chairman: {s.chairman}</p>
                                )}

                                <div className="mt-3 flex gap-3 border-t border-border/50 pt-3">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Users className="h-3 w-3" /> {s._count.memberships}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Bus className="h-3 w-3" /> {s._count.vehicles}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Wallet className="h-3 w-3" /> {s._count.collections}
                                    </div>
                                    <div className="ml-auto flex items-center gap-1">
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete SACCO</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Delete <strong>{s.name}</strong>? All memberships and collections will be removed. This cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(s.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        disabled={deletingId === s.id}
                                                    >
                                                        {deletingId === s.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
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
                    <span className="text-sm text-muted-foreground">Page {page} of {pagination.pages}</span>
                    <button
                        onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                        disabled={page >= pagination.pages}
                        className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editSacco} onOpenChange={(open) => { if (!open) setEditSacco(null) }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit SACCO</DialogTitle>
                    </DialogHeader>
                    <SaccoFormFields values={editForm} onChange={setEditForm} />
                    <Button onClick={handleSaveEdit} disabled={editLoading || !editForm.name || !editForm.county || !editForm.town} className="w-full">
                        {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    )
}
