import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/driver/stats - Driver dashboard statistics
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { ownerId: user.id },
      include: {
        positions: { orderBy: { timestamp: "desc" }, take: 1 },
        routes: { include: { route: { select: { name: true } } } },
      },
    })

    const totalVehicles = vehicles.length
    const activeVehicles = vehicles.filter((v: any) => v.isActive).length
    const totalTrips = vehicles.reduce((sum: number, v: any) => sum + v.totalTrips, 0)
    const avgRating =
      vehicles.length > 0
        ? vehicles.reduce((sum: number, v: any) => sum + v.rating, 0) / vehicles.length
        : 0

    // Position updates in last24
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const recentPositions = await prisma.vehiclePosition.count({
      where: {
        vehicle: { ownerId: user.id },
        timestamp: { gte: yesterday },
      },
    })

    return NextResponse.json({
      totalVehicles,
      activeVehicles,
      totalTrips,
      avgRating: Math.round(avgRating * 10) / 10,
      recentPositions,
      vehicles: vehicles.map((v: any) => ({
        id: v.id,
        plateNumber: v.plateNumber,
        nickname: v.nickname,
        type: v.type,
        isActive: v.isActive,
        rating: v.rating,
        totalTrips: v.totalTrips,
        routes: v.routes.map((vr: any) => vr.route.name),
        lastPosition: v.positions[0] || null,
      })),
    })
  } catch (error) {
    console.error("Error fetching driver stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
