import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/admin/stats - Admin overview statistics with KPIs
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      totalRoutes,
      totalVehicles,
      activeVehicles,
      totalReports,
      pendingReports,
      totalSaccos,
      activeSaccos,
      recentUsers,
      // KPI data
      newUsersThisWeek,
      newUsersThisMonth,
      premiumVehicles,
      vehicleTypeDistribution,
      reportTypeDistribution,
      reportStatusDistribution,
      roleDistribution,
      reviewStats,
      reviewTagsRaw,
      reportsResolvedThisMonth,
      totalReportsThisMonth,
      totalReviews,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.route.count(),
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { isActive: true } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.sacco.count(),
      prisma.sacco.count({ where: { isActive: true } }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // New Users this week
      prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      // New Users this month
      prisma.user.count({ where: { createdAt: { gte: oneMonthAgo } } }),
      // Premium vehicles
      prisma.vehicle.count({ where: { isPremium: true } }),
      // Vehicle type distribution
      prisma.$queryRaw`
        SELECT type, COUNT(*)::int as count
        FROM vehicles
        GROUP BY type
        ORDER BY count DESC
      ` as Promise<Array<{ type: string; count: number }>>,
      // Report type distribution
      prisma.$queryRaw`
        SELECT type, COUNT(*)::int as count
        FROM reports
        GROUP BY type
        ORDER BY count DESC
      ` as Promise<Array<{ type: string; count: number }>>,
      // Report status distribution
      prisma.$queryRaw`
        SELECT status, COUNT(*)::int as count
        FROM reports
        GROUP BY status
      ` as Promise<Array<{ status: string; count: number }>>,
      // Role distribution
      prisma.$queryRaw`
        SELECT role, COUNT(*)::int as count
        FROM users
        GROUP BY role
        ORDER BY count DESC
      ` as Promise<Array<{ role: string; count: number }>>,
      // Average review rating
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: true,
      }),
      // Review tags (flatten all tags and count occurrences)
      prisma.$queryRaw`
        SELECT tag, COUNT(*)::int as count
        FROM reviews, unnest(tags) as tag
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 10
      ` as Promise<Array<{ tag: string; count: number }>>,
      // Reports resolved this month
      prisma.report.count({
        where: { status: "RESOLVED", createdAt: { gte: oneMonthAgo } },
      }),
      // Total reports this month
      prisma.report.count({
        where: { createdAt: { gte: oneMonthAgo } },
      }),
      // Total reviews
      prisma.review.count(),
    ])

    // Calculate growth percentages
    const previousMonthStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const usersLastMonth = await prisma.user.count({
      where: {
        createdAt: { gte: previousMonthStart, lt: oneMonthAgo },
      },
    })
    const userGrowthPercent = usersLastMonth > 0
      ? Math.round(((newUsersThisMonth - usersLastMonth) / usersLastMonth) * 100)
      : newUsersThisMonth > 0 ? 100 : 0

    const resolutionRate = totalReportsThisMonth > 0
      ? Math.round((reportsResolvedThisMonth / totalReportsThisMonth) * 100)
      : 0

    const regularVehicles = totalVehicles - premiumVehicles

    return NextResponse.json({
      totalUsers,
      totalRoutes,
      totalVehicles,
      activeVehicles,
      totalReports,
      pendingReports,
      totalSaccos,
      activeSaccos,
      recentUsers,
      // KPI data
      kpi: {
        newUsersThisWeek,
        newUsersThisMonth,
        userGrowthPercent,
        premiumVehicles,
        regularVehicles,
        totalReviews,
        avgRating: reviewStats._avg.rating ? Number(reviewStats._avg.rating.toFixed(1)) : 0,
        reviewTags: (reviewTagsRaw || []).map((t) => ({ tag: t.tag, count: Number(t.count) })),
        resolutionRate,
        reportsResolvedThisMonth,
        totalReportsThisMonth,
        vehicleTypeDistribution: (vehicleTypeDistribution || []).map((v) => ({
          name: v.type,
          value: Number(v.count),
        })),
        reportTypeDistribution: (reportTypeDistribution || []).map((r) => ({
          name: r.type,
          value: Number(r.count),
        })),
        reportStatusDistribution: (reportStatusDistribution || []).map((r) => ({
          name: r.status,
          value: Number(r.count),
        })),
        roleDistribution: (roleDistribution || []).map((r) => ({
          name: r.role,
          value: Number(r.count),
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
