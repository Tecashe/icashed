import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/sacco/[id]/members
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { searchParams } = new URL(request.url)
        const query = searchParams.get("query") || ""
        const page = parseInt(searchParams.get("page") || "1")
        const limit = parseInt(searchParams.get("limit") || "20")
        const skip = (page - 1) * limit

        const where: Record<string, unknown> = { saccoId: id }
        if (query) {
            where.user = {
                OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { phone: { contains: query, mode: "insensitive" } },
                ],
            }
        }

        const [members, total] = await Promise.all([
            prisma.saccoMembership.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true, name: true, email: true, phone: true, role: true,
                            _count: { select: { vehicles: true } },
                        },
                    },
                },
                orderBy: { joinedAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.saccoMembership.count({ where }),
        ])

        return NextResponse.json({
            members,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        })
    } catch (error) {
        console.error("Error fetching SACCO members:", error)
        return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
    }
}

// POST /api/sacco/[id]/members - Add member
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || (user.role !== "ADMIN" && user.role !== "SACCO_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { userId, role } = body

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 })
        }

        // Check if user exists
        const targetUser = await prisma.user.findUnique({ where: { id: userId } })
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Check for existing membership
        const existing = await prisma.saccoMembership.findUnique({
            where: { saccoId_userId: { saccoId: id, userId } },
        })
        if (existing) {
            return NextResponse.json({ error: "User is already a member of this SACCO" }, { status: 409 })
        }

        const membership = await prisma.saccoMembership.create({
            data: {
                saccoId: id,
                userId,
                role: role || "MEMBER",
            },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
            },
        })

        return NextResponse.json(membership, { status: 201 })
    } catch (error) {
        console.error("Error adding SACCO member:", error)
        return NextResponse.json({ error: "Failed to add member" }, { status: 500 })
    }
}
