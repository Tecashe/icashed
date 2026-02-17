import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

// GET /api/sacco/my - Get current SACCO_ADMIN's SACCO
export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "SACCO_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Find the SACCO this user is a member of (as CHAIRMAN/SECRETARY/TREASURER)
        const membership = await prisma.saccoMembership.findFirst({
            where: {
                userId: user.id,
                role: { in: ["CHAIRMAN", "SECRETARY", "TREASURER"] },
                isActive: true,
            },
            include: {
                sacco: {
                    include: {
                        _count: { select: { memberships: true, vehicles: true, collections: true } },
                    },
                },
            },
        })

        if (!membership) {
            return NextResponse.json(
                { error: "No SACCO found for your account" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            saccoId: membership.sacco.id,
            sacco: membership.sacco,
            role: membership.role,
        })
    } catch (error) {
        console.error("Error fetching my SACCO:", error)
        return NextResponse.json({ error: "Failed to fetch SACCO" }, { status: 500 })
    }
}
