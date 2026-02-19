"use client"

import { useState } from "react"
import { useRoutes } from "@/hooks/use-data"
import { apiPatch, apiDelete } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Route, Search, Loader2, MapPin, Bus, Trash2, Pencil } from "lucide-react"
import { toast } from "sonner"

interface RouteItem {
  id: string
  name: string
  code: string
  description: string | null
  origin: string
  destination: string
  county: string
  color: string
  isActive: boolean
  stages: { id: string }[]
  _count: { vehicles: number }
}

export default function AdminRoutesPage() {
  const [search, setSearch] = useState("")
  const { data, isLoading, mutate } = useRoutes({ query: search || undefined, limit: 50 })
  const routes = data?.routes || []

  const [editRoute, setEditRoute] = useState<RouteItem | null>(null)
  const [form, setForm] = useState({ name: "", description: "", origin: "", destination: "", color: "" })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function openEdit(route: RouteItem) {
    setEditRoute(route)
    setForm({
      name: route.name,
      description: route.description || "",
      origin: route.origin,
      destination: route.destination,
      color: route.color,
    })
  }

  async function handleSaveEdit() {
    if (!editRoute) return
    setSaving(true)
    try {
      await apiPatch(`/api/admin/routes/${editRoute.id}`, form)
      toast.success("Route updated")
      setEditRoute(null)
      mutate()
    } catch (err) {
      toast.error("Failed to update route", {
        description: err instanceof Error ? err.message : "Please try again",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(routeId: string, currentActive: boolean) {
    setTogglingId(routeId)
    try {
      await apiPatch(`/api/admin/routes/${routeId}`, { isActive: !currentActive })
      mutate()
      toast.success(currentActive ? "Route deactivated" : "Route activated")
    } catch {
      toast.error("Failed to toggle route status")
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(routeId: string) {
    setDeletingId(routeId)
    try {
      await apiDelete(`/api/admin/routes/${routeId}`)
      toast.success("Route deleted")
      mutate()
    } catch (err) {
      toast.error("Failed to delete route", {
        description: err instanceof Error ? err.message : "Please try again",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Route Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage routes — edit, toggle active, or delete.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search routes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Route</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">County</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">Stages</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Vehicles</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Active</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: route.color }} />
                      <div>
                        <p className="font-medium text-foreground">{route.name}</p>
                        <p className="text-xs text-muted-foreground">{route.origin} → {route.destination}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{route.code}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{route.county}</td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {route.stages.length}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Bus className="h-3 w-3" />
                      {route._count.vehicles}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={route.isActive}
                      disabled={togglingId === route.id}
                      onCheckedChange={() => handleToggleActive(route.id, route.isActive)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(route as unknown as RouteItem)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Route</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete <strong>{route.name}</strong> ({route.code})? All stages will
                              also be removed. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(route.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={deletingId === route.id}
                            >
                              {deletingId === route.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {routes.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <Route className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No routes found</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editRoute} onOpenChange={(open) => { if (!open) setEditRoute(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Origin</label>
                <Input
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Destination</label>
                <Input
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-border"
                />
                <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1" />
              </div>
            </div>
            <Button onClick={handleSaveEdit} disabled={saving || !form.name} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
