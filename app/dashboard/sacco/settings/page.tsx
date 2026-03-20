"use client"

import { useState } from "react"
import { useMySacco } from "@/hooks/use-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Save, Loader2, Building2, Phone, Mail, FileText } from "lucide-react"
import { toast } from "sonner"

export default function SaccoSettingsPage() {
    const { data: mySacco, mutate } = useMySacco()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState<Record<string, string>>({})

    const sacco = mySacco?.sacco
    if (!sacco) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const val = (field: string) =>
        form[field] !== undefined
            ? form[field]
            : (sacco as unknown as Record<string, string | null>)[field] || ""

    function update(field: string, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    async function handleSave() {
        if (Object.keys(form).length === 0) return
        setLoading(true)
        try {
            const res = await fetch(`/api/sacco/${sacco!.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            })

            if (!res.ok) {
                const err = await res.json()
                toast.error(err.error || "Failed to update SACCO")
                return
            }

            toast.success("SACCO settings updated")
            setForm({})
            mutate()
        } catch {
            toast.error("Failed to update SACCO")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                    SACCO Settings
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Update your SACCO&apos;s profile information.
                </p>
            </div>

            {/* Info banner */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-3 p-4">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                        <p className="font-medium text-foreground">{sacco.name}</p>
                        <p className="text-xs text-muted-foreground">
                            Code: <Badge variant="outline">{sacco.code}</Badge> •{" "}
                            {sacco.town}, {sacco.county}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-base">
                        <Settings className="h-4 w-4" /> Organization Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium text-foreground">Name</label>
                            <Input
                                value={val("name")}
                                onChange={(e) => update("name", e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground">Registration Number</label>
                            <Input
                                value={val("regNumber")}
                                onChange={(e) => update("regNumber", e.target.value)}
                                className="mt-1"
                                placeholder="NTSA reg number"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium text-foreground">County</label>
                            <Input
                                value={val("county")}
                                onChange={(e) => update("county", e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground">Town</label>
                            <Input
                                value={val("town")}
                                onChange={(e) => update("town", e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="flex items-center gap-1 text-sm font-medium text-foreground">
                                <Phone className="h-3 w-3" /> Phone
                            </label>
                            <Input
                                value={val("phone")}
                                onChange={(e) => update("phone", e.target.value)}
                                className="mt-1"
                                placeholder="+254..."
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1 text-sm font-medium text-foreground">
                                <Mail className="h-3 w-3" /> Email
                            </label>
                            <Input
                                value={val("email")}
                                onChange={(e) => update("email", e.target.value)}
                                className="mt-1"
                                placeholder="sacco@example.com"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="text-sm font-medium text-foreground">Chairman</label>
                            <Input
                                value={val("chairman")}
                                onChange={(e) => update("chairman", e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-foreground">Secretary</label>
                            <Input
                                value={val("secretary")}
                                onChange={(e) => update("secretary", e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-1 text-sm font-medium text-foreground">
                            <FileText className="h-3 w-3" /> Description
                        </label>
                        <textarea
                            value={val("description")}
                            onChange={(e) => update("description", e.target.value)}
                            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            rows={3}
                            placeholder="About this SACCO..."
                        />
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={loading || Object.keys(form).length === 0}
                        className="gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
