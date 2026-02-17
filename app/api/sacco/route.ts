import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/sacco - List all SACCOs
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get("query") || ""
        const county = searchParams.get("county") || ""
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "20")
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = {}
        if (query) {
            where.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { code: { contains: query, mode: "insensitive" } },
                { town: { contains: query, mode: "insensitive" } },
            ]
        }
        if (county) {
            where.county = { equals: county, mode: "insensitive" }
        }

        const [saccos, total] = await Promise.all([
            prisma.sacco.findMany({
                where,
                include: {
                    _count: { select: { memberships: true, vehicles: true } },
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

// POST /api/sacco - Create a new SACCO (ADMIN only)
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { name, code, county, town, phone, email, regNumber, chairman, secretary, description } = body

        if (!name || !code || !county || !town) {
            return NextResponse.json(
                { error: "Name, code, county, and town are required" },
                { status: 400 }
            )
        }

        const existing = await prisma.sacco.findFirst({
            where: { OR: [{ name }, { code }] },
        })
        if (existing) {
            return NextResponse.json(
                { error: "A SACCO with this name or code already exists" },
                { status: 409 }
            )
        }

        const sacco = await prisma.sacco.create({
            data: { name, code: code.toUpperCase(), county, town, phone, email, regNumber, chairman, secretary, description },
            include: { _count: { select: { memberships: true, vehicles: true } } },
        })

        return NextResponse.json(sacco, { status: 201 })
    } catch (error) {
        console.error("Error creating SACCO:", error)
        return NextResponse.json({ error: "Failed to create SACCO" }, { status: 500 })
    }
}
