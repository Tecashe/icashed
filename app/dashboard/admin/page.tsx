"use client"

import { useAdminStats } from "@/hooks/use-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Route,
  Bus,
  AlertTriangle,
  Activity,
  Clock,
  Loader2,
  ChevronRight,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform overview and management.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {data?.totalUsers || 0}
            </p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-1/10">
              <Route className="h-5 w-5 text-chart-1" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {data?.totalRoutes || 0}
            </p>
            <p className="text-xs text-muted-foreground">Routes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Bus className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {data?.totalVehicles || 0}
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
              {data?.activeVehicles || 0}
            </p>
            <p className="text-xs text-muted-foreground">Active Now</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10">
              <AlertTriangle className="h-5 w-5 text-chart-4" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {data?.totalReports || 0}
            </p>
            <p className="text-xs text-muted-foreground">Total Reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <Clock className="h-5 w-5 text-destructive" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {data?.pendingReports || 0}
            </p>
            <p className="text-xs text-muted-foreground">Pending Reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10">
              <Building2 className="h-5 w-5 text-chart-2" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {data?.totalSaccos || 0}
            </p>
            <p className="text-xs text-muted-foreground">Total SACCOs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center p-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-5/10">
              <Building2 className="h-5 w-5 text-chart-5" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {data?.activeSaccos || 0}
            </p>
            <p className="text-xs text-muted-foreground">Active SACCOs</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="font-display text-base">
            Recent Users
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link
              href="/dashboard/admin/users"
              className="flex items-center gap-1 text-xs"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data?.recentUsers && data.recentUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="pb-2 font-medium text-muted-foreground">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 font-medium text-foreground">
                        {user.name || "No name"}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-xs">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No users yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
