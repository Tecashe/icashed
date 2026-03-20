"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useReports } from "@/hooks/use-data"
import { apiPatch } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertTriangle,
  Loader2,
  CheckCircle,
  Eye,
  Clock,
  MapPin,
} from "lucide-react"

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-accent/10 text-accent",
  REVIEWED: "bg-chart-3/10 text-chart-3",
  RESOLVED: "bg-primary/10 text-primary",
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  SAFETY: "Safety Concern",
  ROUTE_ISSUE: "Route Issue",
  VEHICLE_ISSUE: "Vehicle Issue",
  GENERAL: "General Feedback",
}

export default function AdminReportsPage() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { data, isLoading, mutate } = useReports({
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
  })

  const reports = data?.reports || []
  const pagination = data?.pagination

  const updateStatus = async (reportId: string, status: string) => {
    setUpdatingId(reportId)
    try {
      await apiPatch(`/api/admin/reports/${reportId}`, { status })
      mutate()
      toast.success(`Report marked as ${status.toLowerCase()}`)
    } catch (err) {
      toast.error("Failed to update report", {
        description: err instanceof Error ? err.message : "Please try again",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Reports Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and resolve user reports.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REVIEWED">Reviewed</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length > 0 ? (
        <div className="flex flex-col gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={STATUS_STYLES[report.status]}>
                        {report.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {REPORT_TYPE_LABELS[report.type] || report.type}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground leading-relaxed">
                      {report.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>By: {report.user.name || report.user.email}</span>
                      {report.latitude && report.longitude && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {report.latitude.toFixed(4)},{" "}
                          {report.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {report.status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(report.id, "REVIEWED")}
                        disabled={updatingId === report.id}
                      >
                        {updatingId === report.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Eye className="mr-1 h-3 w-3" />
                        )}
                        Mark Reviewed
                      </Button>
                    )}
                    {(report.status === "PENDING" ||
                      report.status === "REVIEWED") && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus(report.id, "RESOLVED")}
                        disabled={updatingId === report.id}
                      >
                        {updatingId === report.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        )}
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No reports found
          </p>
        </div>
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
