import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

// GET /api/stats - Public platform stats for landing page
export async function GET() {
  try {
    const [
      totalRoutes,
      activeRoutes,
      totalVehicles,
      activeVehicles,
      totalStages,
      totalUsers,
    ] = await Promise.all([
      prisma.route.count(),
      prisma.route.count({ where: { isActive: true } }),
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { isActive: true } }),
      prisma.stage.count(),
      prisma.user.count(),
    ])

    // Positions in last hour for "live" feel
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)
    const recentPositions = await prisma.vehiclePosition.count({
      where: { timestamp: { gte: oneHourAgo } },
    })

    return NextResponse.json({
      totalRoutes,
      activeRoutes,
      totalVehicles,
      activeVehicles,
      totalStages,
      totalUsers,
      recentPositions,
    })
  } catch {
    // Return sensible defaults when DB isn't connected
    return NextResponse.json({
      totalRoutes: 0,
      activeRoutes: 0,
      totalVehicles: 0,
      activeVehicles: 0,
      totalStages: 0,
      totalUsers: 0,
      recentPositions: 0,
    })
  }
}
