"use client"

import React from "react"

import { useState } from "react"
import { toast } from "sonner"
import { useMyReports } from "@/hooks/use-data"
import { apiPost } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, Loader2, Send, Clock, CheckCircle } from "lucide-react"

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

export default function PassengerReportsPage() {
  const { data, isLoading, mutate } = useMyReports()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    type: "GENERAL",
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.description.length < 10) {
      setError("Please describe the issue in at least 10 characters")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await apiPost("/api/passenger/reports", form)
      setForm({ type: "GENERAL", description: "" })
      setSuccess(true)
      mutate()
      toast.success("Report submitted", {
        description: "Thank you. Our team will review it shortly.",
      })
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit report"
      setError(msg)
      toast.error("Failed to submit report", { description: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const reports = data?.reports || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Report safety issues, route problems, or general feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Submit Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <AlertTriangle className="h-4 w-4 text-accent" />
              New Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="type">Report Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAFETY">Safety Concern</SelectItem>
                    <SelectItem value="ROUTE_ISSUE">Route Issue</SelectItem>
                    <SelectItem value="VEHICLE_ISSUE">
                      Vehicle Issue
                    </SelectItem>
                    <SelectItem value="GENERAL">General Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue in detail..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={4}
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
                  <CheckCircle className="h-4 w-4" />
                  Report submitted successfully
                </div>
              )}

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Report
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* My Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">
              My Reports ({reports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length > 0 ? (
              <div className="flex flex-col gap-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Badge className={STATUS_STYLES[report.status]}>
                          {report.status}
                        </Badge>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {REPORT_TYPE_LABELS[report.type] || report.type}
                        </Badge>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No reports submitted yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
