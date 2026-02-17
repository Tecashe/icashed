import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// PUT /api/sacco/[id]/members/[memberId]
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || (user.role !== "ADMIN" && user.role !== "SACCO_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { memberId } = await params
        const body = await request.json()
        const { role, isActive } = body

        const membership = await prisma.saccoMembership.update({
            where: { id: memberId },
            data: {
                ...(role !== undefined && { role }),
                ...(isActive !== undefined && { isActive }),
            },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } },
            },
        })

        return NextResponse.json(membership)
    } catch (error) {
        console.error("Error updating SACCO member:", error)
        return NextResponse.json({ error: "Failed to update member" }, { status: 500 })
    }
}

// DELETE /api/sacco/[id]/members/[memberId]
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || (user.role !== "ADMIN" && user.role !== "SACCO_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { memberId } = await params
        await prisma.saccoMembership.delete({ where: { id: memberId } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error removing SACCO member:", error)
        return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
    }
}
