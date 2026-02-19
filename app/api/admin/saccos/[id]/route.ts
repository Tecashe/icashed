import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"

const updateSaccoSchema = z.object({
    name: z.string().min(2).optional(),
    county: z.string().min(2).optional(),
    town: z.string().min(2).optional(),
    phone: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    chairman: z.string().optional().nullable(),
    secretary: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
})

// PATCH /api/admin/saccos/[id] — Update SACCO details or toggle active
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const parsed = updateSaccoSchema.safeParse(body)

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            )
        }

        const sacco = await prisma.sacco.update({
            where: { id },
            data: parsed.data,
            include: {
                _count: { select: { memberships: true, vehicles: true, collections: true } },
            },
        })

        return NextResponse.json({ sacco })
    } catch (error) {
        console.error("Error updating SACCO:", error)
        return NextResponse.json({ error: "Failed to update SACCO" }, { status: 500 })
    }
}

// DELETE /api/admin/saccos/[id] — Delete a SACCO
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
