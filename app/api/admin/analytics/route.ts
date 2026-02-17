import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/admin/analytics - Platform-wide analytics
export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // User growth - last 12 months
        const userGrowth = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*)::int as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    ` as Array<{ month: Date; count: number }>

        // Vehicle registrations - last 12 months
        const vehicleGrowth = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*)::int as count
      FROM vehicles
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    ` as Array<{ month: Date; count: number }>

        // Report trends - last 6 months
        const reportTrends = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        status,
        COUNT(*)::int as count
      FROM reports
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at), status
      ORDER BY month ASC
    ` as Array<{ month: Date; status: string; count: number }>

        // Collections overview
        const collectionTrends = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(amount) as total,
        COUNT(*)::int as count
      FROM sacco_collections
      WHERE date >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month ASC
    ` as Array<{ month: Date; total: number; count: number }>

        // Top SACCOs by vehicle count
        const topSaccos = await prisma.sacco.findMany({
            where: { isActive: true },
            include: {
                _count: { select: { vehicles: true, memberships: true } },
            },
            orderBy: { vehicles: { _count: "desc" } },
            take: 5,
        })

        // Role distribution
        const roleDistribution = await prisma.$queryRaw`
      SELECT role, COUNT(*)::int as count
      FROM users
      GROUP BY role
    ` as Array<{ role: string; count: number }>

        // Total collections revenue
        const totalRevenue = await prisma.saccoCollection.aggregate({
            _sum: { amount: true },
        })

        return NextResponse.json({
            userGrowth: userGrowth.map((u) => ({ month: u.month, count: Number(u.count) })),
            vehicleGrowth: vehicleGrowth.map((v) => ({ month: v.month, count: Number(v.count) })),
            reportTrends: reportTrends.map((r) => ({ month: r.month, status: r.status, count: Number(r.count) })),
            collectionTrends: collectionTrends.map((c) => ({
                month: c.month,
                total: Number(c.total),
                count: Number(c.count),
            })),
            topSaccos,
            roleDistribution: roleDistribution.map((r) => ({ role: r.role, count: Number(r.count) })),
            totalRevenue: totalRevenue._sum.amount || 0,
        })
    } catch (error) {
        console.error("Error fetching analytics:", error)
        return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
    }
}
