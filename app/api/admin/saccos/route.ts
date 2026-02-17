import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/admin/saccos - List all SACCOs for admin management
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const query = searchParams.get("query") || ""
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "20")
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = {}
        if (query) {
            where.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { code: { contains: query, mode: "insensitive" } },
                { county: { contains: query, mode: "insensitive" } },
            ]
        }

        const [saccos, total] = await Promise.all([
            prisma.sacco.findMany({
                where,
                include: {
                    _count: { select: { memberships: true, vehicles: true, collections: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.sacco.count({ where }),
        ])

        return NextResponse.json({
            saccos,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        })
    } catch (error) {
        console.error("Error fetching SACCOs:", error)
        return NextResponse.json({ error: "Failed to fetch SACCOs" }, { status: 500 })
    }
}
