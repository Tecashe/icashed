import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/admin/stats - Admin overview statistics
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [
      totalUsers,
      totalRoutes,
      totalVehicles,
      activeVehicles,
      totalReports,
      pendingReports,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.route.count(),
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { isActive: true } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ])

    return NextResponse.json({
      totalUsers,
      totalRoutes,
      totalVehicles,
      activeVehicles,
      totalReports,
      pendingReports,
      recentUsers,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
