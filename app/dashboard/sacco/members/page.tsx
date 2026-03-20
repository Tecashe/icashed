"use client"

import { useState } from "react"
import { useMySacco, useSaccoMembers } from "@/hooks/use-data"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Users,
    Search,
    Loader2,
    Plus,
    UserMinus,
    ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

const ROLE_COLORS: Record<string, string> = {
    CHAIRMAN: "bg-chart-4/10 text-chart-4",
    SECRETARY: "bg-chart-1/10 text-chart-1",
    TREASURER: "bg-accent/10 text-accent",
    MEMBER: "bg-primary/10 text-primary",
}

export default function SaccoMembersPage() {
    const { data: mySacco } = useMySacco()
    const [query, setQuery] = useState("")
    const [page, setPage] = useState(1)
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [addEmail, setAddEmail] = useState("")
    const [addRole, setAddRole] = useState("MEMBER")
    const [addLoading, setAddLoading] = useState(false)

    const saccoId = mySacco?.saccoId || null
    const { data, isLoading, mutate } = useSaccoMembers(saccoId, { query, page })

    const members = data?.members || []
    const pagination = data?.pagination

    async function handleAddMember() {
        if (!addEmail || !saccoId) return
        setAddLoading(true)
        try {
            // First look up user by email
            const lookupRes = await fetch(
                `/api/admin/users?query=${encodeURIComponent(addEmail)}&limit=1`
            )
            const lookupData = await lookupRes.json()
            if (!lookupData.users?.length) {
                toast.error("No user found with that email")
                return
            }
            const userId = lookupData.users[0].id

            const res = await fetch(`/api/sacco/${saccoId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: addRole }),
            })

            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || "Failed to add member")
                return
            }

            toast.success("Member added successfully")
            setAddDialogOpen(false)
            setAddEmail("")
            setAddRole("MEMBER")
            mutate()
        } catch {
            toast.error("Failed to add member")
        } finally {
            setAddLoading(false)
        }
    }

    async function handleRemoveMember(memberId: string) {
        if (!saccoId || !confirm("Remove this member?")) return
        try {
            await fetch(`/api/sacco/${saccoId}/members/${memberId}`, {
                method: "DELETE",
            })
            toast.success("Member removed")
            mutate()
        } catch {
            toast.error("Failed to remove member")
        }
    }

    async function handleUpdateRole(memberId: string, role: string) {
        if (!saccoId) return
        try {
            await fetch(`/api/sacco/${saccoId}/members/${memberId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role }),
            })
            toast.success("Role updated")
            mutate()
        } catch {
            toast.error("Failed to update role")
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">
                        Members
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage SACCO membership and roles.
                    </p>
                </div>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Add Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Member</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    User Email
                                </label>
                                <Input
                                    placeholder="user@example.com"
                                    value={addEmail}
                                    onChange={(e) => setAddEmail(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground">
                                    Role
                                </label>
                                <Select value={addRole} onValueChange={setAddRole}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MEMBER">Member</SelectItem>
                                        <SelectItem value="TREASURER">Treasurer</SelectItem>
                                        <SelectItem value="SECRETARY">Secretary</SelectItem>
                                        <SelectItem value="CHAIRMAN">Chairman</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                onClick={handleAddMember}
                                disabled={addLoading || !addEmail}
                                className="w-full"
                            >
                                {addLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Add Member
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search by name, email, or phone..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setPage(1)
                    }}
                    className="pl-10"
                />
            </div>

            {/* Members Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : members.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <th className="px-4 py-3 font-medium text-muted-foreground">
                                            Member
                                        </th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">
                                            Role
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
                                            Vehicles
                                        </th>
                                        <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
                                            Joined
                                        </th>
                                        <th className="px-4 py-3 font-medium text-muted-foreground">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map(
                                        (m: {
                                            id: string
                                            role: string
                                            joinedAt: string
                                            user: {
                                                id: string
                                                name: string | null
                                                email: string
                                                phone: string | null
                                                _count: { vehicles: number }
                                            }
                                        }) => (
                                            <tr
                                                key={m.id}
                                                className="border-b border-border/50 last:border-0 hover:bg-muted/50"
                                            >
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-foreground">
                                                            {m.user.name || "No name"}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {m.user.email}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Select
                                                        value={m.role}
                                                        onValueChange={(v) => handleUpdateRole(m.id, v)}
                                                    >
                                                        <SelectTrigger className="h-7 w-28 border-none bg-transparent p-0">
                                                            <Badge
                                                                className={`text-xs ${ROLE_COLORS[m.role] || ""}`}
                                                            >
                                                                <ShieldCheck className="mr-1 h-3 w-3" />
                                                                {m.role}
                                                            </Badge>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="MEMBER">Member</SelectItem>
                                                            <SelectItem value="TREASURER">
                                                                Treasurer
                                                            </SelectItem>
                                                            <SelectItem value="SECRETARY">
                                                                Secretary
                                                            </SelectItem>
                                                            <SelectItem value="CHAIRMAN">Chairman</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                                                    {m.user._count.vehicles}
                                                </td>
                                                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                                                    {new Date(m.joinedAt).toLocaleDateString("en-KE")}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleRemoveMember(m.id)}
                                                    >
                                                        <UserMinus className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-16 text-center">
                            <Users className="h-10 w-10 text-muted-foreground/40" />
                            <p className="mt-3 text-sm text-muted-foreground">
                                No members found
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
