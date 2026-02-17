import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/sacco/[id]/stats
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

        const [
            sacco,
            totalMembers,
            activeMembers,
            totalVehicles,
            activeVehicles,
            collectionsToday,
            collectionsMonth,
            recentCollections,
            monthlyTrend,
        ] = await Promise.all([
            prisma.sacco.findUnique({ where: { id } }),
            prisma.saccoMembership.count({ where: { saccoId: id } }),
            prisma.saccoMembership.count({ where: { saccoId: id, isActive: true } }),
            prisma.vehicle.count({ where: { saccoId: id } }),
            prisma.vehicle.count({ where: { saccoId: id, isActive: true } }),
            prisma.saccoCollection.aggregate({
                where: { saccoId: id, date: { gte: today } },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.saccoCollection.aggregate({
                where: { saccoId: id, date: { gte: monthStart } },
                _sum: { amount: true },
                _count: true,
            }),
            prisma.saccoCollection.findMany({
                where: { saccoId: id },
                include: {
                    vehicle: { select: { plateNumber: true, nickname: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
            // Get last 6 months of collections aggregated
            prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', date) as month,
          SUM(amount) as total,
          COUNT(*)::int as count
        FROM sacco_collections 
        WHERE sacco_id = ${id} 
          AND date >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month ASC
      ` as Promise<Array<{ month: Date; total: number; count: number }>>,
        ])

        if (!sacco) {
            return NextResponse.json({ error: "SACCO not found" }, { status: 404 })
        }

        return NextResponse.json({
            sacco,
            totalMembers,
            activeMembers,
            totalVehicles,
            activeVehicles,
            collectionsToday: {
                total: collectionsToday._sum.amount || 0,
                count: collectionsToday._count,
            },
            collectionsMonth: {
                total: collectionsMonth._sum.amount || 0,
                count: collectionsMonth._count,
            },
            recentCollections,
            monthlyTrend: (monthlyTrend || []).map((m) => ({
                month: m.month,
                total: Number(m.total),
                count: Number(m.count),
            })),
        })
    } catch (error) {
        console.error("Error fetching SACCO stats:", error)
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }
}
