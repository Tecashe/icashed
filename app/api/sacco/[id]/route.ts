import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// Helper: check if user is admin of a specific SACCO
async function isSaccoAdmin(userId: string, saccoId: string) {
    const membership = await prisma.saccoMembership.findUnique({
        where: { saccoId_userId: { saccoId, userId } },
    })
    return membership && ["CHAIRMAN", "SECRETARY", "TREASURER"].includes(membership.role)
}

// GET /api/sacco/[id]
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const sacco = await prisma.sacco.findUnique({
            where: { id },
            include: {
                _count: { select: { memberships: true, vehicles: true, collections: true } },
                memberships: {
                    take: 5,
                    orderBy: { joinedAt: "desc" },
                    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
                },
            },
        })

        if (!sacco) {
            return NextResponse.json({ error: "SACCO not found" }, { status: 404 })
        }

        return NextResponse.json(sacco)
    } catch (error) {
        console.error("Error fetching SACCO:", error)
        return NextResponse.json({ error: "Failed to fetch SACCO" }, { status: 500 })
    }
}

// PUT /api/sacco/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        // Only platform ADMIN or SACCO leadership can update
        if (user.role !== "ADMIN") {
            const isLeader = await isSaccoAdmin(user.id, id)
            if (!isLeader) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
            }
        }

        const body = await request.json()
        const { name, county, town, phone, email, regNumber, chairman, secretary, description, isActive } = body

        const sacco = await prisma.sacco.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(county !== undefined && { county }),
                ...(town !== undefined && { town }),
                ...(phone !== undefined && { phone }),
                ...(email !== undefined && { email }),
                ...(regNumber !== undefined && { regNumber }),
                ...(chairman !== undefined && { chairman }),
                ...(secretary !== undefined && { secretary }),
                ...(description !== undefined && { description }),
                ...(isActive !== undefined && { isActive }),
            },
            include: { _count: { select: { memberships: true, vehicles: true } } },
        })

        return NextResponse.json(sacco)
    } catch (error) {
        console.error("Error updating SACCO:", error)
        return NextResponse.json({ error: "Failed to update SACCO" }, { status: 500 })
    }
}

// DELETE /api/sacco/[id] - ADMIN only
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        await prisma.sacco.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting SACCO:", error)
        return NextResponse.json({ error: "Failed to delete SACCO" }, { status: 500 })
    }
}
